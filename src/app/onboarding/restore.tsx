import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { ArrowRight, ClipboardPaste, Download } from 'lucide-react-native';
import { useState } from 'react';

import { Mascot } from '@/components/Mascot';
import { Btn, Field, IconBtn, Note, Rise, Screen, TopBar, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';

/** "I've used Root before": bring words back from a backup code. Says where the code comes from. */
export default function Restore() {
  const importData = useStore((s) => s.importData);
  const [code, setCode] = useState('');
  const [failed, setFailed] = useState(false);

  const paste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setCode(text);
        setFailed(false);
      }
    } catch {}
  };

  const restore = () => {
    if (importData(code.trim())) {
      // The index route decides: a backup made before the placement still gets one.
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
    } else setFailed(true);
  };
  const fresh = () => router.replace('/onboarding/about');

  return (
    <Screen
      keyboard
      top={<TopBar />}
      footer={
        <>
          <Btn icon={Download} label="Bring back my words" onPress={restore} disabled={!code.trim()} />
          <Btn kind="ghost" small label="Start fresh instead" iconRight={ArrowRight} onPress={fresh} />
        </>
      }>
      <Rise style={{ alignItems: 'center', marginTop: 8 }}>
        <Mascot pose="think" size={130} />
      </Rise>
      <Txt v="display" accessibilityRole="header">
        Bring back your words
      </Txt>
      <Txt v="body" color="ink2">
        On the device you used before, open You, then Backup, and tap Copy backup code. Paste that code here.
      </Txt>
      {failed && <Note tone="warn" text="That code did not work. Copy the whole code again, then paste it here." />}
      <Rise i={1}>
        <Field
          big
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setFailed(false);
          }}
          placeholder="Paste the code here"
          multiline
          accessibilityLabel="Backup code"
          style={{ fontSize: 15, minHeight: 110, maxHeight: 200, textAlignVertical: 'top' }}
          right={<IconBtn icon={ClipboardPaste} label="Paste from clipboard" kind="soft" size={46} onPress={paste} />}
        />
      </Rise>
    </Screen>
  );
}
