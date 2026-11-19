import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { SylWord } from '@/components/learn';
import { Block, Group, Row, Screen, Tap, TopBar, Txt } from '@/components/ui';
import { useStore, type Display } from '@/lib/store';
import { ON_BLOCK, fontLabels, fonts, palettes, radius, useTheme, type FontId } from '@/theme';

const THEMES: { id: Display['theme']; name: string }[] = [
  { id: 'system', name: 'Match phone' },
  { id: 'light', name: 'Light' },
  { id: 'paper', name: 'Paper' },
  { id: 'dark', name: 'Dark' },
];

/** How words look: typeface, size, letter spacing and background. Sound and motion live in Sound and feel. */
export default function Reading() {
  const { c, font } = useTheme();
  const display = useStore((s) => s.display);
  const setDisplay = useStore((s) => s.setDisplay);

  const pick = (on: boolean, onPress: () => void, a11y: string, child: React.ReactNode) => (
    <Tap key={a11y} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={a11y} style={{ flex: 1, height: 64, borderRadius: radius.md, backgroundColor: on ? c.ink : c.surface, borderWidth: 1.5, borderColor: on ? c.ink : c.line, alignItems: 'center', justifyContent: 'center' }}>
      {child}
    </Tap>
  );

  return (
    <Screen top={<TopBar center={<Txt v="heading">Reading</Txt>} />}>
      {/* Live preview: every choice below changes this card straight away. */}
      <Block tone="brand" style={{ gap: 10, alignItems: 'flex-start' }}>
        <SylWord text="separate" parts={['sep', 'a', 'rate']} size={40} color={ON_BLOCK.ink} on="brand" />
        <Txt v="body">to move things apart</Txt>
      </Block>

      <Group>
        {(Object.keys(fontLabels) as FontId[]).map((id, i, arr) => (
          <Row
            key={id}
            title={fontLabels[id].name}
            onPress={() => setDisplay({ font: id })}
            last={i === arr.length - 1}
            left={
              <Text style={{ fontFamily: fonts[id].b, fontSize: 26, width: 46, textAlign: 'center', color: c.ink }} accessibilityElementsHidden>
                Ag
              </Text>
            }
            right={display.font === id ? <Check size={22} color={c.ink} strokeWidth={3} /> : undefined}
          />
        ))}
      </Group>

      {/* Size */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {([16, 21, 27] as const).map((px, i) => pick(display.size === i, () => setDisplay({ size: i as 0 | 1 | 2 }), ['Standard text', 'Large text', 'Larger text'][i], <Text style={{ fontFamily: font('b'), fontSize: px, color: display.size === i ? c.onInk : c.ink }}>A</Text>))}
      </View>

      {/* Letter spacing */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[0, 1].map((sp) => pick(display.spacing === sp, () => setDisplay({ spacing: sp as 0 | 1 }), sp ? 'Wider letter spacing' : 'Standard letter spacing', <Text style={{ fontFamily: font('s'), fontSize: 19, letterSpacing: sp ? 5 : 0.5, color: display.spacing === sp ? c.onInk : c.ink }}>abc</Text>))}
      </View>

      {/* Background */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {THEMES.map((t) => {
          const on = display.theme === t.id;
          const a = t.id === 'system' ? palettes.light.canvas : palettes[t.id].canvas;
          const b = t.id === 'system' ? palettes.dark.canvas : palettes[t.id].canvas;
          return (
            <Tap key={t.id} onPress={() => setDisplay({ theme: t.id })} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${t.name} background`} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: 62, height: 62, borderRadius: 31, borderWidth: on ? 4 : 1.5, borderColor: on ? c.orange : c.line, overflow: 'hidden', flexDirection: 'row' }}>
                <View style={{ flex: 1, backgroundColor: a }} />
                <View style={{ flex: 1, backgroundColor: b }} />
              </View>
            </Tap>
          );
        })}
      </View>
    </Screen>
  );
}
