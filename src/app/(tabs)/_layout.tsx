import { Tabs, router } from 'expo-router';
import { Gamepad2, Map, Search, Sprout, User, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Tap } from '@/components/ui';
import { buzz } from '@/lib/audio';
import { dueCount, useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';

const TABS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'index', label: 'Journey', icon: Map },
  { name: 'words', label: 'Garden', icon: Sprout },
  { name: 'practice', label: 'Arcade', icon: Gamepad2 },
  { name: 'you', label: 'You', icon: User },
];

/** Floating pill, icons only. The active tab is a black disc. The word finder sits in the middle, one tap from anywhere. */
function TabBar({ state, navigateToTab }: { state: { index: number; routes: { name: string; key: string }[] }; navigateToTab: (routeKey: string) => void }) {
  const { c, e2 } = useTheme();
  const insets = useSafeAreaInsets();
  const due = useStore((s) => dueCount(s));
  const active = state.routes[state.index]?.name;

  const item = (t: (typeof TABS)[number]) => {
    const on = active === t.name;
    const key = state.routes.find((r) => r.name === t.name)?.key;
    const dot = t.name === 'practice' && due > 0;
    return (
      <Tap key={t.name} onPress={() => key && navigateToTab(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={dot ? `${t.label}, ${due} due` : t.label} style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent' }}>
        <t.icon size={23} color={on ? c.onInk : c.ink3} strokeWidth={on ? 2.5 : 2.2} />
        {dot && <View style={{ position: 'absolute', right: 9, top: 9, width: 11, height: 11, borderRadius: 6, backgroundColor: c.orange, borderWidth: 2, borderColor: on ? c.ink : c.surface }} />}
      </Tap>
    );
  };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12), alignItems: 'center' }}>
      <View style={[{ backgroundColor: c.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', padding: 8, gap: 6 }, e2]}>
        {item(TABS[0])}
        {item(TABS[1])}
        <Pressable
          onPress={() => {
            buzz.tap();
            router.push('/finder');
          }}
          accessibilityRole="button"
          accessibilityLabel="Find a word"
          style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, borderBottomWidth: 4, borderBottomColor: '#D6781F' }}>
          <Search size={28} color={ON_BLOCK.ink} strokeWidth={2.8} />
        </Pressable>
        {item(TABS[2])}
        {item(TABS[3])}
      </View>
    </View>
  );
}

export const TAB_SPACE = 112;

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs tabBar={(p) => <TabBar state={p.state} navigateToTab={p.navigateToTab} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.canvas } }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}
