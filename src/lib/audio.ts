import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform, Vibration } from 'react-native';

import { useStore } from './store';
import { clipFor, playClip, primeClip, stopClips } from './voice';

// ── Speaking ──────────────────────────────────────────────────────────────
// Bank words and their beats are recordings (voice.ts). Everything else, and every word on a
// phone where the recording cannot play, is spoken by the phone's own voice.
const RATE = { normal: Platform.OS === 'ios' ? 0.92 : 0.95, slow: Platform.OS === 'ios' ? 0.62 : 0.6 };

export function stopSpeaking() {
  stopClips();
  try {
    Speech.stop();
  } catch {}
}

function speak(text: string, slow: boolean, onDone?: () => void) {
  try {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: slow ? RATE.slow : RATE.normal, pitch: 1, onDone, onStopped: onDone, onError: onDone });
  } catch {
    onDone?.();
  }
}

export function say(text: string, opts: { slow?: boolean; onDone?: () => void } = {}) {
  const slow = opts.slow ?? useStore.getState().slowAudio;
  stopSpeaking();
  const clip = clipFor(text);
  if (clip && playClip(slow ? clip.slow : clip.word, slow ? clip.ms.slow : clip.ms.word, opts.onDone)) {
    primeClip(clip);
    return;
  }
  speak(text, slow, opts.onDone);
}

/** Letters are read as letters ("R F I"), everything else as written. */
export const speakable = (text: string) => (/^[A-Z]{2,5}$/.test(text) ? text.split('').join(' ') : text);

/** Every clip starts and ends with a little silence. */
const CLIP_AIR = 50;

/**
 * Says one beat of a word, exactly as it sounds inside the word, and hums it. A word with no
 * recording gets the phone's best reading of the respelling. Returns a function that stops the hum.
 */
export function sayBeat(parts: string[], says: string[], i: number, opts: { onDone?: () => void; hum?: boolean } = {}): () => void {
  return beat(parts.join(''), says, i, says[i] ?? parts[i] ?? '', opts);
}

function beat(word: string, says: string[], i: number, fallback: string, opts: { onDone?: () => void; hum?: boolean; slow?: boolean }): () => void {
  stopSpeaking();
  const clip = clipFor(word, says.length);
  if (clip && playClip(clip.beats[i], clip.ms.beats[i], opts.onDone)) {
    return opts.hum === false ? () => {} : hum(Math.max(60, clip.ms.beats[i] - CLIP_AIR));
  }
  const slow = opts.slow ?? useStore.getState().slowAudio;
  const stop = opts.hum === false ? () => {} : hum(beatMs(fallback, slow));
  if (fallback) speak(fallback, slow, opts.onDone);
  else opts.onDone?.();
  return stop;
}

let seq = 0;
/**
 * Says the whole word, then each beat on its own, calling `onPart` as each one
 * starts so the matching tile can light up. Returns a cancel function.
 */
export function sayByParts(text: string, says: string[], onPart: (i: number) => void, opts: { slow?: boolean; wholeFirst?: boolean } = {}): () => void {
  const mine = ++seq;
  const alive = () => mine === seq;
  const slow = opts.slow ?? useStore.getState().slowAudio;
  let stopHum: (() => void) | null = null;
  const step = (i: number) => {
    if (!alive()) return;
    if (i >= says.length) {
      onPart(-1);
      return;
    }
    onPart(i);
    stopHum = beat(text, says, i, says[i], { slow: opts.slow, onDone: () => setTimeout(() => step(i + 1), 220) });
  };
  if (opts.wholeFirst === false) step(0);
  else {
    stopHum = humWord(says, slow, text);
    say(speakable(text), { slow: opts.slow, onDone: () => setTimeout(() => step(0), 320) });
  }
  return () => {
    if (alive()) {
      seq++;
      stopHum?.();
      stopSpeaking();
      onPart(-1);
    }
  };
}

/** Says a word while the phone hums its rhythm. */
export function sayHum(text: string, says: string[], opts: { slow?: boolean; onDone?: () => void } = {}): () => void {
  const slow = opts.slow ?? useStore.getState().slowAudio;
  const stop = humWord(says, slow, text);
  say(speakable(text), opts);
  return stop;
}

// ── Haptics ───────────────────────────────────────────────────────────────
const on = () => Platform.OS !== 'web' && useStore.getState().display.haptics;
const safe = (fn: () => Promise<unknown>) => {
  if (on()) fn().catch(() => {});
};

export const buzz = {
  /** A tap landed. */
  tap: () => safe(() => Haptics.selectionAsync()),
  /** Tracing: finger is on the letters. */
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Tracing: finger left the letters. */
  strong: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  good: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  nudge: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};

// Humming: the phone buzzes for as long as a syllable is voiced, so a word can
// be felt as well as heard, the way you feel your own voice when you hum.
// Android gets a true continuous buzz. iOS has no continuous motor through
// this API, so it gets a fast run of soft ticks, which reads as a purr.
export const beatMs = (sayAs: string, slow = false) => Math.round((190 + sayAs.length * 48) * (slow ? 1.55 : 1));

/** Buzz for `ms`. Returns a function that stops it early. */
export function hum(ms: number): () => void {
  if (!on()) return () => {};
  if (Platform.OS === 'android') {
    Vibration.vibrate(ms);
    return () => Vibration.cancel();
  }
  const tick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  tick();
  const id = setInterval(tick, 34);
  const end = setTimeout(() => clearInterval(id), ms);
  return () => {
    clearInterval(id);
    clearTimeout(end);
  };
}

/**
 * One hum per beat, with a short breath between beats. Pass the word as `text` and a recorded
 * word is hummed on its real beats rather than on a guess from the respelling.
 */
export function humWord(says: string[], slow = false, text?: string): () => void {
  if (!on()) return () => {};
  const stops: (() => void)[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  const clip = text ? clipFor(text, says.length) : undefined;
  if (clip) {
    // `at` marks the beats inside the careful recording; the quick one keeps the same proportions.
    const k = slow ? 1 : clip.ms.word / clip.ms.slow;
    const ends = [...clip.ms.at.slice(1), clip.ms.slow - CLIP_AIR];
    clip.ms.at.forEach((from, i) => {
      const ms = Math.max(40, Math.round((ends[i] - from) * k) - (slow ? 60 : 40));
      timers.push(setTimeout(() => stops.push(hum(ms)), Math.round(from * k)));
    });
  } else {
    let at = 60;
    for (const sy of says) {
      const ms = Math.round(beatMs(sy, slow) * 0.62);
      timers.push(setTimeout(() => stops.push(hum(ms)), at));
      at += ms + (slow ? 110 : 70);
    }
  }
  return () => {
    timers.forEach(clearTimeout);
    stops.forEach((f) => f());
  };
}

// ── Listening (speech to text) ────────────────────────────────────────────
// Real recognition needs the expo-speech-recognition native module, which is
// in a development build and on the web but not in Expo Go. Where it is
// missing, `micAvailable()` is false and every screen falls back to typing or
// a say-it-then-reveal self check. The mic never blocks progress.
type ESR = {
  isRecognitionAvailable(): boolean;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  start(opts: Record<string, unknown>): void;
  stop(): void;
  abort(): void;
  addListener(name: string, cb: (e: any) => void): { remove(): void };
};

let esr: ESR | null | undefined;
function mod(): ESR | null {
  if (esr !== undefined) return esr;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    esr = require('expo-speech-recognition').ExpoSpeechRecognitionModule as ESR;
  } catch {
    esr = null;
  }
  return esr;
}

export function micAvailable(): boolean {
  const m = mod();
  if (!m) return false;
  try {
    return m.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export type Heard = { ok: true; transcript: string } | { ok: false; reason: 'unavailable' | 'denied' | 'nothing' };

let cancelCurrent: (() => void) | null = null;
export function stopListening() {
  cancelCurrent?.();
}

/** Listens for one phrase. `hints` nudges the recognizer toward work words it would otherwise mishear. */
export async function listenOnce(opts: { hints?: string[]; onPartial?: (t: string) => void; maxMs?: number } = {}): Promise<Heard> {
  const m = mod();
  if (!m || !micAvailable()) return { ok: false, reason: 'unavailable' };
  try {
    const perm = await m.requestPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };
  } catch {
    return { ok: false, reason: 'denied' };
  }
  stopSpeaking();
  cancelCurrent?.();
  return new Promise<Heard>((resolve) => {
    let best = '';
    let done = false;
    const subs: { remove(): void }[] = [];
    const finish = (r: Heard) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      subs.forEach((s) => s.remove());
      cancelCurrent = null;
      resolve(r);
    };
    subs.push(
      m.addListener('result', (e) => {
        const t: string = e?.results?.[0]?.transcript ?? '';
        if (t) {
          best = t;
          opts.onPartial?.(t);
        }
        if (e?.isFinal) {
          try { m.stop(); } catch {}
          finish(best ? { ok: true, transcript: best } : { ok: false, reason: 'nothing' });
        }
      }),
      m.addListener('error', () => finish(best ? { ok: true, transcript: best } : { ok: false, reason: 'nothing' })),
      m.addListener('end', () => finish(best ? { ok: true, transcript: best } : { ok: false, reason: 'nothing' })),
    );
    const timer = setTimeout(() => {
      try { m.stop(); } catch {}
      setTimeout(() => finish(best ? { ok: true, transcript: best } : { ok: false, reason: 'nothing' }), 600);
    }, opts.maxMs ?? 7000);
    cancelCurrent = () => {
      try { m.abort(); } catch {}
      finish(best ? { ok: true, transcript: best } : { ok: false, reason: 'nothing' });
    };
    try {
      m.start({ lang: 'en-US', interimResults: true, continuous: false, maxAlternatives: 1, contextualStrings: opts.hints ?? [], requiresOnDeviceRecognition: false, addsPunctuation: false });
    } catch {
      finish({ ok: false, reason: 'unavailable' });
    }
  });
}
