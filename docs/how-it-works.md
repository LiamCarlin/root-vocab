# How Root works

The detail behind the prototype: the design rules, the learner model, the journey, the lesson, the games and where each part is in the code. The short version is in the [README](../README.md).

## Hosting

**dhvanshah.com/root** is copied into that site's static folder by `npm run web:portfolio -- ~/projects/dhvan` (`tools/web/portfolio.mjs`). It builds the app for `/root/app/` and writes the phone-frame page (`tools/web/frame.html`) to `/root`; the portfolio is then deployed as usual. Nothing else in the portfolio changes, apart from a three-line guard in its `index.html` that sends a reloaded inner page of the app back to `/root/`.

**GitHub Pages:** `.github/workflows/deploy-web.yml` builds and publishes on every push to `main`. One-time setup in the GitHub repo: *Settings › Pages › Build and deployment › Source: GitHub Actions*.

The rest of this file is the detailed reference for the design and the code.

## The design rules

1. **Icons and gestures carry the interface.** Words on screen are learning content, story lines, or labels of two or three words. No instruction sentences, no captions under buttons. Every icon-only control has a screen-reader label.
2. **Feedback is felt, not read.** Root's picture, colour, sound and vibration say how it went.
3. **Every colour has one job, and shape says what can be pressed.** A confident blue is the button to press (the main button, the play and microphone buttons, the active tab); black is text and what is selected in a set of options; orange is Root and "you are here"; green is right or done; yellow is "look here"; periwinkle is the one accent, for Root's world (the chapter card, story, celebrations, your profile) and your progress (level rings and progress bars in a deeper indigo); there are no other accent colours. Games, strands and topics share the accent's pale wash and are told apart by icon and name. Anything pressable has an edge (an outline, or a lip under it); anything only to read has none, and tags are square-cornered, never pills. Syllables are split by a dot and by two sand shades used for nothing else. No drop shadows, confetti or 3D buttons, and corners are kept tight. Light backgrounds only for now. The full rules are at the top of `src/theme/tokens.ts`.
4. **Nothing blocks.** Every step can be skipped, spelling never gates progress, and every sensor has a touch fallback.
5. **Built for dyslexia.** No timer or countdown is ever shown (answer time may be measured silently). A wrong spelling points at the letter or beat, never red-pens the word. Replay is always there; slower speech is a setting. Text is left-aligned, never italic, never all caps in body text. Typeface, size, letter spacing and background are the learner's choice.

Tokens live in `src/theme/tokens.ts`; the kit is `src/components/ui.tsx`.

## How Root learns the learner

Setup is short: a name (optional), what your days look like, what you like, what you want. Then a **placement** of a few minutes, with no timer, takes a handful of words through each strand and sets a starting level for each.

After that Root watches what the learner does and keeps a model of them, **the mind** (`src/lib/mind.ts`). It is trained on the phone, one answer at a time, and it does three jobs.

### 1. It guesses

Before every answer the model predicts how likely this learner is to get this word right, in this game, right now. The learner's level and the word's difficulty go in as they are. Everything else is a weight the model learns for this one person:

| Weight | What it learns |
| --- | --- |
| a correction per strand | where the placement got them wrong |
| one per game | recognising a meaning is easier than recalling a word; how much easier, for them |
| one per spelling pattern | 16 patterns: solid on lazy vowels, shaky on double letters |
| one per topic | topics they already know a lot about |
| time of day, and how far into a round | when they are sharp, and how they tire |
| memory | how well a taught word holds, by its box and by how overdue it is |

Then the answer comes in and the model moves every weight a little towards what happened. The guess it made is kept beside the answer, so its record is honest: *You › What Root knows* shows how often it called the answer correctly.

### 2. It observes

| Signal | Where it comes from | What it is used for |
| --- | --- | --- |
| Right, right with help, missed | every game | all of the above |
| How long the answer took | every game, measured silently | a word that came at once can wait longer; one that had to be dug for comes back sooner, even though it was right |
| Cues, second looks, replays, slower speech | the cue ladder, Look-cover-write, the audio buttons | right-with-help; how the learner likes to take a word in |
| The letters that were off | anything typed | a fingerprint of their spelling: neighbours swapped, letters dropped or added, doubles, vowel mix-ups, mirror letters (b for d), sound-alike letters, whether the slip was at the start, middle or end, and whether it still sounded right |
| How a word came out when said aloud | Echo, and the Use step | a word that came out wrong comes back to be said again |
| Time and trouble on each lesson step | the lesson | whether the words were within reach |
| Reading pace | story pages | shown on the map |
| Skips, rounds left half-way | the runner | the clearest sign something was too much |
| What they choose to do | look-ups in the Finder, word pages opened, pictures picked, their own sentences, games picked in the arcade | what they want words for |
| Every button press, by the button's name | the kit's buttons | a count of what gets used. Answer options are counted as "Answer", never by their text |

Small signals (a tap, a replay) are buffered and handed over with the next answer, so a tap never costs a write to storage (`src/lib/signals.ts`).

### 3. It steers

- **Which words come next** (`pickNewWords`, `pickSet`). Words the learner looked up come first, then words missed in the placement. After that every bank word is scored. *Reach*: it should sit just past what they can do, which is the level the model reads for them plus `stretch`, a number that climbs while answers come easily and quickly and drops when they do not (a miss pulls back more than a hit pushes, so it settles where about 82% of answers are right). A topic they know well makes its words count as easier, so harder ones are picked there. *Use*: words from what they said they like, what their days are made of and what they have chosen to look at, words that come with a sentence from their own world, and the more everyday word when all else is equal. *Need*: spelling patterns they are weak on. When things are going badly, a set is one stretching word and one comfortable one.
- **When** (`prepareStop`). The words for a stop are chosen at the moment it is opened, not when the chapter was laid out. The path shows what a stop is, not which words it will hold.
- **Whether to teach it at all** (`shouldProbe`, the **Know it?** check). If the model thinks the learner already has a word, the lesson opens with two questions: what it means, and how it is spelled from hearing it. Both right first time and the word is rooted on the spot, the stop gets a harder one, and the target moves up. The learner can ask for the check on the first step of any new word. Nothing is lost by trying.
- **How long to wait** (`gapFor`). Words come back after 1, 3, 7, 21, then 60 days, times the learner's own multiplier: it grows while reviews on their due day keep succeeding and shrinks when they do not, aiming at 85%.
- **Which game** (`buildSession`). For each word due, the model guesses how every game it can play would go, and picks the one nearest the chance the round should aim at: easier formats (picking) when things are going badly, harder ones (recalling, writing) when they are going well. Games that work on the learner's own kind of slip are pulled forward.
- **How long a round is** (`spanShift`). Shorter when accuracy falls away late in a round or rounds get abandoned, longer when it holds.
- **The level itself** (`levelDrift`). When the model has been sure for a while that a level is off by half a level or more, part of the correction is handed to the level. A placement that got someone wrong is put right for good.

The older parts are still there underneath: **a memory box per word, per strand**, 0 to 4 (a right answer on a strand that is due moves the word up a box; a right answer before it is due changes nothing; a cue holds it; a miss moves it down and brings it back tomorrow; a box moves up at most once a day; a word is **rooted** when all three strands reach box 3), and **a level per strand**, 1.0 to 6.9, which rises a little each time a word at or above it reaches box 3.

*You › What Root knows* shows all of it: the three levels, what the model has noticed and is acting on ("Swaps neighbours", "Long memory", "In the evening", "Spells by ear"), the patterns being worked on and the strong ones, and the likely next words. If Root is adapting to something, it is on that page.

### Does it work?

`npx tsx tools/sim/run.ts` runs the same functions the app uses against three made-up learners whose true level is known: one placed two levels too low, one placed two levels too high, and one who is strong on meaning, weak on spelling and trips on double letters. It prints the difficulty of the words each is given day by day, how often their reviews succeed, and how wrong the model's guesses are in the first ten days against the last ten. The words should move towards the true level, the guesses should get better, and the weak pattern should be found. They do. It is a check on the arithmetic, not on people: only real use will say how well the weights transfer.

## The journey and the story

The valley grows words. A fog called **the Hush** has rolled in, and words slip away just as you reach for them. Every word rooted clears a little.

There are six places (Garden, Orchard, Market, Lantern Woods, Harbor, Summit), then the valley carries on. Each place is a chapter of nine stops and five new words: five lessons of one word each, a Find round, a Spell round, a hands-on round, and a challenge that mixes the chapter's words. The path shows what each stop is. Which words a set holds is decided when the learner gets there.

**One bubble per word.** Every learn stop on the path teaches exactly one word, so each word learned is its own green bubble with a tick and the word beside it; an upcoming one says **New word**. Its five steps run, then the end screen. Before a word's lesson there may be the two-question **Know it?** check (see above). A path saved by an earlier version, when a stop taught two words, is split into one bubble per word the next time the journey opens (`splitStops` in `src/lib/journey.ts`).

The story is told a page at a time, each page a short passage shown whole: a two-page prologue, a two-page opening and a two-page ending for every place (the longer drafts are still in the file, but only the first and last page of each are shown), and one more line on the trail after every word set. Each ending also names, in a sentence, the part of the method that made the words stick. Story text is in `src/data/story.ts`. Clearing a place gives back a keepsake (watering can, fruit basket, bunting, lantern, compass, telescope).

The learner's own words are part of it: after each set, the trail line ends with the words they have just learned turning up in the place ("ladder" and "harvest" are carved into the ladder).

Reasons to come back: a daily goal (one, two or three stops, shown as the ring marked *today* beside Start), a streak, and badges with tiers.

### What gems are for

Gems are earned in lessons and rounds and spent on the streak, from the streak sheet (tap the flame or the gem count on the journey):

- **Streak freeze.** Covers one missed day. Two held at most.
- **Mend a streak.** For two days after a streak of three or more breaks, gems cover the days that were missed.

When a button is off, the line above it says why ("You need 200 gems and have 40").

## The lesson: one new word, many senses

Root follows Orton-Gillingham practice: every word goes in through several senses at once, in a fixed order, in small steps, with the learner saying and writing as well as seeing and hearing.

| Step | Sense | What happens |
| --- | --- | --- |
| Hear | hearing, touch, speech | The word, then each beat. The phone hums every beat. Then it is the learner's turn: hold the button and say it back. |
| Link | meaning, picture | What the word sits with, and a picture the learner picks as their own hook. |
| Move | movement | Trace each letter, roll a marble along the letters by tipping the phone, or write the word in sand from memory. All three go one beat at a time. One of the three per word, rotating from word to word. |
| Spell | recall | Type it on the phone's keyboard, with autocorrect off. The letter that is off is highlighted in yellow, with the word's spelling trick. |
| Use | meaning | Fill the gap in a sentence. (A learner's own word, which has no sentence, asks for one of their own instead.) |

### The hands-on pads

All five are in `src/components/hands`. They share one look: a single rounded surface that takes the touch, the word across its top with a colour under each beat, and one short line beneath saying what to do right now. Nothing on a pad moves unless the learner moves it.

| Pad | The classroom technique it comes from | How it works here |
| --- | --- | --- |
| **Trace** | Tracing a letter while naming it. | Every letter is drawn as real pen strokes (`src/lib/glyphs.ts`): the finger starts at the dot and follows the arrow, stroke by stroke, the way the letter is written. One beat at a time so the letters are big. Ink fills in behind the finger; a soft tick on the stroke, one firm buzz off it. Each finished beat is said (letters are not named). |
| **Marble run** | Large-muscle movement: forming the letter with the whole arm. | The same strokes are grooves in a board and a marble runs along them. Tipping the phone moves it; it cannot leave the groove or roll back. "Level" is however the phone is held when the board appears, with a button to reset it and a small spirit level showing the tip. |
| **Sand tray** | Writing in a tray of sand with one finger. | One beat at a time: the beat lies written in the sand for a moment, then fades by itself; the learner writes it from memory with fine ticks under the fingertip for grain, and taps **Check**. Root reads it (`src/lib/ink.ts`): right, and the beat is said and the next one comes; a likely slip ("That looks like 'cuor'"); or could not read it. For the last two the beat is shown to compare, with **Write it again** or **Mine is right**. |
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

The hands-on games are supported practice (the word is in front of the learner), so finishing one counts as right-with-help, never as recall. A hands-on round on the journey runs all five, each on a different word of the chapter. (Tap and sweep is in the arcade and in hands-on rounds; it is no longer a lesson step.)

## Root, the mascot

Root is a still picture, never an animated character: it does not walk in, pop up or fidget. What makes it part of the experience is that there is a picture of Root for almost everything it does with the learner, and the picture on screen is always the one that fits.

- **33 poses.** Waving, cheering, thinking, thumbs up, holding a trophy, having an idea, getting it wrong, surprised, asleep, reading, searching with a magnifying glass, writing, listening on headphones, calling out, tracing a letter, tapping, holding a marble, carrying a lantern, a map, a watering can, a backpack, shivering in the fog, looking through a telescope, holding a compass, carrying a basket of fruit, hugging a heart, proud, laughing, calm, sitting, pointing, running and peeking over an edge.
- **In lessons and exercises** Root stands in the corner doing what the step is about (headphones on Hear, tapping on Beats, a pencil on Spell, a magnifying glass on Spot it). When an answer lands its picture changes for a moment: pleased when it is right, a wince when it is not, then straight back. It hears this from the sounds and buzzes the app already makes (`src/lib/buddy.ts`), so no screen has to tell it.
- **In the story** every page has its own pose.
- *You › Sound and feel › Show Root* hides Root in corners and on cards.

All the artwork is generated illustration in one soft-clay style: the character sheets, the six story islands and the whole-valley island, the chest and gem, the six keepsakes, and the small objects that mark each kind of stop on the journey (sprout, magnifying glass, pencil, sand tray, flag, book). The source sheets are in `tools/mascot/originals`. `tools/mascot/cut.py` cuts every figure out of its white sheet and writes `assets/mascot/<pose>.webp`, the object pictures in `assets/props`, `assets/scenes/valley.webp` and the manifest `src/components/mascotStills.ts`; `tools/mascot/icons.py` makes the app icon and favicon from the close-up portrait and the splash picture from the waving Root. To add a pose, put its sheet in `originals`, add a line to `POSES` in `cut.py`, run both, and look at `tools/mascot/contact.jpg`. `src/components/Mascot.tsx` draws a pose; `src/components/Buddy.tsx` places it (Peek, Perch, Figure, Companion).

Effects and sounds are in `src/components/fx.tsx`, `src/components/rewards.tsx` and `src/lib/sfx.ts`. `/lab` (linked from *You › Moderator*) is a gallery of every picture and effect.

## The Finder

The search button in the middle of the tab bar: "I know the word, I just can't get it." Describe the word, or type how it sounds, and Root offers candidates to hear, see and save. Saved words go to the front of the queue.

The first time, Root asks whether it may search online. If yes, it uses the free Datamuse API (`api.datamuse.com`): no key, no account. **The only things sent are the text typed in the Finder and an optional first letter.** If no, or when offline, the same search runs over Root's own word bank on the phone. The choice can be changed in *You › Sound and feel*.

## Where things are

| What | Files |
| --- | --- |
| Setup and placement | `src/app/onboarding/*` |
| Journey, story | `src/app/(tabs)/index.tsx`, `src/app/story/[which].tsx`, `src/components/journey/*` |
| Lesson | `src/app/mission/[id].tsx`, `src/components/mission/*` |
| Hands-on pads, letter strokes, handwriting check | `src/components/hands/*`, `src/lib/glyphs.ts`, `src/lib/ink.ts`, `src/lib/motion.ts`, `tools/sim/ink.ts` |
| Games and the runner | `src/components/games/*`, `src/components/play/*`, `src/app/play/*` |
| Arcade, Garden, Finder, word page | `src/app/(tabs)/practice.tsx`, `src/app/(tabs)/words.tsx`, `src/app/finder.tsx`, `src/app/word/[id].tsx` |
| You, badges, what Root knows, settings | `src/app/(tabs)/you.tsx`, `src/app/badges.tsx`, `src/app/insights.tsx`, `src/app/settings/*` |
| The model of the learner | `src/lib/mind.ts` (guess, observe, steer), `src/lib/signals.ts` (what gets noted), `tools/sim/run.ts` (the dry run) |
| State, word choice and rounds, journey, rewards | `src/lib/store.ts`, `src/lib/engine.ts`, `src/lib/journey.ts`, `src/lib/rewards.ts` |
| Words and matching | `src/data/schema.ts`, `src/data/bank/*`, `src/lib/lexicon.ts`, `src/lib/finder.ts` |
| Companion, effects, rewards, sound | `src/components/Buddy.tsx`, `src/components/fx.tsx`, `src/components/rewards.tsx`, `src/lib/buddy.ts`, `src/lib/sfx.ts` |
| Mascot | `src/components/Mascot.tsx`, `assets/mascot/*`, `tools/mascot/*` |
| Shared lesson pieces, audio and haptics | `src/components/learn.tsx`, `src/lib/audio.ts` |
| Recorded words and beats | `src/lib/voice.ts`, `src/data/voice.ts`, `assets/voice/*`, `tools/voice/*` |

## What is simulated, and what is not verified (detail)

- **Accounts.** There is no server. Everything is stored on the device; Backup moves it by copy and paste.
- **Voices.** Bank words and their beats are recordings by one neural voice (`tools/voice`). Each beat is its own recording of the voice saying just that beat, the way a teacher sounds out "jen", "yoo", "in", rather than a slice of the word. Sentences, meanings, letter names and the learner's own words are still spoken by the phone, so two voices can be heard on one screen, and the beats of a learner's own word are a best effort from its spelling.
- **The hum on iPhone** is a fast run of soft ticks, because the haptics API has no continuous buzz. Android gets a true buzz.
- **Finger writing** (the sand tray) is checked beat by beat by a nearest-neighbour recognizer that knows which beat to expect: the $P point-cloud recognizer (Vatavu, Anthony and Wobbrock, 2012) combined with a letter-by-letter comparison. On simulated messy writing it reads the right beat as right 87–98% of the time and catches a mirrored, swapped or missing letter 87–99% of the time, depending on how messy. It has not been tried with real learners, and lookalike letters (a/o, e/c, i/l) are deliberately not judged. A trained model (Google ML Kit's on-device digital ink recognition) would need a native build, so it would not run in the browser version. Typed spelling is checked letter by letter.
- **Tracing** checks that the finger travels each stroke from its start to its end within a finger's width. It does not judge how neat the line is.
- **Echo** checks the whole word only, and only where speech recognition exists (a development build, or a browser). The beat-by-beat turns are taken on trust everywhere.
- **The learner model** is a simple one: a level per strand and five memory boxes. Its constants were tuned against simulated learners (40%, 65% and 85% right first time), not real ones. A learner who struggles and skips warm-ups will still build up a backlog, because the path keeps offering ten new words a chapter; the Journey's main button offers a warm-up first when a lot is due, but nothing is ever blocked.
- **Checked in a browser only:** the hands-on pads, the two-word lesson and the story were run at phone size in a desktop browser, with a script moving the pointer along the real letter strokes. That exercises the touch paths and the marble's drag-to-tip fallback.
- **Not yet checked on a device:** tilt direction and how fast the marble feels, the shake that smooths the sand, the grain and the hum under a finger, whether the sounds are audible and well balanced, the microphone, and notifications. Android has not been run.

*You › Moderator* can jump a day ahead (to walk a word to rooted in one sitting), make the mic miss once, redo the placement, add gems, and reset everything.
