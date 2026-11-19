import { VOICE, type VoiceClip } from '@/data/voice';

// Recorded speech, all in one neural voice (see tools/voice). Every bank word is recorded whole, and
// every beat is recorded on its own: the voice says just "jen", as a teacher does when sounding out
// "genuine", so a tapped beat is a whole unhurried syllable rather than a slice cut out of the word.
// The phone's own voice cannot do that well: handed "rayt" or "juh" it reads a made-up word, in a
// different voice each time.
//
// Anything without a recording (the learner's own words, sentences, letter names) still goes to
// the phone's voice in audio.ts. Every function here is safe to call when the audio module is
// missing: `playClip` returns false and the caller falls back.

type Status = { didJustFinish?: boolean };
export type ClipPlayer = {
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void> | void;
  remove(): void;
  volume: number;
  addListener(event: 'playbackStatusUpdate', cb: (status: Status) => void): { remove(): void };
};
export type AudioLib = {
  createAudioPlayer(source: number): ClipPlayer;
  setAudioModeAsync(mode: { playsInSilentMode?: boolean; interruptionMode?: 'mixWithOthers' | 'doNotMix' | 'duckOthers' }): Promise<void>;
};

let lib: AudioLib | null | undefined;
/** expo-audio, or null where it is missing. Shared with the interface sounds so the audio mode is set once. */
export function audioLib(): AudioLib | null {
  if (lib === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = require('expo-audio') as Partial<AudioLib>;
      lib = typeof m?.createAudioPlayer === 'function' ? (m as AudioLib) : null;
      // Follow the ringer switch and never interrupt music or speech.
      lib?.setAudioModeAsync?.({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    } catch {
      lib = null;
    }
  }
  return lib;
}

/** The recording of a word, if it has one. `beats` is how many beats the caller thinks the word has. */
export function clipFor(text: string, beats?: number): VoiceClip | undefined {
  const clip = VOICE[text.trim().toLowerCase()];
  return clip && (beats === undefined || clip.beats.length === beats) ? clip : undefined;
}

// Players are kept so a beat tapped twice, or the next beat along, starts at once. Each one holds a
// decoder, so only the last few are kept: enough for the word on screen.
const KEEP = 10;
const players = new Map<number, ClipPlayer>();
const played = new Set<number>();

function playerFor(a: AudioLib, source: number): ClipPlayer {
  let p = players.get(source);
  if (p) {
    players.delete(source);
    players.set(source, p);
    return p;
  }
  p = a.createAudioPlayer(source);
  players.set(source, p);
  while (players.size > KEEP) {
    const [oldest, old] = players.entries().next().value as [number, ClipPlayer];
    players.delete(oldest);
    played.delete(oldest);
    try {
      old.remove();
    } catch {}
  }
  return p;
}

/** Loads a word's beats ahead of the first tap. */
export function primeClip(clip: VoiceClip) {
  const a = audioLib();
  if (!a) return;
  try {
    for (const source of clip.beats.slice(0, KEEP - 2)) playerFor(a, source);
  } catch {}
}

let current: { stop(): void } | null = null;

export const clipPlaying = () => current !== null;

/** Stops the clip that is playing. Its `onDone` still runs, as it does for stopped speech. */
export function stopClips() {
  current?.stop();
}

/**
 * Plays one recording. `ms` is its length, a backstop for the finished event. Returns false when it
 * could not start, so the caller can speak instead.
 */
export function playClip(source: number, ms: number, onDone?: () => void): boolean {
  const a = audioLib();
  if (!a) return false;
  stopClips();
  let p: ClipPlayer;
  let sub: { remove(): void } | undefined;
  try {
    p = playerFor(a, source);
  } catch {
    return false;
  }
  let over = false;
  const finish = () => {
    if (over) return;
    over = true;
    clearTimeout(backstop);
    try {
      sub?.remove();
    } catch {}
    if (current === me) current = null;
    onDone?.();
  };
  const backstop = setTimeout(finish, ms + 1200);
  const me = {
    stop() {
      try {
        p.pause();
      } catch {}
      finish();
    },
  };
  try {
    sub = p.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) finish();
    });
    if (played.has(source)) {
      Promise.resolve(p.seekTo(0))
        .catch(() => {})
        .then(() => {
          if (!over) p.play();
        })
        .catch(() => {});
    } else {
      played.add(source);
      p.play();
    }
  } catch {
    over = true;
    clearTimeout(backstop);
    try {
      sub?.remove();
    } catch {}
    return false;
  }
  current = me;
  return true;
}
