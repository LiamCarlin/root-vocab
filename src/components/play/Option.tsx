import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Wiggle } from '@/components/fx';
import { Tap, Txt } from '@/components/ui';
import { ON_BLOCK, radius, useTheme } from '@/theme';

export type OptionState = 'idle' | 'right' | 'wrong' | 'dim';

/**
 * One answer in a stack of choices. Full width and left aligned, so every option starts at the
 * same place on the line. A wrong pick wobbles and fades back; it is never marked in red.
 */
export function Option({ label, state = 'idle', onPress, disabled, big }: { label: string; state?: OptionState; onPress?: () => void; disabled?: boolean; big?: boolean }) {
  const { c, e1 } = useTheme();
  const right = state === 'right';
  const faded = state === 'wrong' || state === 'dim';
  return (
    <Wiggle trigger={state === 'wrong' ? 1 : 0}>
      <Tap
        onPress={onPress}
        disabled={disabled || state !== 'idle'}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled || state !== 'idle', selected: right }}
        style={[
          { minHeight: big ? 72 : 64, borderRadius: radius.lg, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: right ? c.mint : faded ? c.surface2 : c.surface, borderWidth: 1.5, borderColor: right ? c.mint : c.line, opacity: faded ? 0.5 : 1 },
          state === 'idle' ? e1 : null,
        ]}>
        <Txt v={big ? 'heading' : 'body'} style={{ flex: 1, color: right ? ON_BLOCK.ink : faded ? c.ink2 : c.ink }}>
          {label}
        </Txt>
        {right && (
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={18} color="#FFFFFF" strokeWidth={3.2} />
          </View>
        )}
      </Tap>
    </Wiggle>
  );
}
