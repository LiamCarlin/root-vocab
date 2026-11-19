# Root

A word app for people with dyslexia. Root trains three things:

| Strand | What it is | Colour |
| --- | --- | --- |
| **Know** | Vocabulary: what a word means and what it sits with | periwinkle |
| **Find** | Word recall: getting a word you know off the tip of your tongue | pink |
| **Spell** | Spelling, one tricky beat at a time | mint |

It teaches general English vocabulary (about 300 words in six levels, plus any word the learner looks up) with Orton-Gillingham ideas: structured, cumulative, multisensory and diagnostic. What the learner does day to day, what they like and what they want to get better at flavour the examples and the order words arrive in. They never limit the words.

It reads nothing from your email or other apps. Everything it knows comes from what you do inside it.

Built with Expo SDK 58, Expo Router and TypeScript.

## Run it

```bash
npm install
npx expo start
```

Press `i` for the iOS simulator, `a` for Android, `w` for the browser, or scan the QR code with Expo Go.

Two things need a real phone:

- **Tilt and shake** use the accelerometer. Simulators and browsers have none, so the marble run falls back to dragging on the board and the sand tray to its Smooth button.
- **Voice input** uses a native module that Expo Go does not include. Make a development build with `npx expo run:ios` for the microphone; everywhere else saying a word is taken on trust, and written answers are typed.

Checks: `npx tsc --noEmit` and `npx eslint src`.

## The design rules

1. **Icons and gestures carry the interface.** Words on screen are learning content, story lines, or labels of two or three words. No instruction sentences, no captions under buttons. Every icon-only control has a screen-reader label.
2. **Feedback is felt, not read.** Root's picture, colour, sound and vibration say how it went.
3. **Each syllable keeps its colour** everywhere the word appears. Each strand keeps its colour too.
4. **Nothing blocks.** Every step can be skipped, spelling never gates progress, and every sensor has a touch fallback.
5. **Built for dyslexia.** No timer or countdown is ever shown (answer time may be measured silently). A wrong spelling points at the letter or beat, never red-pens the word. Replay and slow audio are always there. Text is left-aligned, never italic, never all caps in body text. Typeface, size, letter spacing and background are the learner's choice.

Tokens live in `src/theme/tokens.ts`; the kit is `src/components/ui.tsx`.

## How Root learns the learner

Setup is short: a name (optional), what your days look like, what you like, what you want. Then a **placement** of a few minutes, with no timer, takes a handful of words through each strand and sets a starting level for each.

After that every answer in every game updates four things (`src/lib/store.ts`, `src/lib/engine.ts`):

- **A level per strand**, 1.0 to 6.9. The placement, and any word Root has not taught yet, move it quickly by how surprising the answer was. For words Root has taught, practice alone does not raise it: the level rises a little each time a word at or above it reaches box 3 on that strand (more if it got there cleanly), and falls a little on an outright miss of a well-known word. Know and Find use how common the word is; Spell uses how hard it is to spell, which is a separate number ("necessary" is common, and hard to spell).
- **A memory box per word, per strand**, 0 to 4. A right answer on a strand that is due moves the word up a box, and it comes back after 1, 3, 7, 21, then 60 days. A right answer before it is due changes nothing; a right answer with a cue holds it where it is; a miss moves it down and brings it back tomorrow. A box moves up at most once a day. A word is **rooted** when all three strands reach box 3. Rounds are built from whatever is most overdue first, across all three strands.
- **Spelling patterns.** Every bank word names its one tricky beat and which of 16 patterns it is (double letters, silent letters, lazy vowels, ei or ie, …). Root keeps a score per pattern, so it knows that someone is solid on lazy vowels and shaky on double letters.
- **Counters** for quests, badges and the streak.

**Which word comes next** (`pickNewWords`): words the learner looked up themselves come first, then words missed in the placement. After that, bank words are ranked by how close they sit to just above the learner's levels (weighted toward the strands they chose as goals), with a boost for their interests, a smaller one for their kind of day, and a boost for spelling patterns they are weak on. A chapter avoids repeating one pattern five times.

*You › Your map* shows all of this: the three levels, the patterns being worked on and the strong ones, and the next words.

## The journey and the story

The valley grows words. A fog called **the Hush** has rolled in, and words slip away just as you reach for them. Every word rooted clears a little.

There are six places (Garden, Orchard, Market, Lantern Woods, Harbor, Summit), then the valley carries on. Each place is a chapter of ten stops and ten new words: five word sets, a Find round, a Spell round, a hands-on round, a chest, and a challenge that mixes the chapter's words.

**A learn stop teaches two words, not one.** Where it can, the pair shares a spelling pattern, so the pattern is met twice in a row in two different words. The stop runs the first word's lesson, a short bridge, the second word's lesson, and then one step that mixes the two and has the learner pull each back out from its meaning. A word is recorded as soon as its own lesson ends, so a stop left half-way picks up at the second word.

The story is told a page at a time, each page a short passage shown whole: a six-page prologue, a four-page opening and a four-page ending for every place, and one more line on the trail after every word set. Each ending also names, in a sentence, the part of the method that made the words stick. Story text is in `src/data/story.ts`. Clearing a place gives back a keepsake (watering can, fruit basket, bunting, lantern, compass, telescope), each with its own picture.

Reasons to come back: a daily goal (one, two or three stops), a streak with freezes bought with gems, three daily quests, badges with tiers, chests, and reminders that say something specific and never guilt.

## The lesson: one new word, many senses

Root follows Orton-Gillingham practice: every word goes in through several senses at once, in a fixed order, in small steps, with the learner saying and writing as well as seeing and hearing.

| Step | Sense | What happens |
| --- | --- | --- |
| Hear | hearing, touch, speech | The word, then each beat. The phone hums every beat. Then it is the learner's turn: hold the button and say it back. |
| Link | meaning, picture | What the word sits with, and a picture the learner picks as their own hook. |
| Beats | touch, rhythm | Tap one key for every beat, left to right, then sweep across them to blend the beats back into the word. |
| Build | sight, logic | Tap the pieces into order. A wrong piece says why it does not fit. |
| Move | movement | Trace each letter, roll a marble along the letters by tipping the phone, or write the word in sand from memory. |
| Spell | recall | Type it or write it. The letter that is off is highlighted. |
| Use | meaning | Fill the gap in a sentence, then say or type your own. |

### The hands-on pads

All five are in `src/components/hands`. They share one look: a single rounded surface that takes the touch, the word across its top with a colour under each beat, and one short line beneath saying what to do right now. Nothing on a pad moves unless the learner moves it.

| Pad | The classroom technique it comes from | How it works here |
| --- | --- | --- |
| **Trace** | Tracing a letter while naming it. | Every letter is drawn as real pen strokes (`src/lib/glyphs.ts`): the finger starts at the dot and follows the arrow, stroke by stroke, the way the letter is written. One beat at a time so the letters are big. Ink fills in behind the finger; a soft tick on the stroke, one firm buzz off it. Each finished letter is named, each finished beat is said. Anyone who cannot drag accurately can switch to touching each letter. |
| **Marble run** | Large-muscle movement: forming the letter with the whole arm. | The same strokes are grooves in a board and a marble runs along them. Tipping the phone moves it; it cannot leave the groove or roll back. "Level" is however the phone is held when the board appears, with a button to reset it and a small spirit level showing the tip. |
| **Sand tray** | Writing in a tray of sand with one finger. | The word lies written in the sand. A shake of the phone (or the Smooth button) wipes it; the learner writes it from memory with fine ticks under the fingertip for grain; then the word comes back above the tray and the learner checks their own writing against it. |
| **Tap and sweep** | Finger tapping: one finger per sound, then a sweep to blend. | One key per beat, tapped in order; each says and hums its beat. Then a handle slides under all the keys and the whole word is said. |
| **Echo** | "My turn, your turn." | Root says a beat, the learner holds the button and says it back while it hums in the hand, then the next beat, then the whole word. Where the phone can listen it checks the word; where it cannot, saying it is enough. |

There is no sky-writing any more. Steering a cursor by waving the phone was hard to control and the letter it left was not one anybody had written.

## The games

Every exercise is in the registry at `src/components/games/index.ts`. The runner (`/play`) and the arcade (Practice tab) both read from it.

| Game | Strand | What you do |
| --- | --- | --- |
| Tip of tongue | Find | Get the word from a clue. When it will not come, a ladder of cues gives a little more each time: how many beats, then the first beat, then more. Spelling does not count here. |
| Fill the gap | Find | Find the word that fits the sentence. |
| Word web | Know | Pick what belongs with the word. |
| Same or opposite | Know | Decide how two words relate. |
| Meaning | Know | Pick the meaning. |
| Look, cover, write | Spell | Look, Root covers it, write it from memory, check. |
| Missing piece | Spell | Pick the piece that completes the tricky beat. |
| Spot it | Spell | Pick the right spelling from likely wrong ones. |
| Hear and write | Spell | Hear it and write it. |
| Unscramble | Spell | Put the beats in order. |
| Tap and sweep · Trace · Marble run · Sand tray | Spell | The hands-on pads above, on any word. |
| Echo | Find | Say the word back, beat by beat. |

The hands-on games are supported practice (the word is in front of the learner), so finishing one counts as right-with-help, never as recall. A hands-on round on the journey runs all five, each on a different word of the chapter.

## Root, the mascot

Root is a still picture, never an animated character: it does not walk in, pop up or fidget. What makes it part of the experience is that there is a picture of Root for almost everything it does with the learner, and the picture on screen is always the one that fits.

- **33 poses.** Waving, cheering, thinking, thumbs up, holding a trophy, having an idea, getting it wrong, surprised, asleep, reading, searching with a magnifying glass, writing, listening on headphones, calling out, tracing a letter, tapping, holding a marble, carrying a lantern, a map, a watering can, a backpack, shivering in the fog, looking through a telescope, holding a compass, carrying a basket of fruit, hugging a heart, proud, laughing, calm, sitting, pointing, running and peeking over an edge.
- **In lessons and exercises** Root stands in the corner doing what the step is about (headphones on Hear, tapping on Beats, a pencil on Spell, a magnifying glass on Spot it). When an answer lands its picture changes for a moment: pleased when it is right, a wince when it is not, then straight back. It hears this from the sounds and buzzes the app already makes (`src/lib/buddy.ts`), so no screen has to tell it.
- **On cards** Root peeks over the top edge with its hands on it, or sits on it with its legs over the front.
- **In the story** every page has its own pose.
- *You › Sound and feel › Show Root* hides Root in corners and on cards.

All the artwork is generated illustration in one soft-clay style: the character sheets, the six story islands and the whole-valley island, the chest and gem, the six keepsakes, and the small objects that mark each kind of stop on the journey (sprout, magnifying glass, pencil, sand tray, flag, book). The source sheets are in `tools/mascot/originals`. `tools/mascot/cut.py` cuts every figure out of its white sheet and writes `assets/mascot/<pose>.webp`, the object pictures in `assets/props`, `assets/scenes/valley.webp` and the manifest `src/components/mascotStills.ts`; `tools/mascot/icons.py` makes the app icon and favicon from the close-up portrait and the splash picture from the waving Root. To add a pose, put its sheet in `originals`, add a line to `POSES` in `cut.py`, run both, and look at `tools/mascot/contact.jpg`. `src/components/Mascot.tsx` draws a pose; `src/components/Buddy.tsx` places it (Peek, Perch, Figure, Companion).

Effects and sounds are in `src/components/fx.tsx`, `src/components/rewards.tsx` and `src/lib/sfx.ts`. `/lab` (linked from *You › Moderator*) is a gallery of every picture and effect.

## The Finder

The orange button in the tab bar: "I know the word, I just can't get it." Describe the word, or type how it sounds, and Root offers candidates to hear, see and save. Saved words go to the front of the queue.

The first time, Root asks whether it may search online. If yes, it uses the free Datamuse API (`api.datamuse.com`): no key, no account. **The only things sent are the text typed in the Finder and an optional first letter.** If no, or when offline, the same search runs over Root's own word bank on the phone. The choice can be changed in *You › Sound and feel*.

## Where things are

| What | Files |
| --- | --- |
| Setup and placement | `src/app/onboarding/*` |
| Journey, story | `src/app/(tabs)/index.tsx`, `src/app/story/[which].tsx`, `src/components/journey/*` |
| Lesson | `src/app/mission/[id].tsx`, `src/components/mission/*` |
| Hands-on pads, letter strokes | `src/components/hands/*`, `src/lib/glyphs.ts`, `src/lib/motion.ts` |
| Games and the runner | `src/components/games/*`, `src/components/play/*`, `src/app/play/*` |
| Arcade, Garden, Finder, word page | `src/app/(tabs)/practice.tsx`, `src/app/(tabs)/words.tsx`, `src/app/finder.tsx`, `src/app/word/[id].tsx` |
| You, badges, your map, settings | `src/app/(tabs)/you.tsx`, `src/app/badges.tsx`, `src/app/insights.tsx`, `src/app/settings/*` |
| State, learner model, journey, rewards | `src/lib/store.ts`, `src/lib/engine.ts`, `src/lib/journey.ts`, `src/lib/rewards.ts` |
| Words and matching | `src/data/schema.ts`, `src/data/bank/*`, `src/lib/lexicon.ts`, `src/lib/finder.ts` |
| Companion, effects, rewards, sound | `src/components/Buddy.tsx`, `src/components/fx.tsx`, `src/components/rewards.tsx`, `src/lib/buddy.ts`, `src/lib/sfx.ts` |
| Mascot | `src/components/Mascot.tsx`, `assets/mascot/*`, `tools/mascot/*` |
| Shared lesson pieces, audio and haptics | `src/components/learn.tsx`, `src/lib/audio.ts` |
| Recorded words and beats | `src/lib/voice.ts`, `src/data/voice.ts`, `assets/voice/*`, `tools/voice/*` |
| Reminders | `src/lib/checkins.ts`, `src/components/CheckInEditor.tsx` |

## What is simulated, and what is not verified

- **Accounts.** There is no server. Everything is stored on the device; Backup moves it by copy and paste.
- **Voices.** Bank words and their beats are recordings by one neural voice (`tools/voice`). Each beat is its own recording of the voice saying just that beat, the way a teacher sounds out "jen", "yoo", "in", rather than a slice of the word. Sentences, meanings, letter names and the learner's own words are still spoken by the phone, so two voices can be heard on one screen, and the beats of a learner's own word are a best effort from its spelling.
- **The hum on iPhone** is a fast run of soft ticks, because the haptics API has no continuous buzz. Android gets a true buzz.
- **Finger writing** (the sand tray, and the finger option in Spell) is checked by the learner, by eye, against the word. Nothing reads handwriting. Typed spelling is checked letter by letter.
- **Tracing** checks that the finger travels each stroke from its start to its end within a finger's width. It does not judge how neat the line is.
- **Echo** checks the whole word only, and only where speech recognition exists (a development build, or a browser). The beat-by-beat turns are taken on trust everywhere.
- **The learner model** is a simple one: a level per strand and five memory boxes. Its constants were tuned against simulated learners (40%, 65% and 85% right first time), not real ones. A learner who struggles and skips warm-ups will still build up a backlog, because the path keeps offering ten new words a chapter; the Journey's main button offers a warm-up first when a lot is due, but nothing is ever blocked.
- **Checked in a browser only:** the hands-on pads, the two-word lesson and the story were run at phone size in a desktop browser, with a script moving the pointer along the real letter strokes. That exercises the touch paths and the marble's drag-to-tip fallback.
- **Not yet checked on a device:** tilt direction and how fast the marble feels, the shake that smooths the sand, the grain and the hum under a finger, whether the sounds are audible and well balanced, the microphone, and notifications. Android has not been run.

*You › Moderator* can jump a day ahead (to walk a word to rooted in one sitting), make the mic miss once, redo the placement, add gems, and reset everything.
