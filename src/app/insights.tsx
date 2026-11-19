import { router, type Href } from 'expo-router';
import { ArrowRight, Sprout, Target } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Growth, Mascot } from '@/components/Mascot';
import { Bar, Block, Chip, ChipRow, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { STRANDS, STRAND_ORDER } from '@/data/profile';
import { PATTERNS } from '@/data/words';
import { insights, type PatternStat } from '@/lib/engine';
import { lexOf, useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';

/**
 * Your map: what Root has learned about the learner so far. A level for each strand, the
 * spelling patterns that need work and the ones that are solid, and the words coming next.
 */
export default function Insights() {
  const { c, e1 } = useTheme();
  const s = useStore();
  const m = insights(s);
  const enough = m.weak.length + m.strong.length > 0;

  const pattern = (p: PatternStat, tone: 'work' | 'strong') => (
    <View key={p.pattern} style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 16, gap: 10 }, e1]} accessible accessibilityLabel={`${PATTERNS[p.pattern].label}, as in ${PATTERNS[p.pattern].eg}. ${p.pct} percent right over ${p.seen} tries.`}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <Txt v="heading" style={{ flex: 1 }} numberOfLines={1}>
          {PATTERNS[p.pattern].label}
        </Txt>
        <Txt v="bodyS" color="ink2">
          {PATTERNS[p.pattern].eg}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Bar value={p.pct / 100} color={tone === 'strong' ? 'success' : 'orange'} />
        </View>
        <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 15, color: c.ink, minWidth: 44, textAlign: 'right' }}>{p.pct}%</Text>
      </View>
    </View>
  );

  return (
    <Screen top={<TopBar center={<Txt v="heading">Your map</Txt>} />} gap={14}>
      {/* The three strands: level, how far to the next, and how the last answers went. */}
      {STRAND_ORDER.map((k) => {
        const st = STRANDS[k];
        const acc = m.accuracy[k];
        return (
          <Block key={k} tone={st.tone} pad={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }} a11y={`${st.label}: level ${m.levels[k]}. ${Math.round(m.progress[k] * 100)} percent of the way to the next level.${acc === null ? '' : ` ${Math.round(acc * 100)} percent right lately.`}`}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
              <st.icon size={28} color="#FFFFFF" strokeWidth={2.3} />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Txt v="title" style={{ flex: 1 }} numberOfLines={1}>
                  {st.label}
                </Txt>
                {acc !== null && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Target size={15} color={ON_BLOCK.ink} strokeWidth={2.5} />
                    <Txt v="bodyS">{Math.round(acc * 100)}%</Txt>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 22, lineHeight: 26, color: ON_BLOCK.ink }}>{m.levels[k]}</Text>
                <View style={{ flex: 1 }}>
                  <Bar value={m.progress[k]} />
                </View>
                <Text style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 16, lineHeight: 26, color: ON_BLOCK.ink3 }}>{Math.min(6, m.levels[k] + 1)}</Text>
              </View>
            </View>
          </Block>
        );
      })}

      {/* Totals. */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[{ flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, e1]} accessible accessibilityLabel={`${m.rooted} rooted`}>
          <Growth stage={3} size={42} />
          <View>
            <Txt v="num">{m.rooted}</Txt>
            <Txt v="caption" color="ink2">
              Rooted
            </Txt>
          </View>
        </View>
        <View style={[{ flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, e1]} accessible accessibilityLabel={`${m.learning} growing`}>
          <Growth stage={1} size={42} />
          <View>
            <Txt v="num">{m.learning}</Txt>
            <Txt v="caption" color="ink2">
              Growing
            </Txt>
          </View>
        </View>
      </View>

      {enough ? (
        <>
          {m.weak.length > 0 && (
            <>
              <SectionLabel>Working on</SectionLabel>
              {m.weak.map((p) => pattern(p, 'work'))}
            </>
          )}
          {m.strong.length > 0 && (
            <>
              <SectionLabel>Strong</SectionLabel>
              {m.strong.map((p) => pattern(p, 'strong'))}
            </>
          )}
        </>
      ) : (
        <Block tone="soft" pad={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} a11y="Root is still learning how you spell. Patterns show up after a few rounds.">
          <Mascot pose="search" size={110} />
          <Txt v="heading" style={{ flex: 1 }}>
            Still looking
          </Txt>
        </Block>
      )}

      {m.next.length > 0 && (
        <>
          <SectionLabel>Up next</SectionLabel>
          <ChipRow>
            {m.next.map((id) => {
              const lex = lexOf(s, id);
              return lex ? <Chip key={id} label={lex.text} icon={Sprout} onPress={() => router.push(`/word/${id}` as Href)} /> : null;
            })}
            <Chip label="Journey" icon={ArrowRight} tone="orange" onPress={() => router.replace('/(tabs)')} />
          </ChipRow>
        </>
      )}
    </Screen>
  );
}
