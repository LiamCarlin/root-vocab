import { router } from 'expo-router';
import { BellOff, Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { CheckInEditor } from '@/components/CheckInEditor';
import { Btn, IconBtn, Rise, Screen, TopBar, Txt, useToast } from '@/components/ui';
import { askPermission, checkInsSupported, syncCheckIns } from '@/lib/checkins';
import { sfx } from '@/lib/sfx';
import { dueCount, useStore } from '@/lib/store';

/** The daily reminder: Root comes to the learner, at the time they pick. Then the story begins. */
export default function CheckIns() {
  const toast = useToast();
  const setCheckIn = useStore((s) => s.setCheckIn);
  const finishOnboarding = useStore((s) => s.finishOnboarding);
  const supported = checkInsSupported();

  const finish = async () => {
    const s = useStore.getState();
    const wanted = s.checkIn.freq !== 'off' && s.checkIn.slots.length > 0;
    try {
      if (wanted) {
        const ok = await askPermission();
        if (ok) await syncCheckIns(s.checkIn, s.voice, dueCount(s));
        else if (supported) toast({ text: 'Reminders are off', icon: BellOff });
      } else {
        await syncCheckIns(s.checkIn, s.voice, 0);
      }
    } catch {}
    sfx.play('good');
    finishOnboarding();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/story/prologue');
  };

  const later = () => {
    setCheckIn({ freq: 'off' });
    finish();
  };

  return (
    <Screen top={<TopBar steps={{ total: 5, done: 4 }} right={<IconBtn icon={BellOff} label="Decide later. No reminders for now." size={48} onPress={later} />} />} footer={<Btn icon={Check} label="Finish" a11y="Finish setup" onPress={finish} />}>
      <Rise style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Txt v="display" accessibilityRole="header" accessibilityLabel="When should Root remind you?" style={{ paddingBottom: 10 }}>
          Reminders
        </Txt>
        <View>
          <Figure pose="wave" size={110} />
        </View>
      </Rise>
      <Rise i={1}>
        <CheckInEditor showGoal={false} />
      </Rise>
    </Screen>
  );
}
