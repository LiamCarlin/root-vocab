import { Platform } from 'react-native';

// Motion input for the marble and sky-writing games. Everything here degrades
// to "not available" (web, simulators, a denied permission), and the games
// then fall back to touch, so nobody is ever blocked by a sensor.

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
 * Rotation of the phone used as a wand, in radians per second.
 * dx > 0 = the phone is turning to point right. dy > 0 = it is tipping to point down.
 */
export function watchWand(cb: (dx: number, dy: number, dt: number) => void, hz = 60): () => void {
  const s = lib();
  if (!s) return () => {};
  try {
    s.Gyroscope.setUpdateInterval(Math.round(1000 / hz));
    let last = 0;
    const sub = s.Gyroscope.addListener(({ x, y, timestamp }) => {
      const dt = last ? Math.min(0.05, Math.max(0.001, timestamp - last)) : 1 / hz;
      last = timestamp;
      cb(-y, x, dt);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
