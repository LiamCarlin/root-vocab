# Root

Root is a vocabulary app for teenagers and adults with dyslexia. This is a high-fidelity prototype for the Human-Computer Interaction course at Olin College.

## Try it

Open **[dhvanshah.com/root](https://dhvanshah.com/root)** in a web browser. You do not have to install software.

- On a computer, the app shows in a frame that is the size of a phone.
- On a phone, the app opens full screen.
- To use the microphone, use Chrome or Edge.

The app keeps your progress in that browser only.

## What Root is for

Dyslexia makes three skills difficult. Root helps with each skill:

- **Know:** learn what a word means.
- **Find:** recall a word that you know but cannot get ("it is on the tip of my tongue").
- **Spell:** spell a word, one beat (syllable) at a time.

Root teaches one word at a time, through many senses. This is the Orton-Gillingham method that dyslexia tutors use. You hear the word, say it, write it with a finger, spell it and use it. Root, a carrot, is your guide.

- **Audience:** high-school students and adults with dyslexia, and the tutors and parents who help them.
- **Use cases:** learn new words in short daily sessions; find a word that you cannot spell or recall; keep learned words from going away.
- **Platform:** a phone app for iOS and Android, held upright. The same code runs in a web browser.

## Tasks

A test participant can do each task without help.

### Task 1: Set up Root and learn a word

1. Tap **Start**.
2. On **About you**, type your name if you want to. Select your days and the topics you like. Tap **Next**.
3. On **My goals**, select your goals and the number of stops for each day. Tap **Next**.
4. On **Quick check**, tap **Start**. Answer 18 short questions. If you do not know an answer, tap **I don't know**.
   - To skip the check, tap **Skip and start at level 2**.
5. Tap **Start learning**.
6. Read the two story pages, or tap **Skip story**.
7. On the journey, tap **Start**. Each bubble on the path is one word.
8. Do the five steps of the lesson:
   1. **Hear:** listen to the word. Hold the microphone button and say the word.
   2. **Link:** listen to the words that go with it. Select a picture to help you remember it.
   3. **Move:** trace the letters, roll a marble along them, or write the word in sand. You do this one beat at a time.
   4. **Spell:** type the word on the keyboard.
   5. **Use:** select the word that completes the sentence.
9. The end screen shows the meaning of the word. Tap the arrow. The bubble on the path is now green.

If a step is not complete, its button tells you what to do (for example, **Say the word first**).

### Task 2: Find a word that you cannot recall or spell

1. Tap the search button in the middle of the bottom bar.
2. Select **Describe it** or **Sounds like**.
3. Type what the word means ("put off until later") or how it sounds ("ostentayshus").
4. The first time, select **Search online** or **This device only**.
5. Tap a result to see its meaning. Tap the speaker to hear it.
6. When you find your word, tap **That's it**. If a result is wrong, tap **Not it**.
7. Tap **Learn now** to learn the word, or **Find another**.

### Task 3: Practice the words that you learned

1. Tap the **Arcade** tab (the game controller).
2. Tap **Daily mix**, or tap one game.
3. Answer each question. The app tells you if your answer is correct. Tap **Continue**.
4. The end screen shows how many answers were correct and how each word went.

> **Note:** Learned words come back for review after some days (spaced repetition). To see this in one session, use **Next day** in the moderator tools.

## Run a usability test

Open **You › Moderator**. These tools are for test sessions and demos:

- **Next day:** move the date forward one day, so learned words come back for review.
- **Mic misses once:** the next spoken answer fails, so you can test the retry.
- **Redo placement** and **Replay setup:** do the Quick check or the setup again.
- **Add 500 gems:** test the streak freeze.
- **Reset everything:** delete all data before the next participant.

## Run it on your computer

You need Node.js 22 and npm.

```bash
npm install
npx expo start
```

- Press `w` to open the app in a web browser.
- Press `i` for the iOS simulator, or `a` for Android.
- To use a phone, scan the QR code with the Expo Go app. The phone and the computer must use the same Wi-Fi. On Linux with a firewall, use `npx expo start --tunnel`.

To check the code, run `npx tsc --noEmit` and `npx expo lint`.

## Limitations, Wizard of Oz and hard-coded parts

| Part | What is real | What is faked or fixed |
| --- | --- | --- |
| **Word bank** | About 300 words in 6 levels, each with its meaning, sentences, beats and spelling trick | Hard-coded by hand. Words from the Finder have less detail. |
| **Voice** | Each word and each beat is a recording of a neural voice | Sentences and meanings use the voice of the device. You can hear two voices on one screen. |
| **Speech recognition** | Real in Chrome, Edge and a native build | In Safari, Firefox and Expo Go it is not available. Then holding the button counts as saying the word. |
| **Handwriting** (sand tray) | Root reads each beat on the device and compares it with the correct beat and with likely slips (b for d, swapped or missing letters) | It is not a trained AI model. We tested it on simulated writing only. If it is not sure, it says so, and you can count the beat as correct. |
| **Finder** | Real search: the free Datamuse word service (online, only with your permission) or the built-in word bank | Only the text that you type is sent. |
| **How Root learns you** | Real: a level for each skill and spaced review, on the device | Tuned with simulated learners, not real ones. |
| **Accounts** | None | There is no server or login. A backup code moves your data to a different device. |
| **Gems, streaks, badges** | Work in the app | Stored on the device only. There is no real money. |
| **Story and art** | Written and drawn for Root | Fixed content. |
| **Tilt and shake** (marble run, sand tray) | Work on a real phone | In a browser, you drag on the board instead. |

We did not test the app on a real phone for haptics, tilt, sound levels or the microphone. We did not run it on Android.

## Changes after the heuristic evaluation

We fixed all problems with severity 3 and 4, and the problems with severity 1 and 2 that were easy to fix. The list of each problem and its fix is in [docs/heuristic-evaluation.md](docs/heuristic-evaluation.md). The most important changes are:

- Each screen tells you what to do. A button that is off tells you why.
- Every lesson step has a back button, and every lesson and round has a clear exit.
- Every icon button that was not clear now has a label.
- One colour has one meaning. Blue is the button to press. Green is correct or done. Yellow is "look here". Orange is "you are here".
- We removed features that did not help the three tasks: reminders, friends, the shop, the journal, chests, quests and combos.
- A lesson teaches one word, and each word is one bubble on the path.
- Restore from a backup asks you first, because it replaces all your data.

## More detail

- [How Root works](docs/how-it-works.md): the design rules, the learner model, the lesson, the games, hosting, and where each part is in the code.
- [Heuristic evaluation](docs/heuristic-evaluation.md): each problem, its severity and its fix.
