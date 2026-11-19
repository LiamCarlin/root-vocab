import { Globe, Snail, Vibrate, Volume2, Wind } from 'lucide-react-native';
import { View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Block, Screen, Toggle, TopBar, Txt } from '@/components/ui';
import { buzz, say } from '@/lib/audio';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { radius } from '@/theme';

/** How Root sounds and feels: whether its pictures appear, sound, vibration, motion, speech speed, and the online word search. */
export default function Feel() {
  const display = useStore((s) => s.display);
  const setDisplay = useStore((s) => s.setDisplay);
  const slowAudio = useStore((s) => s.slowAudio);
  const finderOnline = useStore((s) => s.finderOnline);
  const patch = useStore((s) => s.patch);
  return (
    <Screen top={<TopBar center={<Txt v="heading">Sound and feel</Txt>} />}>
      <Block tone="brand" pad={18} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
        <Mascot pose={display.companion === 'off' ? 'sleep' : 'headphones'} size={112} />
        <View style={{ flex: 1, paddingBottom: 6 }}>
          <Toggle value={display.companion !== 'off'} onChange={(v) => setDisplay({ companion: v ? 'on' : 'off' })} label="Show Root" a11y="Show Root on cards and corners" />
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
