import { router, type Href } from 'expo-router';
import { Gem, MicOff, Plus, Repeat, RotateCcw, Ruler, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Block, Btn, Group, Row, Screen, Sheet, Toggle, TopBar, Txt, useToast } from '@/components/ui';
import { niceDate } from '@/lib/dates';
import { dueCount, today, useStore } from '@/lib/store';
import { radius } from '@/theme';

/** For running usability sessions and demos: move time, force a mic miss, redo placement, top up gems, and wipe. */
export default function Moderator() {
  const mod = useStore((s) => s.mod);
  const setMod = useStore((s) => s.setMod);
  const patch = useStore((s) => s.patch);
  const tick = useStore((s) => s.tick);
  const resetAll = useStore((s) => s.resetAll);
  const day = useStore((s) => today(s));
  const due = useStore((s) => dueCount(s));
  const toast = useToast();
  const [wipe, setWipe] = useState(false);

  const jump = (dayOffset: number) => {
    setMod({ dayOffset });
    tick(); // roll quests, daily counters and streak freezes over to the new day
  };

  return (
    <Screen top={<TopBar center={<Txt v="heading">Moderator</Txt>} />}>
      {/* Simulated date: memory boxes come back after 1, 3, 7 and 21 days, so step forward to walk a word to rooted. */}
      <Block tone="brand" style={{ gap: 12 }} a11y={`Simulated date ${niceDate(day)}, ${due} words due`}>
        <View>
          <Txt v="title">{niceDate(day)}</Txt>
          <Txt v="bodyS" color="ink2">
            {mod.dayOffset ? `${mod.dayOffset} ${mod.dayOffset === 1 ? 'day' : 'days'} ahead. ` : 'Today. '}
            {due} {due === 1 ? 'word' : 'words'} due for review.
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn icon={Plus} label="Next day" small flex={1} onPress={() => jump(mod.dayOffset + 1)} />
          <Btn icon={RotateCcw} label="Real date" kind="white" small flex={1} disabled={mod.dayOffset === 0} onPress={() => jump(0)} />
        </View>
      </Block>

      <Block pad={16} round={radius.lg}>
        <Toggle value={mod.micMiss} onChange={(v) => setMod({ micMiss: v })} label="Mic misses once" icon={MicOff} />
      </Block>

      <Group>
        <Row
          title="Redo placement"
          icon={Ruler}
          chevron
          onPress={() => {
            patch({ placed: false });
            router.push('/onboarding/placement-intro' as Href);
          }}
        />
        <Row
          title="Add 500 gems"
          icon={Gem}
          onPress={() => {
            patch({ gems: useStore.getState().gems + 500 });
            toast({ text: '+500', icon: Gem, tone: 'success' });
          }}
        />
        <Row
          title="Replay setup"
          icon={Repeat}
          chevron
          onPress={() => {
            patch({ onboarded: false });
            router.replace('/onboarding/welcome');
          }}
          last
        />
      </Group>

      <Btn icon={Trash2} label="Reset everything" kind="ghost" small onPress={() => setWipe(true)} />

      <Sheet visible={wipe} onClose={() => setWipe(false)} title="Erase everything?">
        <View style={{ alignItems: 'center' }}>
          <Mascot pose="think" size={130} />
          <Txt v="body" center>
            Words, progress and settings on this device are deleted. This cannot be undone.
          </Txt>
        </View>
        <Btn
          icon={Trash2}
          label="Erase"
          kind="danger"
          a11y="Erase everything on this phone and start over. This cannot be undone."
          onPress={() => {
            setWipe(false);
            resetAll();
            router.replace('/onboarding/welcome');
          }}
        />
      </Sheet>
    </Screen>
  );
}
