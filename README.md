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

- **Tilt and sky-writing** use the accelerometer and gyroscope. Simulators and browsers have neither, so those games fall back to dragging a finger.
- **Voice input** uses a native module that Expo Go does not include. Make a development build with `npx expo run:ios` for the microphone; everywhere else the app falls back to typing.

Checks: `npx tsc --noEmit` and `npx eslint src`.

## The design rules

1. **Icons and gestures carry the interface.** Words on screen are learning content, story lines, or labels of two or three words. No instruction sentences, no captions under buttons. Every icon-only control has a screen-reader label.
2. **Feedback is felt, not read.** Root's reaction, colour, sound and vibration say how it went.
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

There are six places (Garden, Orchard, Market, Lantern Woods, Harbor, Summit), then the valley carries on. Each place is a chapter of nine stops: five new words, a Find round, a Spell round, a chest, and a challenge that mixes the chapter's words. Finishing the last stop lifts the fog and plays the next story beat. Story text is in `src/data/story.ts`.

Reasons to come back: a daily goal (one, two or three stops), a streak with freezes bought with gems, three daily quests, badges with tiers, chests, and reminders that say something specific and never guilt.

## The lesson: one new word, many senses

| Step | Sense | What happens |
| --- | --- | --- |
| Hear | hearing, touch | The word, then each beat. The phone hums every beat. |
| Link | meaning, picture | What the word sits with, and a picture the learner picks as their own hook. |
| Beats | touch, rhythm | Drum one tap per syllable. |
| Build | sight, logic | Tap the pieces into order. A wrong piece says why it does not fit. |
| Move | movement | Trace with a finger, roll a marble by tilting the phone, or write the letters in the air. |
| Spell | recall | Type it or write it. The letter that is off is highlighted. |
| Use | meaning | Fill the gap in a sentence, then say or type your own. |

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
| Trace · Marble · Sky writing | Spell | The same letters with a finger, by tilting the phone, or in the air. |

## Root, the companion

Root is a character in the interface, not a picture on a screen. It peeks over cards, perches on them, watches exercises from a corner and reacts to what happens (`src/components/Buddy.tsx`, driven by `buddy.react(...)` from `src/lib/buddy.ts`). It never moves while someone is answering. *You › Sound and feel* sets it to Lively, Calm or Off.

The character is animated, not a still image: Root is a 3D model built, posed and animated in Blender from code, and the 33 clips the app plays (walk, wave, jump, peek, dance, …) are rendered from it as sprite sheets and stepped on the UI thread (`src/components/Sprite.tsx`). The scripts are in `tools/mascot`; `render_all.sh` re-renders everything. The story islands and the chest are generated illustrations.

Celebrations, effects and sounds are in `src/components/fx.tsx`, `src/components/rewards.tsx` and `src/lib/sfx.ts`. `/lab` (linked from *You › Moderator*) is a gallery of all of it.

## The Finder

The orange button in the tab bar: "I know the word, I just can't get it." Describe the word, or type how it sounds, and Root offers candidates to hear, see and save. Saved words go to the front of the queue.

The first time, Root asks whether it may search online. If yes, it uses the free Datamuse API (`api.datamuse.com`): no key, no account. **The only things sent are the text typed in the Finder and an optional first letter.** If no, or when offline, the same search runs over Root's own word bank on the phone. The choice can be changed in *You › Sound and feel*.

## Where things are

| What | Files |
| --- | --- |
| Setup and placement | `src/app/onboarding/*` |
| Journey, story | `src/app/(tabs)/index.tsx`, `src/app/story/[which].tsx`, `src/components/journey/*` |
| Lesson | `src/app/mission/[id].tsx`, `src/components/mission/*` |
| Games and the runner | `src/components/games/*`, `src/components/play/*`, `src/app/play/*` |
| Arcade, Garden, Finder, word page | `src/app/(tabs)/practice.tsx`, `src/app/(tabs)/words.tsx`, `src/app/finder.tsx`, `src/app/word/[id].tsx` |
| You, badges, your map, settings | `src/app/(tabs)/you.tsx`, `src/app/badges.tsx`, `src/app/insights.tsx`, `src/app/settings/*` |
| State, learner model, journey, rewards | `src/lib/store.ts`, `src/lib/engine.ts`, `src/lib/journey.ts`, `src/lib/rewards.ts` |
| Words and matching | `src/data/schema.ts`, `src/data/bank/*`, `src/lib/lexicon.ts`, `src/lib/finder.ts` |
| Companion, effects, rewards, sound | `src/components/Buddy.tsx`, `src/components/fx.tsx`, `src/components/rewards.tsx`, `src/lib/buddy.ts`, `src/lib/sfx.ts` |
| Mascot | `src/components/Mascot.tsx`, `assets/mascot/*`, `tools/mascot/*` |
| Pads and sensors | `src/components/learn.tsx`, `src/lib/motion.ts`, `src/lib/audio.ts` |
| Reminders | `src/lib/checkins.ts`, `src/components/CheckInEditor.tsx` |

## What is simulated, and what is not verified

- **Accounts.** There is no server. Everything is stored on the device; Backup moves it by copy and paste.
- **Part audio.** Speech is synthesized on the device. Whole words are accurate; single beats are a best effort from the respelling, and borrowed words (bourgeois, zeitgeist) are approximate.
- **The hum on iPhone** is a fast run of soft ticks, because the haptics API has no continuous buzz. Android gets a true buzz.
- **Finger writing** is checked by eye against the word. Typed spelling is checked letter by letter.
- **Sky writing** is checked loosely on purpose (distance travelled and coverage of the letter's box), not by recognising the shape.
- **The learner model** is a simple one: a level per strand and five memory boxes. Its constants were tuned against simulated learners (40%, 65% and 85% right first time), not real ones. A learner who struggles and skips warm-ups will still build up a backlog, because the path keeps offering five new words a chapter; the Journey's main button offers a warm-up first when a lot is due, but nothing is ever blocked.
- **Not yet watched in motion by a person:** the clips were checked frame by frame and run on web and the iOS simulator, but loop smoothness and timing have not been judged by eye on a phone.
- **Not yet checked on a device:** tilt and gyroscope directions, the feel of the hum, whether the sounds are audible and well balanced, the microphone, and notifications. Android has not been run.

*You › Moderator* can jump a day ahead (to walk a word to rooted in one sitting), make the mic miss once, redo the placement, add gems, and reset everything.
