import { useFocusEffect } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { Block, Rise, Screen, TopBar, Txt } from '@/components/ui';
import { JOURNAL } from '@/data/valley';
import { journalPages, useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';

/**
 * The journal. Somebody walked the valley before, and left pages in the chests: one in every chest, one
 * more each time a place is cleared. Read in order they say where the Hush came from, what was tried,
 * what worked, and where Root came from. Pages not found yet show only their number.
 */
export default function Journal() {
  const { c } = useTheme();
  const found = useStore((s) => journalPages(s));
  // What was new when the screen opened stays marked for this visit.
  const [seenBefore] = useState(() => useStore.getState().journalSeen);

  useFocusEffect(
    useCallback(() => {
      useStore.getState().readJournal(found);
    }, [found]),
  );

  return (
    <Screen top={<TopBar center={<Txt v="heading">Journal</Txt>} />} gap={12}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Figure pose="read" size={104} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="title">
            {found} of {JOURNAL.length}
          </Txt>
          <Txt v="bodyS" color="ink2">
            Pages turn up in chests
          </Txt>
        </View>
      </View>

      {JOURNAL.map((p, i) => {
        const have = i < found;
        const fresh = have && i >= seenBefore;
        if (!have) {
          return (
            <View key={i} style={{ height: 64, borderRadius: radius.lg, borderWidth: 2, borderColor: c.line, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 }} accessible accessibilityLabel={`Page ${i + 1}, not found yet`}>
              <Lock size={18} color={c.ink3} strokeWidth={2.6} />
              <Txt v="bodyS" color="ink3">
                Page {i + 1}
              </Txt>
            </View>
          );
        }
        return (
          <Rise key={i} i={Math.max(0, i - seenBefore)}>
            <Block tone={fresh ? 'butter' : 'surface'} pad={20} style={{ gap: 8 }} a11y={`Page ${i + 1}${fresh ? ', new' : ''}. ${p.title}. ${p.text}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 8, backgroundColor: fresh ? ON_BLOCK.ink : c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 13, color: fresh ? '#FFFFFF' : c.ink2 }}>{i + 1}</Text>
                </View>
                <Txt v="label" color="ink2" style={{ flex: 1 }}>
                  {p.title}
                </Txt>
              </View>
              <Txt v="heading" style={{ lineHeight: 29 }}>
                {p.text}
              </Txt>
            </Block>
          </Rise>
        );
      })}
    </Screen>
  );
}
