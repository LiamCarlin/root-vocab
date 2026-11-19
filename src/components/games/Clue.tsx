import { CornerDownLeft, Lightbulb, Mic, Square } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { Wiggle } from '@/components/fx';
import { PartTiles, SylWord } from '@/components/learn';
import { useElapsed } from '@/components/play/hooks';
import { Block, Field, IconBtn, Tag, Txt } from '@/components/ui';
import { TOPICS } from '@/data/profile';
import { buzz, listenOnce, micAvailable, say, stopListening } from '@/lib/audio';
import { closeEnough } from '@/lib/lexicon';
import { useStore } from '@/lib/store';
import { wordSize } from '@/theme';
import { Bold } from './spellkit';
import type { GameProps } from './types';

// A hard shake asks for the next cue. A small surprise, not advertised; touch does the same job.
type Sensors = typeof import('expo-sensors');
function sensors(): Sensors | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-sensors') as Sensors;
  } catch {
    return null;
  }
}
function useShake(on: boolean, cb: () => void) {
  const latest = useRef(cb);
  useEffect(() => {
    latest.current = cb;
  });
  useEffect(() => {
    if (!on) return;
    const s = sensors();
    if (!s) return;
    let sub: { remove(): void } | null = null;
    let last = 0;
    let alive = true;
    s.Accelerometer.isAvailableAsync()
      .then((ok) => {
        if (!ok || !alive) return;
        s.Accelerometer.setUpdateInterval(90);
        sub = s.Accelerometer.addListener(({ x, y, z }) => {
          const g = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();
          if (g > 2.3 && now - last > 1300) {
            last = now;
            latest.current();
          }
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [on]);
}

/** Units revealed after `cue` cues: none (just the count), the first, then all but the last. */
const shownAt = (cue: number, n: number) => (cue <= 0 ? -1 : cue === 1 ? 0 : cue === 2 ? 1 : n - 1);

/**
 * Tip of the tongue: the core recall drill. A clue points at the word; the learner gets it out.
 * Spelling is not the point here, so anything that sounds like the word counts, and the right
 * spelling is shown afterwards. When the word will not come, a ladder of cues gives a little
 * more each time, the way a word-finding therapist would: how many beats, the first sound,
 * all but the last beat, then the word.
 */
export function Clue({ lex, onResult, done }: GameProps) {
  const hook = useStore((s) => s.words[lex.id]?.hook);
  const elapsed = useElapsed();
  const [text, setText] = useState('');
  const [cues, setCues] = useState(0);
  const [tries, setTries] = useState(0);
  const [shake, setShake] = useState(0);
  const [listening, setListening] = useState(false);
  const [solved, setSolved] = useState(false);
  const sent = useRef(false);
  const mic = micAvailable();

  // The cue ladder is counted in beats; a one-beat word is counted in letters instead.
  const units = lex.parts.length >= 2 ? lex.parts : lex.text.split('');
  const says = lex.parts.length >= 2 ? lex.says : undefined;
  const rungs = units.length > 2 ? 3 : 2; // cues before the word is shown
  const shown = solved || done ? units.length : shownAt(Math.min(cues, rungs), units.length);

  useEffect(() => () => stopListening(), []);

  const report = useCallback(
    (r: 0 | 0.5 | 1, attempt?: string) => {
      if (sent.current) return;
      sent.current = true;
      setSolved(true);
      const offSpelling = !!attempt && attempt.trim().toLowerCase() !== lex.text.toLowerCase();
      onResult({
        r,
        ms: elapsed(),
        cue: cues,
        note:
          r > 0 && offSpelling ? (
            <Txt v="bodyS">
              It is spelled <Bold>{lex.text}</Bold>.
            </Txt>
          ) : undefined,
      });
    },
    [cues, elapsed, lex.text, onResult],
  );

  const judge = useCallback(
    (attempt: string) => {
      if (sent.current || !attempt.trim()) return;
      if (closeEnough(attempt, lex.text, lex.lookalikes)) {
        report(cues === 0 && tries === 0 ? 1 : 0.5, attempt);
      } else {
        setTries((n) => n + 1);
        setShake((n) => n + 1);
        buzz.nudge();
      }
    },
    [cues, tries, lex.text, lex.lookalikes, report],
  );

  const nextCue = useCallback(() => {
    if (sent.current) return;
    const n = cues + 1;
    buzz.light();
    setCues(n);
    if (n > rungs) {
      report(0);
      return;
    }
    // The second cue is the first sound, said aloud.
    if (n === 2) say(lex.parts.length >= 2 ? lex.says[0] : lex.text[0]);
  }, [cues, rungs, lex.parts.length, lex.says, lex.text, report]);

  useShake(!done && !solved, nextCue);

  const listen = async () => {
    if (listening) {
      stopListening();
      return;
    }
    setListening(true);
    const heard = await listenOnce({ hints: [lex.text], onPartial: setText });
    setListening(false);
    if (heard.ok) {
      setText(heard.transcript);
      // Speech comes back as a phrase: any word of it that matches will do.
      const hit = [heard.transcript, ...heard.transcript.split(/\s+/)].find((w) => closeEnough(w, lex.text, lex.lookalikes));
      judge(hit ?? heard.transcript);
    }
  };

  const frozen = done || solved;
  const topic = lex.topics[0] ? TOPICS[lex.topics[0]] : null;
  const lastRung = cues >= rungs;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <Block tone="pink" pad={20} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          {topic ? <Tag icon={topic.icon} label={topic.label} tint="surface" color="ink" /> : <View />}
          {!!hook && (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`Your picture: ${hook}`}>
              <Text style={{ fontSize: 28 }}>{hook}</Text>
            </View>
          )}
        </View>
        <Txt v={lex.clue.length > 70 ? 'heading' : 'title'} accessibilityLabel={`Clue: ${lex.clue}`}>
          {lex.clue}
        </Txt>
      </Block>

      {shown >= 0 && (
        <View accessible accessibilityLabel={frozen ? lex.text : `${units.length} ${lex.parts.length >= 2 ? 'beats' : 'letters'}${shown > 0 ? `. It starts with ${units.slice(0, shown).join(' ')}` : ''}`}>
          <PartTiles parts={units} says={frozen ? says : undefined} states={units.map((_, i) => (i < shown ? 'idle' : 'empty'))} />
        </View>
      )}

      {frozen ? (
        <View style={{ alignItems: 'flex-start', paddingVertical: 6 }}>
          <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 40, 320)} />
        </View>
      ) : (
        <>
          <Wiggle trigger={shake}>
            <Field
              big
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => judge(text)}
              returnKeyType="done"
              style={{ minWidth: 0 }}
              accessibilityLabel="Type the word. Spelling does not have to be perfect."
              right={<IconBtn icon={CornerDownLeft} label="Check" kind="ink" size={54} disabled={!text.trim()} onPress={() => judge(text)} />}
            />
          </Wiggle>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <IconBtn icon={Lightbulb} label={lastRung ? 'Show me the word' : cues === 0 ? 'Give me a cue' : 'Another cue'} kind="butter" size={58} badge={cues || undefined} onPress={nextCue} />
            {mic && <IconBtn icon={listening ? Square : Mic} label={listening ? 'Stop listening' : 'Say it'} kind={listening ? 'orange' : 'ghost'} size={58} onPress={listen} />}
          </View>
        </>
      )}
    </View>
  );
}
