import { CircleQuestionMark } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Badge, unitFor } from '@/components/rewards';
import { Bar, Block, Screen, Sheet, Tap, TopBar, Txt } from '@/components/ui';
import { BADGES, BADGE_BY_ID, badgeTier, type BadgeDef } from '@/lib/rewards';
import { useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';

const TILE = 84;

/** The whole collection: every badge, how far along it is, and what earns the next tier. */
export default function Badges() {
  const { c, e1 } = useTheme();
  const s = useStore();
  const [open, setOpen] = useState<string | null>(null);

  const rows = BADGES.map((def) => ({ def, ...badgeTier(s, def.id) }));
  const held = rows.reduce((sum, r) => sum + r.tier, 0);
  const total = BADGES.reduce((sum, b) => sum + b.tiers.length, 0);
  const shown = open ? BADGE_BY_ID[open] : null;
  const st = shown ? badgeTier(s, shown.id) : null;

  const progress = (def: BadgeDef, tier: number, value: number, next: number | null) => {
    const floor = tier > 0 ? def.tiers[tier - 1] : 0;
    return next === null ? 1 : Math.max(0, Math.min(1, (value - floor) / Math.max(1, next - floor)));
  };

  return (
    <Screen top={<TopBar center={<Txt v="heading">Badges</Txt>} />} gap={14}>
      <Block tone="brand" pad={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 150 }} a11y={`${held} of ${total} badge levels earned`}>
        <Mascot pose="trophy" size={128} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 54, lineHeight: 60, color: ON_BLOCK.ink }}>{held}</Text>
          <Txt v="bodyS" color="ink2">
            of {total}
          </Txt>
        </View>
      </Block>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {rows.map(({ def, tier, value, next }) => {
          const secret = !!def.hidden && tier === 0;
          return (
            <Tap
              key={def.id}
              onPress={() => setOpen(def.id)}
              accessibilityRole="button"
              accessibilityLabel={secret ? 'A secret badge, not found yet' : `${def.name}. ${tier ? `Level ${tier} of ${def.tiers.length}. ` : 'Not earned yet. '}${next === null ? 'Complete.' : `${value} of ${next} ${def.unit}.`}`}
              style={[{ width: '31%', flexGrow: 1, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 8 }, e1]}>
              {secret ? (
                <View style={{ width: TILE, height: TILE, borderRadius: TILE / 2, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <CircleQuestionMark size={TILE * 0.42} color={c.ink3} strokeWidth={2.2} />
                </View>
              ) : (
                <Badge id={def.id} tier={tier} size={TILE} />
              )}
              <Txt v="caption" center numberOfLines={2} style={{ minHeight: 36 }}>
                {secret ? '???' : def.name}
              </Txt>
              {!secret && (
                <View style={{ alignSelf: 'stretch', gap: 4, paddingHorizontal: 4 }}>
                  <Bar value={progress(def, tier, value, next)} color={next === null ? 'success' : 'indigo'} height={6} />
                  <Txt v="caption" color="ink2" center>
                    {next === null ? `${value}` : `${value} / ${next}`}
                  </Txt>
                </View>
              )}
            </Tap>
          );
        })}
      </View>

      <Sheet visible={!!shown} onClose={() => setOpen(null)}>
        {shown && st && (
          <>
            {shown.hidden && st.tier === 0 ? (
              <View style={{ alignItems: 'center', gap: 14, paddingVertical: 10 }}>
                <Mascot pose="thumbs" size={150} />
                <Txt v="title" center>
                  A secret
                </Txt>
              </View>
            ) : (
              <>
                <View style={{ height: 220, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.xl, backgroundColor: st.tier ? c[shown.tone] : c.surface2 }}>
                  <Badge id={shown.id} tier={st.tier} size={132} />
                </View>
                <Txt v="title" center>
                  {shown.name}
                </Txt>
                {/* The tiers, as a row of targets: reached ones are filled. */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
                  {shown.tiers.map((t, i) => (
                    <View key={t} style={{ minWidth: 46, height: 36, paddingHorizontal: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: i < st.tier ? c.ink : c.surface2 }} accessible accessibilityLabel={`${t} ${shown.unit}${i < st.tier ? ', reached' : ''}`}>
                      <Text style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 14, color: i < st.tier ? c.onInk : c.ink2 }}>{t}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ gap: 8, paddingHorizontal: 6 }}>
                  <Bar value={progress(shown, st.tier, st.value, st.next)} color={st.next === null ? 'success' : 'indigo'} />
                  <Txt v="body" center>
                    {st.next === null ? unitFor(st.value, shown.unit) : `${st.value} / ${st.next} ${shown.unit}`}
                  </Txt>
                </View>
              </>
            )}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
