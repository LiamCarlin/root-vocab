import { Send } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { CheckInEditor } from '@/components/CheckInEditor';
import { Btn, Note, Screen, TopBar, Txt } from '@/components/ui';
import { askPermission, checkInsSupported, contextOf, sendTest, syncCheckIns } from '@/lib/checkins';
import { useStore } from '@/lib/store';

/** Reminders: when Root nudges, how it talks, and how many stops make a day. */
export default function Reminders() {
  const checkIn = useStore((s) => s.checkIn);
  const voice = useStore((s) => s.voice);
  const supported = checkInsSupported();
  const [status, setStatus] = useState<{ text: string; tone: 'default' | 'warn' | 'success' } | null>(null);

  // Re-schedule whenever the settings change, so what is on screen is what is scheduled.
  useEffect(() => {
    if (!supported) return;
    let alive = true;
    (async () => {
      const { due, ctx } = contextOf(useStore.getState());
      if (checkIn.freq === 'off') {
        await syncCheckIns(checkIn, voice, due, ctx);
        if (alive) setStatus(null);
        return;
      }
      const ok = await askPermission();
      if (!alive) return;
      if (!ok) return setStatus({ text: 'Notifications blocked', tone: 'warn' });
      const n = await syncCheckIns(checkIn, voice, due, ctx);
      if (alive) setStatus(n ? { text: `${n} a week`, tone: 'success' } : null);
    })();
    return () => {
      alive = false;
    };
  }, [checkIn, voice, supported]);

  const test = async () => {
    const { due, ctx } = contextOf(useStore.getState());
    setStatus((await sendTest(voice, due, ctx)) ? { text: 'Test sent', tone: 'success' } : { text: 'Notifications blocked', tone: 'warn' });
  };

  return (
    <Screen top={<TopBar center={<Txt v="heading">Reminders</Txt>} />}>
      {!supported && <Note text="Phone app only" />}
      {supported && status && <Note text={status.text} tone={status.tone} />}
      <CheckInEditor />
      {supported && checkIn.freq !== 'off' && <Btn icon={Send} label="Test" kind="soft" a11y="Send a test reminder in 5 seconds" onPress={test} />}
    </Screen>
  );
}
