import { Globe, Moon, Snail, Sparkles, Vibrate, Volume2, Wind, X, type LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Mascot, type Pose } from '@/components/Mascot';
import { Block, Screen, Tap, Toggle, TopBar, Txt } from '@/components/ui';
import { buzz, say } from '@/lib/audio';
import { sfx } from '@/lib/sfx';
import { useStore, type Display } from '@/lib/store';
import { ON_BLOCK, radius } from '@/theme';

const COMPANION: { id: Display['companion']; label: string; icon: LucideIcon; a11y: string; pose: Pose }[] = [
  { id: 'lively', label: 'Lively', icon: Sparkles, a11y: 'Lively: Root pops in, reacts and plays', pose: 'dance' },
  { id: 'calm', label: 'Calm', icon: Moon, a11y: 'Calm: Root stays put and moves gently', pose: 'wave' },
  { id: 'off', label: 'Off', icon: X, a11y: 'Off: Root stays out of the way', pose: 'sleep' },
];

/** How Root sounds, feels and behaves: sound, vibration, the companion, motion, speech speed, and the online word search. */
export default function Feel() {
  const display = useStore((s) => s.display);
  const setDisplay = useStore((s) => s.setDisplay);
  const slowAudio = useStore((s) => s.slowAudio);
  const finderOnline = useStore((s) => s.finderOnline);
  const patch = useStore((s) => s.patch);
  const mode = COMPANION.find((m) => m.id === display.companion) ?? COMPANION[0];

  return (
    <Screen top={<TopBar center={<Txt v="heading">Sound and feel</Txt>} />}>
      {/* The companion, live: the three choices change Root right here. */}
      <Block tone="brand" pad={18} style={{ gap: 14 }}>
        <View style={{ height: 150, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Mascot key={mode.id} pose={mode.pose} size={140} still={mode.id === 'off'} motion={mode.id === 'lively' ? 'sway' : mode.id === 'calm' ? 'bob' : 'none'} poke={mode.id !== 'off'} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Companion">
          {COMPANION.map((m) => {
            const on = m.id === display.companion;
            return (
              <Tap key={m.id} onPress={() => setDisplay({ companion: m.id })} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={m.a11y} style={{ flex: 1, height: 76, borderRadius: radius.md, backgroundColor: on ? ON_BLOCK.ink : 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <m.icon size={22} color={on ? '#FFFFFF' : ON_BLOCK.ink} strokeWidth={2.3} />
                <Text style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 14, color: on ? '#FFFFFF' : ON_BLOCK.ink }}>{m.label}</Text>
              </Tap>
            );
          })}
        </View>
      </Block>

      <Block pad={16} round={radius.lg} style={{ gap: 6 }}>
        <Toggle
          value={display.sound}
          onChange={(v) => {
            setDisplay({ sound: v });
            if (v) sfx.play('good');
          }}
          label="Sounds"
          icon={Volume2}
        />
        <Toggle
          value={display.haptics}
          onChange={(v) => {
            setDisplay({ haptics: v });
            if (v) buzz.good();
          }}
          label="Vibration"
          icon={Vibrate}
        />
        <Toggle value={display.reduceMotion} onChange={(v) => setDisplay({ reduceMotion: v })} label="Less motion" icon={Wind} />
        <Toggle
          value={slowAudio}
          onChange={(v) => {
            patch({ slowAudio: v });
            say('separate', { slow: v });
          }}
          label="Slower speech"
          icon={Snail}
        />
      </Block>

      <Block pad={16} round={radius.lg} style={{ gap: 8 }}>
        <Toggle value={finderOnline === true} onChange={(v) => patch({ finderOnline: v })} label="Search online" icon={Globe} a11y="Search online. The Finder sends only the words you type." />
      </Block>
    </Screen>
  );
}
