import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { ClipboardPaste, Copy, Download, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Block, Btn, Field, IconBtn, Note, Screen, Tag, TopBar, Txt } from '@/components/ui';
import { activeWords, useStore } from '@/lib/store';

/** Everything lives on this phone. A backup is a code to copy out and paste back in. */
export default function Backup() {
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const count = useStore((s) => activeWords(s).length);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<{ text: string; tone: 'success' | 'warn' } | null>(null);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(exportData());
      setStatus({ text: `Copied · ${count} word${count === 1 ? '' : 's'}`, tone: 'success' });
    } catch {
      setStatus({ text: 'Copy failed', tone: 'warn' });
    }
  };
  const paste = async () => {
    try {
      setCode(await Clipboard.getStringAsync());
    } catch {
      setStatus({ text: 'Paste by hand', tone: 'warn' });
    }
  };
  const restore = () => {
    if (importData(code.trim())) {
      setCode('');
      router.replace('/'); // the index route sends a backup made before placement to the placement
    } else {
      setStatus({ text: 'Code not recognised', tone: 'warn' });
    }
  };

  return (
    <Screen top={<TopBar center={<Txt v="heading">Backup</Txt>} right={<Tag icon={Smartphone} label="On this phone" />} />} keyboard>
      <Block tone="butter" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Mascot pose="cheer" size={110} />
        <View style={{ flex: 1 }}>
          <Btn icon={Copy} label="Copy code" onPress={copy} a11y="Copy a backup code with your words, progress and settings" />
        </View>
      </Block>
      {status && <Note text={status.text} tone={status.tone} />}
      <Field value={code} onChangeText={setCode} placeholder="Backup code" accessibilityLabel="Backup code" autoCapitalize="none" autoCorrect={false} right={<IconBtn icon={ClipboardPaste} label="Paste from clipboard" kind="soft" size={44} onPress={paste} />} />
      <Btn icon={Download} label="Restore" kind="soft" onPress={restore} disabled={!code.trim()} a11y="Restore from this code. Replaces what is on this phone." />
    </Screen>
  );
}
