import { Redirect } from 'expo-router';

import { useStore } from '@/lib/store';

/** Setup first, then the placement if it has not been done, then the journey. */
export default function Index() {
  const onboarded = useStore((s) => s.onboarded);
  const placed = useStore((s) => s.placed);
  return <Redirect href={!onboarded ? '/onboarding/welcome' : !placed ? '/onboarding/placement-intro' : '/(tabs)'} />;
}
