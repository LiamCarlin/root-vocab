import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { ArrowRight, Check, ClipboardPaste, RotateCcw, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Btn, Field, IconBtn, Note, Rise, Screen, Tag, TopBar } from '@/components/ui';
import { useStore } from '@/lib/store';

/** "I've used Root before": bring words back from a backup code. */
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
        failed ? (
          <>
            <Btn
              icon={RotateCcw}
              a11y="Try again"
              onPress={() => {
                setCode('');
                setFailed(false);
              }}
            />
            <Btn kind="soft" label="Fresh" iconRight={ArrowRight} a11y="Start fresh" onPress={fresh} />
          </>
        ) : (
          <>
            <Btn icon={Check} a11y="Restore my words" onPress={restore} disabled={!code.trim()} />
            <Btn kind="ghost" small label="Fresh" iconRight={ArrowRight} a11y="Start fresh instead" onPress={fresh} />
          </>
        )
      }>
      <Rise style={{ alignItems: 'center', marginTop: 8 }}>
        <Mascot pose="think" size={150} />
      </Rise>
      {failed && <Note tone="warn" text="Code not recognised" />}
      <Rise i={1}>
        <Field
          big
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setFailed(false);
          }}
          placeholder="Backup code"
          multiline
          accessibilityLabel="Backup code, from You, Back up"
          style={{ fontSize: 15, minHeight: 110, maxHeight: 200, textAlignVertical: 'top' }}
          right={<IconBtn icon={ClipboardPaste} label="Paste from clipboard" kind="soft" size={46} onPress={paste} />}
        />
      </Rise>
      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <Tag icon={Smartphone} label="On this phone" />
      </View>
    </Screen>
  );
}
