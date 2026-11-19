# Root's voice

Every bank word is recorded once and the recording is cut at the beat boundaries. A beat played on its
own is therefore the very sound it has inside the word (the lazy "uh" in sep-**a**-rate stays lazy, the
"rate" keeps its real vowel), and the beats tapped in a row add up to the word.

The phone's own voice cannot do this. Handed a respelling such as `rayt` or `juh` it reads a made-up
word, with the wrong vowel as often as not, and with the falling tune of a word said alone.

What the pipeline produces:

| Output | What it is |
| --- | --- |
| `assets/voice/<word>_w.m4a` | the word at speaking pace |
| `assets/voice/<word>_s.m4a` | the word said carefully (the slow button) |
| `assets/voice/<word>_1.m4a` … | the careful recording cut into its beats, one file each |
| `src/data/voice.ts` | generated manifest: the files and their lengths, keyed by the word |
| `lengths.json` | the lengths behind the manifest, kept so one word can be rebuilt without the rest |
| `out/report.txt`, `out/plots/` | what was said for each word, and a picture of every cut (not committed) |

The app reads the manifest in `src/lib/voice.ts`. A word with no entry (the learner's own words) falls
back to the phone's voice, as do sentences and letter names.

## How it works

1. **Read the bank.** `build.py` takes each word's `parts` and `says` straight from `src/data/bank/*.ts`.
2. **Phonemes.** Kokoro's dictionary gives the word's sounds, stress included (`sˈɛpəɹˌAt`). Where the
   dictionary picks a reading the bank does not mean, `overrides.json` has the last word.
3. **Share the sounds out.** `syllables.py` gives each beat one vowel sound and splits the consonants in
   between the way the respelling does, so `sep|uh|rayt` becomes `sˈɛp | ə | ɹˌAt`.
4. **Record.** [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0, voice `af_heart`) says the
   word twice: at speaking pace, and carefully.
5. **Find the boundaries.** `align.py` runs the [Charsiu](https://github.com/lingjzhu/charsiu) frame
   classifier (MIT) over the careful recording. It names the sound in every 10 ms, and a Viterbi pass
   pins each known sound to its stretch of audio.
6. **Cut.** The recording is cut where one beat's last sound meets the next beat's first. Silence at the
   edges of a piece is trimmed, the cut ends get a 4 ms fade, and a very quiet beat is lifted by at most
   6 dB. Everything is encoded as 64 kbps AAC.

Two details worth knowing:

- **A consonant that belongs to both beats** (`ad|dres`, `spat|chuh`) is cut through its middle, so the
  first beat closes on it and the second opens with it.
- **A beat that opens with a stop** (p, t, k, b, d, g, ch, j) has a moment of near silence in front of
  it. The cut is moved to the bottom of that dip, which is more exact than the aligner on a weak vowel.
- **A lazy vowel that melts into the next sound** (the "uh" of `sep|uh|rayt` is really an r-coloured
  blur) takes the whole melted stretch, and the next beat starts half way into it.

## Running it

Python 3.12, ffmpeg on the path, about 2 GB of downloads the first time, no GPU needed.

```bash
python3.12 -m venv venv
venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
venv/bin/pip install -r requirements.txt
```

```bash
venv/bin/python build.py --plots          # every word, about 15 minutes on four cores
venv/bin/python build.py separate rhythm  # only these
```

Recordings are cached in `out/cache`, so a second run only redoes the cutting.

## After adding or changing a word

Run `build.py <word>` and read its line in the output:

```
separate   sep|uh|rayt   sˈɛp|ə|ɹˌAt   [405, 102, 525]   [short: uh=50ms]
```

- **FAILED … n vowel sounds for m beats**: the dictionary's reading has a different number of beats from
  the bank (`ath|leet` against "ath-uh-leet"). Add the reading you want to `overrides.json`.
- **`[vowel: …]`**: a beat's vowel does not fit its respelling. Usually harmless (a full vowel against a
  lazy one). Sometimes it is the wrong word: the adjective for the verb, as `separate` was.
- **`[thin: …]`**: a vowel that lasts under 35 ms. Harmless inside "-ble" or next to an r, where the
  vowel really is that brief. At the start of a word it means the voice swallowed the vowel, as it did
  the "eye" of `itinerant`; a `ˌ` in front of the vowel in `overrides.json` brings it back.
- **`[weak: …]`**: the aligner was unsure of a sound. Open `out/plots/<word>.png` and check that the green
  cut lines sit where the picture changes.
- **`[short: …]`**: a beat under 90 ms. That is how long the sound is inside the word. If it is too
  short to hear, lower `CAREFUL` in `build.py` (everything is then said more slowly) and rebuild.

Overrides use Kokoro's own phoneme letters: `A` ay, `I` eye, `O` oh, `W` ow, `Y` oy, `ᵊ` the vowel in
"-ble", `T` the soft t of "butter", `ˈ` and `ˌ` before a stressed vowel. Print any word's dictionary
reading with:

```bash
venv/bin/python -c "import build; print(build.pipe().g2p('separate')[0])"
```

Commit `assets/voice`, `src/data/voice.ts` and `lengths.json` together.
