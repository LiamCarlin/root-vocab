# Root's voice

Every bank word is recorded whole, and every beat of it is recorded **on its own**: the voice says just
"jen", then just "yoo", then just "in", the way a teacher sounds out "genuine". A tapped beat is a whole,
unhurried syllable with its own start and finish, not a 100 ms slice cut out of the word.

(The first version did cut the beats out of the word. They added up to the word exactly, but each one
was too quick and stopped mid-sound, so it sounded like a recording chopped up rather than a person
saying the beat.)

The phone's own voice cannot do this either. Handed a respelling such as `rayt` or `juh` it reads a
made-up word, with the wrong vowel as often as not.

What the pipeline produces:

| Output | What it is |
| --- | --- |
| `assets/voice/<word>_w.m4a` | the word at speaking pace |
| `assets/voice/<word>_s.m4a` | the word said carefully (the slow button) |
| `assets/voice/<word>_1.m4a` … | each beat said on its own, one file each |
| `src/data/voice.ts` | generated manifest: the files and their lengths, keyed by the word |
| `lengths.json` | the lengths behind the manifest, kept so one word can be rebuilt without the rest |
| `out/report.txt`, `out/plots/` | what was said for each word, and a picture of the careful recording (not committed) |

The app reads the manifest in `src/lib/voice.ts`. A word with no entry (the learner's own words) falls
back to the phone's voice, as do sentences and letter names.

## How it works

1. **Read the bank.** `build.py` takes each word's `parts` and `says` straight from `src/data/bank/*.ts`.
2. **Phonemes.** Kokoro's dictionary gives the word's sounds, stress included (`sˈɛpəɹˌAt`). Where the
   dictionary picks a reading the bank does not mean, `overrides.json` has the last word.
3. **Share the sounds out.** `syllables.py` gives each beat one vowel sound and splits the consonants in
   between the way the respelling does, so `sep|uh|rayt` becomes `sˈɛp | ə | ɹˌAt`.
4. **Say each beat alone.** `syllables.standalone` turns each share into what a person says when the beat
   stands by itself: the stress moves onto its vowel, a lazy `ə` becomes the full vowel the tile shows
   ("uh" for `uh`, "ih" for the `bih` of "believe", "ur" for `der`), the soft t
   of "butter" becomes a real t, and a consonant two beats share (`spat|chuh`) closes the first one as the
   respelling writes it. `sˈɛp | ə | ɹˌAt` becomes `sˈɛp`, `ˈʌ`, `ɹˈAt`.
5. **Record.** [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0, voice `af_heart`) says the
   word at speaking pace and carefully, and says each beat on its own at `BEAT` pace.
6. **Pick the best take of each beat.** A lone syllable is not what the voice was trained on, and it
   sometimes wanders (asked for "luh" it can say "lie"). Each beat is tried several ways (`TAKES`:
   a shorter vowel, an exclamation mark, no stress). `judge.py` runs a phoneme recogniser
   ([wav2vec2-xlsr-53-espeak-cv-ft](https://huggingface.co/facebook/wav2vec2-xlsr-53-espeak-cv-ft),
   Apache 2.0) over each take and keeps the first one heard as the beat's sounds, or else the closest.
7. **Stop a steady vowel from gliding.** Said last and alone, "uh", "ah", "aw", "ih" and the short a and e
   drift up towards "ee" ("buh" becomes "bye"). `without_glide` follows the second formant with Praat
   and fades the beat out just before it starts to climb.
8. **Stop the voice adding a vowel at the end.** Ending on its own, "sik" or "us" tends to come out as
   "sik-uh" or "us-ee". `without_tail` keeps a final k, t or p's closure and 60 ms of its burst, and ends
   a final s, f or sh where the voice switches back on.
9. **Encode.** Silence at the edges is trimmed, every clip is brought to the same peak level and
   encoded as 64 kbps AAC.

`align.py` still runs the [Charsiu](https://github.com/lingjzhu/charsiu) frame classifier (MIT) over the
careful recording. It no longer cuts anything: it finds where each beat starts inside the slow word
(`ms.at` in the manifest), so the tiles light up in time with it.

## Running it

Python 3.12, ffmpeg on the path, about 3 GB of downloads the first time, no GPU needed.

```bash
python3.12 -m venv venv
venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
venv/bin/pip install -r requirements.txt
```

```bash
venv/bin/python build.py --plots          # every word, about 15 minutes on four cores
venv/bin/python build.py separate rhythm  # only these
```

Recordings are cached in `out/cache`, so a second run only redoes the listening and encoding.

## After adding or changing a word

Run `build.py <word>` and read its line in the output:

```
spatula    spat|chuh|luh   spˈæt|ʧˈʌ|lˈʌ   [701, 593, 300]   [heard: luh~blaː]
```

- **FAILED … n vowel sounds for m beats**: the dictionary's reading has a different number of beats from
  the bank (`ath|leet` against "ath-uh-leet"). Add the reading you want to `overrides.json`.
- **`[vowel: …]`**: a beat's vowel does not fit its respelling. Usually harmless (a full vowel against a
  lazy one). Sometimes it is the wrong word: the adjective for the verb, as `separate` was.
- **`[thin: …]`**: a vowel that lasts under 35 ms. Harmless inside "-ble" or next to an r, where the
  vowel really is that brief. At the start of a word it means the voice swallowed the vowel, as it did
  the "eye" of `itinerant`; a `ˌ` in front of the vowel in `overrides.json` brings it back.
- **`[weak: …]`**: the aligner was unsure of a sound in the slow word, so a tile may light a little
  early or late. Open `out/plots/<word>.png` and check that the green lines sit where the picture changes.
- **`[heard: …]`**: no take of that beat was heard exactly as its sounds, and this is what the recogniser
  heard in the closest one (IPA). Often harmless: the recogniser hears a faint b or d at the edge of a
  clip that is not there (`blaː` for "luh"), or a final p as b. Listen to `assets/voice/<word>_<n>.m4a`.
  If it really is wrong, the beat's phonemes are on the same line; fix the word's reading in
  `overrides.json`, or add a way of saying it to `TAKES`.

Overrides use Kokoro's own phoneme letters: `A` ay, `I` eye, `O` oh, `W` ow, `Y` oy, `ᵊ` the vowel in
"-ble", `T` the soft t of "butter", `ˈ` and `ˌ` before a stressed vowel. Print any word's dictionary
reading with:

```bash
venv/bin/python -c "import build; print(build.pipe().g2p('separate')[0])"
```

Commit `assets/voice`, `src/data/voice.ts` and `lengths.json` together.
