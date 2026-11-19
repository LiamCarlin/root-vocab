import { useStore } from './store';
import { audioLib, clipPlaying, type ClipPlayer } from './voice';

// Interface sounds: ten short, quiet mallet tones (see assets/sfx/make.py).
// `sfx.play` is fire-and-forget. It is silent when sound is switched off, when
// the audio module is missing, while Root is speaking, and on any error.

export type SfxName = 'tap' | 'pop' | 'good' | 'miss' | 'combo' | 'win' | 'unlock' | 'gem' | 'whoosh' | 'chest';

const FILES: Record<SfxName, number> = {
  tap: require('../../assets/sfx/tap.wav'),
  pop: require('../../assets/sfx/pop.wav'),
  good: require('../../assets/sfx/good.wav'),
  miss: require('../../assets/sfx/miss.wav'),
  combo: require('../../assets/sfx/combo.wav'),
  win: require('../../assets/sfx/win.wav'),
  unlock: require('../../assets/sfx/unlock.wav'),
  gem: require('../../assets/sfx/gem.wav'),
  whoosh: require('../../assets/sfx/whoosh.wav'),
  chest: require('../../assets/sfx/chest.wav'),
};

const VOLUME: Record<SfxName, number> = { tap: 0.5, pop: 0.7, good: 0.8, miss: 0.6, combo: 0.8, win: 0.85, unlock: 0.85, gem: 0.7, whoosh: 0.5, chest: 0.85 };

type SpeechLib = { isSpeakingAsync(): Promise<boolean> };

let speech: SpeechLib | null | undefined;
function speaking(): Promise<boolean> {
  if (clipPlaying()) return Promise.resolve(true);
  if (speech === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      speech = require('expo-speech') as SpeechLib;
    } catch {
      speech = null;
    }
  }
  if (!speech?.isSpeakingAsync) return Promise.resolve(false);
  return speech.isSpeakingAsync().catch(() => false);
}

const players: Partial<Record<SfxName, ClipPlayer>> = {};

function fire(name: SfxName) {
  const a = audioLib();
  if (!a) return;
  let p = players[name];
  if (!p) {
    p = a.createAudioPlayer(FILES[name]);
    p.volume = VOLUME[name];
    players[name] = p;
  } else {
    const r = p.seekTo(0);
    if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
  }
  p.play();
}

export const sfx = {
  play(name: SfxName) {
    try {
      // `sound` is new in v4; an older saved profile without it counts as on.
      if (useStore.getState().display?.sound === false) return;
      speaking()
        .then((busy) => {
          if (busy) return;
          try {
            fire(name);
          } catch {
            // silence is always an acceptable outcome
          }
        })
        .catch(() => {});
    } catch {
      // never throw into a press handler
    }
  },
};
