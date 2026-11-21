import { Flame, Leaf, Zap, type LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Tap, Txt } from '@/components/ui';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { radius, useTheme } from '@/theme';

const PACE: { goal: 1 | 2 | 3; label: string; icon: LucideIcon }[] = [
  { goal: 1, label: 'Easy', icon: Leaf },
  { goal: 2, label: 'Steady', icon: Flame },
  { goal: 3, label: 'Keen', icon: Zap },
];

/** The daily goal: how many stops on the journey make a day. Used in setup and in About me. */
export function PacePicker() {
  const { c, font } = useTheme();
  const goal = useStore((s) => s.goal);
  const patch = useStore((s) => s.patch);
  return (
    <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Stops each day">
      {PACE.map((p) => {
        const on = goal === p.goal;
        const fg = on ? c.onInk : c.ink;
        return (
          <Tap
            key={p.goal}
            onPress={() => {
              if (!on) sfx.play('tap');
              patch({ goal: p.goal });
            }}
            accessibilityRole="radio"
            accessibilityLabel={`${p.label}: ${p.goal} ${p.goal === 1 ? 'stop' : 'stops'} a day`}
            accessibilityState={{ selected: on }}
            style={{ flex: 1, minHeight: 118, borderRadius: radius.lg, backgroundColor: on ? c.ink : c.surface, borderWidth: 1.5, borderColor: on ? c.ink : c.line, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 }}>
            <p.icon size={22} color={fg} strokeWidth={2.4} />
            <Text style={{ fontFamily: font('b'), fontSize: 30, lineHeight: 36, color: fg }}>{p.goal}</Text>
            <Txt v="bodyS" style={{ color: fg }}>
              {p.label}
            </Txt>
          </Tap>
        );
      })}
    </View>
  );
}
