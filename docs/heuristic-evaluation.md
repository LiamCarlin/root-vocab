# Heuristic evaluation of Root (second round)

Evaluator: one pass over every screen of the web build at phone size (390 × 844), using Molich and Nielsen's nine heuristics (1990) and Nielsen's severity scale:

- **0** not a usability problem
- **1** cosmetic: fix if there is time
- **2** minor: low priority
- **3** major: high priority
- **4** catastrophe: must fix before release

The nine heuristics, numbered as in the table below:

1. Simple and natural dialogue
2. Speak the users' language
3. Minimize the users' memory load
4. Be consistent
5. Provide feedback
6. Provide clearly marked exits
7. Provide shortcuts
8. Provide good error messages
9. Prevent errors

Every problem rated 2 or higher has been fixed. The "Fix" column says what changed.

## Findings

| # | Where | Problem | Heuristic | Sev. | Fix |
| --- | --- | --- | --- | --- | --- |
| 1 | Settings › Backup | **Restore from code** replaced every word and all progress on the device with one tap and no warning. | 9 Prevent errors | 4 | A **Replace everything here?** sheet, which says how many words will be replaced and that this cannot be undone. The section also says so before the button. |
| 2 | End of a lesson | The ring reading **1/2** (today's goal) sat beside two just-learned words, so it read as "one of two right". The gem count and the two sprouts had no labels, and the screen had no heading. | 2 Users' language; 5 Feedback | 3 | Heading **Word learned** / **2 words learned**. Each figure is named: gems, day streak, today's goal. The unexplained sprout tile is gone. |
| 3 | Placement test, every item | No question was asked: a word with three meanings, a clue with a text box, or a sentence with a gap. | 1 Natural dialogue; 3 Memory load | 3 | Each item asks: **What does it mean?**, **What is the word? Spelling does not matter.**, **Spell the missing word**. |
| 4 | Placement test, section screen | Only "Know" and "1 / 3" with an unlabelled ▶. Nothing said what the part asks for. | 2 Users' language; 3 Memory load | 3 | It says what the part asks ("Pick what each word means.") and **Part 1 of 3**, with a labelled **Start**. |
| 5 | Lesson, Spell step | An empty box and a keyboard, with no instruction and no reminder of which word. When right, nothing said "right". | 1 Natural dialogue; 3 Memory load; 5 Feedback | 3 | Headline **Spell the word you hear** and the meaning as the clue. Then **Right**, or **Not quite. Compare the two**. |
| 6 | Practice games | A game was named ("Meaning") but never asked anything. A wrong pick faded to grey without a word, so it looked disabled rather than wrong. | 1 Natural dialogue; 5 Feedback | 3 | Each game shows its one-line task under its name ("Pick the meaning"). A wrong pick turns yellow and says **Not this one**. |
| 7 | Finder | The filters were unlabelled dots (beat counts) and a row of letters. Device-only results that missed offered no way on. **No match** gave no advice. The screen had no title, and where it searches was an unlabelled phone icon. | 2 Users' language; 8 Error messages; 6 Exits | 3 | Title **Find a word**. The **This device** / **Online** button is labelled. The filters are named (**Beats 3 4**, **Starts with**). **Search online instead** appears after device-only results. **No match** says what to try next. |
| 8 | Welcome › Restore | "Restore", "Fresh" and "On this phone" were jargon. The main button was an unlabelled ✓. Nothing said where a backup code comes from. | 2 Users' language; 3 Memory load | 3 | **I have used Root before** leads to **Bring back your words**. It says where to find the code (You › Backup › Copy backup code), with **Bring back my words** and **Start fresh instead**. |
| 9 | Restore and Backup errors | "Code not recognised", "Copy failed" and "Paste by hand" said what went wrong but not how to fix it. | 8 Error messages | 3 | Each error says what to do: copy the whole code again; press and hold the box, then choose Paste; check clipboard permission. |
| 10 | Lesson, Use step | A wrong pick only turned yellow when the word was not in the word bank. No message appeared. | 5 Feedback; 8 Error messages | 2 | Every wrong pick says **It does not fit here; try another**, plus the word's meaning when it is known. |
| 11 | Lesson, mixed step | A wrong answer was shaded red. Everywhere else a wrong answer is yellow, and red is kept for deleting things. | 4 Consistency | 2 | Yellow, like every other wrong answer. Off letters on the beat tiles changed the same way. |
| 12 | Journey path | Tapping a locked stop only wiggled it, plus a buzz that a browser cannot make. | 5 Feedback | 2 | A message: **Locked. Finish the stops before it first.** |
| 13 | Lesson, Hear step | The word was sized for the whole width but shares its row with the speaker button, so it broke mid-word ("en·cour" / "·age"). | 1 Natural dialogue | 2 | It is sized to the space beside the button, counting the beat dots, so it stays on one line. |
| 14 | Words list | Three unlabelled bars under each word (Know, Find and Spell strength), and an unlabelled orange dot for "due". | 2 Users' language | 2 | One line in words: **Growing**, **Rooted**, **To learn**, with **review today** added when due. |
| 15 | Word page | **Find** and **Spell** didn't say they start practice, and "Find" read like the search button. "Not this" and "Tomorrow" were cryptic. | 2 Users' language | 2 | **Practice this word: Find it, Spell it**. **Easy to mix up with**. **Review tomorrow**. |
| 16 | What Root knows | The level bars showed bare numbers (2 … 3). The empty state said only "Still looking". | 2 Users' language | 2 | **Level 2** and **…% right lately**. The empty state says what will appear and when. |
| 17 | Placement test, leaving | **Leave?** did not say the answers so far are lost. | 9 Prevent errors | 2 | **Leave the check?** says the answers so far are not kept, with **Keep going** and **Leave the check**. |
| 18 | Sand tray | The **Look again** label was cut off ("Look ag…"). **Check** did not say it shows the word to compare with. | 1 Natural dialogue | 2 | **Look** and **Compare**. |
| 19 | Lesson, Hear step | The respelling under each beat uses an informal scheme ("ij" for *age*). | 2 Users' language | 1 | Left as is: it is how each beat sounds, and the beat plays when tapped. |

## What already held up

- **Clearly marked exits (6).** Every lesson and round has ✕ with a **Stop for now?** sheet that says what is kept. The story has **Skip story**. Settings screens have a back arrow.
- **Shortcuts (7).** The search button sits in the middle of the tab bar, **I know it** jumps straight to a check in a lesson, **Skip and start at level 2** bypasses the placement test, and the warm-up card on the journey starts a review round.
- **Error prevention (9).** Removing a word and marking it known can both be undone. **Reset everything** asks first. Searching online asks before anything leaves the device.
- **Feedback (5).** Every lesson step's next button stays off until its task is done and says what is missing.
