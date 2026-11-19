import { Platform } from 'react-native';

// Motion input: tilt for the marble run, a shake to smooth the sand tray. Everything here
// degrades to "not available" (web, simulators, a denied permission), and the games then
// fall back to touch, so nobody is ever blocked by a sensor.

type Sensors = typeof import('expo-sensors');
let cached: Sensors | null | undefined;
function lib(): Sensors | null {
  if (Platform.OS === 'web') return null;
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-sensors') as Sensors;
  } catch {
    cached = null;
  }
  return cached;
}

/** True when the phone can report tilt and rotation and the learner allows it. */
export async function motionAvailable(): Promise<boolean> {
  const s = lib();
  if (!s) return false;
  try {
    if (!(await s.Accelerometer.isAvailableAsync())) return false;
    const perm = await s.Accelerometer.requestPermissionsAsync().catch(() => ({ granted: true }));
    return perm.granted !== false;
  } catch {
    return false;
  }
}

/**
 * Tilt as a 2D push, each axis about -1..1.
 * +x = right edge lower (things roll right). +y = bottom edge lower (things roll down the screen).
 * Returns an unsubscribe function.
 */
export function watchTilt(cb: (x: number, y: number) => void, hz = 60): () => void {
  const s = lib();
  if (!s) return () => {};
  try {
    // iOS and Android report gravity with opposite signs.
    const k = Platform.OS === 'android' ? -1 : 1;
    s.Accelerometer.setUpdateInterval(Math.round(1000 / hz));
    const sub = s.Accelerometer.addListener(({ x, y }) => cb(k * x, -k * y));
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

/**
 * Calls back when the phone is given a short shake: three jolts inside about a second.
 * Returns an unsubscribe function.
 */
export function watchShake(cb: () => void): () => void {
  const s = lib();
  if (!s) return () => {};
  try {
    s.Accelerometer.setUpdateInterval(50);
    let jolts: number[] = [];
    let quietUntil = 0;
    const sub = s.Accelerometer.addListener(({ x, y, z }) => {
      const now = Date.now();
      if (now < quietUntil) return;
      // At rest the reading is one g whichever way up the phone is; a jolt is well away from that.
      if (Math.abs(Math.hypot(x, y, z) - 1) < 0.8) return;
      jolts = jolts.filter((t) => now - t < 900);
      if (!jolts.length || now - jolts[jolts.length - 1] > 90) jolts.push(now);
      if (jolts.length >= 3) {
        jolts = [];
        quietUntil = now + 1200;
        cb();
      }
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
