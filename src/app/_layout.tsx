import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold } from '@expo-google-fonts/lexend';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UnlockHost } from '@/components/rewards';
import { ToastHost } from '@/components/ui';
import { onCheckInTap } from '@/lib/checkins';
import { useStore } from '@/lib/store';
import { motion, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsReady] = useFonts({
    Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold,
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
    AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold,
  });
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  const { c, dark, reduceMotion } = useTheme();

  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => {
    if (fontsReady && hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, hydrated]);
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.canvas).catch(() => {});
  }, [c.canvas]);
  // A reminder opens the journey, if setup is finished.
  // Coming back to the app on a new day (on any tab) rolls the day over: quests, the daily goal, freezes.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const s = useStore.getState();
      if (state === 'active' && s.onboarded) s.tick();
    });
    return () => sub.remove();
  }, []);
  useEffect(() => onCheckInTap(() => useStore.getState().onboarded && router.push('/(tabs)')), []);

  if (!fontsReady || !hydrated) return <View style={{ flex: 1, backgroundColor: c.canvas }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {/* On a wide screen the app stays a phone-width column. */}
      <View style={{ flex: 1, backgroundColor: dark ? '#07080A' : c.surface2, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: c.canvas, overflow: 'hidden' }}>
          <ToastHost>
            {/* Celebrations sit above every screen. */}
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: c.canvas },
                animation: reduceMotion ? 'fade' : 'slide_from_right',
                animationDuration: reduceMotion ? 120 : motion.screen,
              }}>
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="finder" options={{ presentation: 'modal', animation: reduceMotion ? 'fade' : 'slide_from_bottom' }} />
              <Stack.Screen name="mission/[id]" options={{ gestureEnabled: false }} />
              <Stack.Screen name="play/[kind]" options={{ gestureEnabled: false }} />
              <Stack.Screen name="story/[which]" options={{ gestureEnabled: false, animation: 'fade' }} />
              <Stack.Screen name="lab" />
            </Stack>
            <UnlockHost />
          </ToastHost>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
