import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { ClipboardPaste, Copy, Download, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Block, Btn, Field, IconBtn, Note, Screen, SectionLabel, Sheet, TopBar, Txt } from '@/components/ui';
import { activeWords, useStore } from '@/lib/store';

/**
 * Everything lives on this device. A backup is a code to copy out and paste back in.
 * Each half says what it does; bringing a copy back replaces everything, so it asks first.
 */
export default function Backup() {
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const count = useStore((s) => activeWords(s).length);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<{ text: string; tone: 'success' | 'warn' } | null>(null);
  const [confirm, setConfirm] = useState(false);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(exportData());
      setStatus({ text: `Copied: ${count} word${count === 1 ? '' : 's'} and your progress. Paste it somewhere safe, like a note or a message to yourself.`, tone: 'success' });
    } catch {
      setStatus({ text: 'Could not copy. Try again, or check that this browser may use the clipboard.', tone: 'warn' });
    }
  };
  const paste = async () => {
    try {
      setCode(await Clipboard.getStringAsync());
    } catch {
      setStatus({ text: 'Could not read the clipboard. Press and hold the box below, then choose Paste.', tone: 'warn' });
    }
  };
  const restore = () => {
    setConfirm(false);
    if (importData(code.trim())) {
      setCode('');
      router.replace('/'); // the index route sends a backup made before placement to the placement
    } else {
      setStatus({ text: 'That code did not work. Copy the whole code again on the other device, then paste it here.', tone: 'warn' });
    }
  };

  return (
    <Screen top={<TopBar center={<Txt v="heading">Backup</Txt>} />} keyboard>
      <Txt v="body" color="ink2">
        Your words and progress are kept only on this device. A backup code lets you move them to another one.
      </Txt>

      <SectionLabel>Save a copy</SectionLabel>
      <Btn icon={Copy} label="Copy backup code" onPress={copy} a11y="Copy a backup code with your words, progress and settings" />
      {status && <Note text={status.text} tone={status.tone} />}

      <SectionLabel>Bring back a copy</SectionLabel>
      <Block pad={16} style={{ gap: 12 }}>
        <Txt v="bodyS" color="ink2">
          Paste a code from another device. It replaces everything on this one.
        </Txt>
        <Field
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setStatus(null);
          }}
          placeholder="Paste the code here"
          accessibilityLabel="Backup code"
          autoCapitalize="none"
          autoCorrect={false}
          right={<IconBtn icon={ClipboardPaste} label="Paste from clipboard" kind="soft" size={44} onPress={paste} />}
        />
        <Btn icon={Download} label="Restore from code" kind="soft" onPress={() => setConfirm(true)} disabled={!code.trim()} />
      </Block>

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Replace everything here?">
        <View style={{ gap: 8 }}>
          <Txt v="body" center>
            {count > 0 ? `The ${count} word${count === 1 ? '' : 's'} and progress on this device are replaced by the ones in the code. This cannot be undone.` : 'What is on this device is replaced by what is in the code.'}
          </Txt>
        </View>
        <Btn icon={RefreshCw} label="Replace" kind="danger" onPress={restore} />
        <Btn kind="soft" label="Keep what is here" onPress={() => setConfirm(false)} />
      </Sheet>
    </Screen>
  );
}
