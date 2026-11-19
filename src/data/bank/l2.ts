import { w, type BankWord } from '../schema';

/**
 * Level 2 words: common. Used in ordinary adult conversation and writing, a
 * notch less frequent than level 1, and the kind that slip away mid-sentence.
 */
export const L2: BankWord[] = [
  // ── Feelings ──────────────────────────────────────────────────
  w(2, 3, 'reluctant', 're|luc|tant', 'rih|luk|tunt', 'adj', 'not wanting to do something',
    'Not keen: you will do it, but you are dragging your feet.', 'He was {reluctant} to ask for help.', {
      topics: ['feelings'], links: ['unwilling', 'hesitation', 'dragging feet', 'doubt'], not: ['sandwich', 'bicycle', 'lamp'],
      same: 'unwilling', opposite: 'eager', lookalikes: ['reliant', 'redundant'], wrong: ['reluctent', 'relucktant'],
      tricky: [2, 'ant-ent', 'It ends a-n-t. A reluctANT ANT drags its feet.'], pics: ['😒', '🐢', '🙅'],
      also: { work: 'She was {reluctant} to take on another project.' },
    }),
  w(2, 4, 'exhausted', 'ex|haust|ed', 'ig|zawst|id', 'adj', 'so tired you have nothing left',
    'Far beyond tired: completely worn out, with no energy left.', 'I was {exhausted} after the night shift.', {
      topics: ['body', 'feelings'], links: ['tired', 'worn out', 'sleep', 'drained'], not: ['pencil', 'bridge', 'salad'],
      same: 'drained', opposite: 'energetic', lookalikes: ['exalted', 'existed'], wrong: ['exausted', 'exhosted'],
      tricky: [1, 'silent', 'A silent h after the x, then a-u: ex + haust + ed.'], pics: ['😩', '😴', '🥱'],
      also: { sport: 'The whole team was {exhausted} by overtime.' },
    }),
  w(2, 4, 'anxious', 'anx|ious', 'ank|shus', 'adj', 'worried and unable to relax',
    'Worried and on edge about something that might happen.', 'I always feel {anxious} before a flight.', {
      topics: ['feelings'], links: ['worry', 'nerves', 'tension', 'stress'], not: ['spoon', 'garden hose', 'ladder'],
      same: 'worried', opposite: 'calm', lookalikes: ['noxious', 'obnoxious'], wrong: ['ankshus', 'anxous'],
      tricky: [1, 'shun', 'The “shus” sound is spelled i-o-u-s after the x: anx + ious.'], pics: ['😰', '😟', '💓'],
    }),
  w(2, 3, 'jealous', 'jeal|ous', 'jel|us', 'adj', 'unhappy because someone has what you want',
    'How you feel when a friend gets the thing you wanted for yourself.', 'She was {jealous} of her sister’s new car.', {
      topics: ['feelings', 'people'], links: ['envy', 'rivalry', 'wanting', 'resentment'], not: ['teapot', 'gravel', 'invoice'],
      same: 'envious', lookalikes: ['zealous', 'jellies'], wrong: ['jelous', 'jealus'],
      tricky: [0, 'vowel-team', 'The short “e” sound is spelled e-a, as in head and bread.'], pics: ['😒', '💚', '👀'],
    }),
  w(2, 3, 'awkward', 'awk|ward', 'awk|werd', 'adj', 'uncomfortable, clumsy or hard to handle',
    'That uncomfortable feeling when nobody knows what to say.', 'There was an {awkward} silence after his joke.', {
      topics: ['feelings', 'people'], links: ['clumsy', 'uncomfortable', 'silence', 'embarrassment'], not: ['recipe', 'tire', 'blanket'],
      opposite: 'comfortable', lookalikes: ['backward', 'onward'], wrong: ['akward', 'awkard'],
      tricky: [0, 'odd', 'w-k-w: a k squeezed between two w’s. It looks as awkward as it feels.'], pics: ['😬', '🙈', '😅'],
    }),
  w(2, 3, 'grateful', 'grate|ful', 'grayt|ful', 'adj', 'feeling thankful',
    'How you feel toward someone who has done you a real kindness.', 'I am so {grateful} for your help with the move.', {
      topics: ['feelings', 'people'], links: ['thanks', 'kindness', 'appreciation', 'favor'], not: ['gravel', 'engine', 'sock'],
      same: 'thankful', lookalikes: ['graceful', 'greatly'], wrong: ['greatful', 'gratefull'],
      tricky: [0, 'odd', 'It is “grate”, not “great”: it comes from gratitude. And one l at the end.'], pics: ['🙏', '💐', '😊'],
    }),
  w(2, 4, 'disappoint', 'dis|ap|point', 'dis|uh|poynt', 'v', 'to let someone down',
    'To let someone down by not being as good as they hoped.', 'I did not want to {disappoint} my mom.', {
      topics: ['feelings', 'people'], links: ['letdown', 'sadness', 'hopes', 'failure'], not: ['carpet', 'lemon', 'compass'],
      opposite: 'please', lookalikes: ['disappear', 'appoint'], wrong: ['dissapoint', 'disapoint'],
      tricky: [1, 'prefix', 'dis + appoint: one s from dis, two p’s from appoint.'], pics: ['😞', '👎', '💔'],
    }),

  // ── People ────────────────────────────────────────────────────
  w(2, 3, 'stubborn', 'stub|born', 'stub|ern', 'adj', 'refusing to change your mind',
    'Like a mule: will not change their mind no matter what you say.', 'He is too {stubborn} to admit he is lost.', {
      topics: ['people'], links: ['mule', 'refusal', 'strong will', 'digging in'], not: ['salad', 'window', 'receipt'],
      same: 'headstrong', opposite: 'flexible', lookalikes: ['stubbed', 'suburban'], wrong: ['stuborn', 'stubburn'],
      tricky: [0, 'double', 'Two b’s: it is stub + born.'], pics: ['🐴', '😤', '🧱'],
    }),
  w(2, 3, 'generous', 'gen|er|ous', 'jen|er|us', 'adj', 'happy to give more than is needed',
    'Gives freely: time, money, big tips and second helpings.', 'My aunt is {generous} with her time and her money.', {
      topics: ['people', 'money'], links: ['giving', 'kindness', 'sharing', 'charity'], not: ['wrench', 'puddle', 'timetable'],
      same: 'giving', opposite: 'stingy', lookalikes: ['general', 'genius'], wrong: ['genrous', 'generus'],
      tricky: [0, 'soft-cg', 'The j sound is a soft g before e, and the end is o-u-s.'], pics: ['🎁', '🤲', '💝'],
      also: { food: 'She served {generous} slices of cake.' },
    }),
  w(2, 3, 'familiar', 'fa|mil|iar', 'fuh|mil|yer', 'adj', 'known to you; seen or heard before',
    'You have seen or heard it before, so it rings a bell.', 'I am not {familiar} with this part of town.', {
      topics: ['people', 'mind'], links: ['known', 'recognition', 'memory', 'habit'], not: ['soup', 'wrench', 'glacier'],
      opposite: 'strange', lookalikes: ['family', 'similar'], wrong: ['familar', 'familier'],
      tricky: [2, 'r-vowel', 'The end is i-a-r. A famILIAR face has “liar” hiding in it.'], pics: ['👋', '🏠', '💡'],
      also: { arts: 'Are you {familiar} with her early songs?' },
    }),
  w(2, 3, 'apologize', 'a|pol|o|gize', 'uh|pol|uh|jyz', 'v', 'to say you are sorry',
    'To tell someone you are sorry for what you did.', 'I want to {apologize} for being late.', {
      topics: ['people'], links: ['sorry', 'mistake', 'regret', 'making up'], not: ['tractor', 'sandwich', 'curtain'],
      lookalikes: ['analyze', 'epilogue'], wrong: ['apoligize', 'appologize'],
      tricky: [2, 'schwa', 'One p, and the quiet third beat is o: a + pol + o + gize.'], pics: ['🙏', '😔', '🤝'],
    }),
  w(2, 3, 'encourage', 'en|cour|age', 'en|kur|ij', 'v', 'to give someone the confidence to try',
    'To cheer someone on so they feel brave enough to try.', 'Good teachers {encourage} you to ask questions.', {
      topics: ['people', 'sport'], links: ['support', 'cheering', 'confidence', 'coach'], not: ['toaster', 'mud', 'receipt'],
      same: 'support', lookalikes: ['entourage', 'engage'], wrong: ['encurage', 'encourige'],
      tricky: [1, 'vowel-team', 'It has “courage” inside: en + courage. The “ur” sound is spelled o-u-r.'], pics: ['📣', '👏', '💪'],
      also: { sport: 'The coach shouted to {encourage} the runners.' },
    }),
  w(2, 2, 'convince', 'con|vince', 'kun|vins', 'v', 'to make someone believe or agree',
    'To talk someone round until they believe you or agree.', 'You will never {convince} me that pineapple belongs on pizza.', {
      topics: ['people', 'mind'], links: ['persuading', 'argument', 'belief', 'proof'], not: ['sock', 'river', 'oven'],
      same: 'persuade', lookalikes: ['convict', 'convenience'], wrong: ['convinse', 'convins'],
      tricky: [1, 'soft-cg', 'The s sound at the end is c-e: a soft c with a silent e.'], pics: ['🗣️', '🤝', '💡'],
    }),
  w(2, 5, 'acquaintance', 'ac|quain|tance', 'uh|kwayn|tuns', 'n', 'someone you know a little, not a close friend',
    'Someone you know to say hello to, but not well enough to call close.', 'He is an {acquaintance} from the gym, not a close friend.', {
      topics: ['people'], links: ['contact', 'small talk', 'hello', 'neighbor'], not: ['saucepan', 'glacier', 'tire'],
      lookalikes: ['acquittal', 'acquire'], wrong: ['aquaintance', 'acquaintence'],
      tricky: [0, 'silent', 'A c hides before the q: ac + quaint + ance.'], pics: ['👋', '🤝', '🙂'],
    }),
  w(2, 3, 'argument', 'ar|gu|ment', 'ar|gyoo|munt', 'n', 'an angry talk between people who disagree',
    'A heated disagreement, with raised voices.', 'They had an {argument} about whose turn it was to cook.', {
      topics: ['people'], links: ['disagreement', 'shouting', 'quarrel', 'debate'], not: ['saucepan', 'hedge', 'sock'],
      same: 'quarrel', opposite: 'agreement', lookalikes: ['augment', 'armament'], wrong: ['arguement', 'argumant'],
      tricky: [1, 'ending', '“Argue” drops its e before “ment”: no e after the u.'], pics: ['😠', '🗯️', '💢'],
    }),

  // ── Thinking words ────────────────────────────────────────────
  w(2, 3, 'genuine', 'gen|u|ine', 'jen|yoo|in', 'adj', 'real and honest, not fake',
    'The real thing, not a fake or a copy.', 'Her smile was {genuine}, not just polite.', {
      topics: ['mind', 'people'], links: ['real', 'honest', 'authentic', 'sincere'], not: ['gravel', 'soup', 'ladder'],
      same: 'real', opposite: 'fake', lookalikes: ['genius', 'genie'], wrong: ['genuin', 'jenuine'],
      tricky: [2, 'soft-cg', 'A soft g at the start, and a silent e after “in” at the end.'], pics: ['💎', '✅', '🤝'],
      also: { money: 'Is this a {genuine} leather bag?' },
    }),
  w(2, 3, 'hesitate', 'hes|i|tate', 'hez|uh|tayt', 'v', 'to pause before doing something',
    'To pause for a moment because you are not sure.', 'Do not {hesitate} to call if you need anything.', {
      topics: ['mind'], links: ['pause', 'doubt', 'waiting', 'uncertainty'], not: ['blanket', 'onion', 'wheel'],
      same: 'pause', lookalikes: ['meditate', 'agitate'], wrong: ['hesatate', 'hezitate'],
      tricky: [1, 'schwa', 'The quiet middle beat is the letter i: hes + i + tate.'], pics: ['⏸️', '🤔', '🚦'],
    }),
  w(2, 4, 'exaggerate', 'ex|ag|ger|ate', 'ig|zaj|uh|rayt', 'v', 'to make something sound bigger than it is',
    'To make a story bigger than the truth, like the fish that got away.', 'Do not {exaggerate}; it was only a small spider.', {
      topics: ['people', 'mind'], links: ['stretching truth', 'tall tale', 'drama', 'boasting'], not: ['saucepan', 'sock', 'battery'],
      opposite: 'downplay', lookalikes: ['exasperate', 'exacerbate'], wrong: ['exagerate', 'exadgerate'],
      tricky: [1, 'double', 'Two g’s: the word exaGGerates its own g.'], pics: ['🎣', '📏', '🤥'],
    }),
  w(2, 4, 'opportunity', 'op|por|tu|ni|ty', 'op|er|too|nuh|tee', 'n', 'a chance to do something good',
    'A good chance that opens up, like a door you can walk through.', 'The job is a great {opportunity} to learn.', {
      topics: ['work', 'mind'], links: ['chance', 'opening', 'luck', 'door'], not: ['puddle', 'sandwich', 'sleeve'],
      same: 'chance', lookalikes: ['community', 'opposition'], wrong: ['oppurtunity', 'oportunity'],
      tricky: [1, 'double', 'Two p’s, then o-r: op + por + tunity. Think of a PORT opening up.'], pics: ['🚪', '🍀', '🌟'],
      also: { travel: 'Living abroad was an {opportunity} I could not miss.' },
    }),
  w(2, 4, 'experience', 'ex|pe|ri|ence', 'ik|speer|ee|uns', 'n', 'what you know from having done things',
    'What you gain from doing a job or living through something, not from books.', 'She has ten years of {experience} as a nurse.', {
      topics: ['work', 'mind'], links: ['practice', 'skill', 'years', 'know-how'], not: ['curtain', 'puddle', 'spoon'],
      lookalikes: ['experiment', 'expedience'], wrong: ['experiance', 'expirience'],
      tricky: [3, 'ant-ent', 'It ends e-n-c-e, not a-n-c-e.'], pics: ['🧰', '🎓', '🌍'],
      also: { travel: 'No guidebook can replace {experience} on the trail.' },
    }),
  w(2, 3, 'obvious', 'ob|vi|ous', 'ob|vee|us', 'adj', 'easy to see or understand',
    'So clear that nobody needs it explained or pointed out.', 'It was {obvious} that she had been crying.', {
      topics: ['mind'], links: ['clear', 'plain', 'evident', 'in plain sight'], not: ['saucepan', 'glove', 'carpet'],
      same: 'clear', opposite: 'hidden', lookalikes: ['oblivious', 'envious'], wrong: ['obvius', 'obveous'],
      tricky: [2, 'vowel-team', 'The end is o-u-s, after an i: ob + vi + ous.'], pics: ['👀', '💡', '🔦'],
    }),
  w(2, 4, 'knowledge', 'knowl|edge', 'nol|ij', 'n', 'the things you know and understand',
    'Everything you have learned and now carry in your head.', 'His {knowledge} of cars saved us a lot of money.', {
      topics: ['mind'], links: ['learning', 'facts', 'understanding', 'education'], not: ['sandwich', 'puddle', 'sock'],
      opposite: 'ignorance', lookalikes: ['acknowledge', 'college'], wrong: ['knowlege', 'nowledge'],
      tricky: [0, 'silent', 'A silent k: it is “know” plus “ledge”. Keep the d before g-e.'], pics: ['🧠', '📚', '🎓'],
    }),

  // ── Work and plans ────────────────────────────────────────────
  w(2, 4, 'colleague', 'col|league', 'kol|eeg', 'n', 'a person you work with',
    'Someone who works at the same place as you.', 'A {colleague} covered my shift on Friday.', {
      topics: ['work', 'people'], links: ['coworker', 'office', 'team', 'workplace'], not: ['pillow', 'lighthouse', 'carrot'],
      same: 'coworker', lookalikes: ['college', 'collage'], wrong: ['collegue', 'coleague'],
      tricky: [1, 'vowel-team', 'Two l’s, then “league”: your colLEAGUE is in your LEAGUE.'], pics: ['💼', '🤝', '🏢'],
    }),
  w(2, 4, 'immediately', 'im|me|di|ate|ly', 'ih|mee|dee|ut|lee', 'adv', 'right now, with no delay',
    'Right this second, without waiting at all.', 'Call me {immediately} if the alarm goes off.', {
      topics: ['work', 'society'], links: ['now', 'at once', 'urgent', 'instantly'], not: ['sofa', 'garden', 'sandwich'],
      same: 'instantly', opposite: 'later', lookalikes: ['imminently', 'intimately'], wrong: ['imediately', 'immediatly'],
      tricky: [3, 'ending', 'Two m’s at the start, and keep the e before ly: immediate + ly.'], pics: ['⚡', '🚨', '⏱️'],
    }),
  w(2, 4, 'temporary', 'tem|po|rar|y', 'tem|puh|rair|ee', 'adj', 'lasting only a short time',
    'Only for now; it will not last or stay for long.', 'This is a {temporary} fix until the plumber comes.', {
      topics: ['work', 'home'], links: ['short-term', 'for now', 'stopgap', 'brief'], not: ['mountain', 'spoon', 'violin'],
      opposite: 'permanent', lookalikes: ['temporal', 'contemporary'], wrong: ['temprary', 'temporery'],
      tricky: [1, 'schwa', 'The quiet second beat is o: tem + po + rary. Think “tempo”.'], pics: ['⏳', '🩹', '🏕️'],
      also: { work: 'She took a {temporary} job over the summer.' },
    }),
  w(2, 4, 'recommend', 'rec|om|mend', 'rek|uh|mend', 'v', 'to say something is good and worth trying',
    'To tell a friend that a film, a dish or a plumber is good and worth trying.', 'Can you {recommend} a good dentist?', {
      topics: ['people', 'food'], links: ['suggestion', 'advice', 'review', 'tip'], not: ['gravel', 'sleeve', 'lamp'],
      same: 'suggest', lookalikes: ['reprimand', 'command'], wrong: ['reccomend', 'recomend'],
      tricky: [1, 'prefix', 're + commend: one c, two m’s.'], pics: ['👍', '⭐', '🗣️'],
      also: { food: 'I {recommend} the soup; it is homemade.' },
    }),
  w(2, 2, 'organize', 'or|gan|ize', 'or|guh|nyz', 'v', 'to put things in order or plan an event',
    'To sort a mess into order, or to plan and set up an event.', 'I need to {organize} my desk this weekend.', {
      topics: ['work', 'home'], links: ['order', 'planning', 'sorting', 'tidying'], not: ['thunder', 'soup', 'knee'],
      same: 'arrange', lookalikes: ['agonize', 'recognize'], wrong: ['orginize', 'organnize'],
      tricky: [1, 'schwa', 'The quiet middle is a: there is an “organ” inside.'], pics: ['🗂️', '📋', '🧹'],
      also: { people: 'We want to {organize} a surprise party for Dad.' },
    }),
  w(2, 3, 'maintain', 'main|tain', 'mayn|tayn', 'v', 'to keep something in good condition',
    'To keep a car, a house or a machine in good working order.', 'It costs a lot to {maintain} an old house.', {
      topics: ['work', 'home'], links: ['upkeep', 'repair', 'care', 'servicing'], not: ['sandwich', 'cloud', 'violin'],
      same: 'keep', opposite: 'neglect', lookalikes: ['mountain', 'mainstay'], wrong: ['maintane', 'mantain'],
      tricky: [1, 'vowel-team', 'a-i twice: main + tain.'], pics: ['🔧', '🧰', '🚗'],
      also: { tech: 'Updates help {maintain} your phone’s security.' },
    }),
  w(2, 2, 'postpone', 'post|pone', 'pohst|pohn', 'v', 'to move something to a later time',
    'To move a meeting or event to a later date.', 'We had to {postpone} the picnic because of rain.', {
      topics: ['work'], links: ['delay', 'later date', 'rescheduling', 'calendar'], not: ['pillow', 'onion', 'elbow'],
      same: 'delay', lookalikes: ['postcard', 'propose'], wrong: ['pospone', 'postpon'],
      tricky: [0, 'prefix', 'Keep the t: post (meaning after) + pone.'], pics: ['📅', '⏭️', '🌧️'],
      also: { sport: 'They had to {postpone} the match until Sunday.' },
    }),
  w(2, 4, 'responsible', 're|spon|si|ble', 'rih|spon|suh|bul', 'adj', 'in charge of something, and trusted to do it',
    'The person in charge, who takes the blame if it goes wrong.', 'Who is {responsible} for locking up tonight?', {
      topics: ['work', 'people'], links: ['duty', 'in charge', 'trust', 'blame'], not: ['puddle', 'lemon', 'sock'],
      same: 'reliable', opposite: 'careless', lookalikes: ['responsive', 'sensible'], wrong: ['responsable', 'responsibel'],
      tricky: [2, 'able-ible', 'It ends i-b-l-e, not a-b-l-e. “I” am responsIble.'], pics: ['🔑', '✅', '👷'],
    }),
  w(2, 3, 'available', 'a|vail|a|ble', 'uh|vay|luh|bul', 'adj', 'free to be used, bought or met',
    'Free and ready: not taken, not sold out, not busy.', 'Is the doctor {available} on Thursday morning?', {
      topics: ['work'], links: ['free', 'in stock', 'ready', 'open slot'], not: ['thunder', 'sleeve', 'mud'],
      same: 'free', opposite: 'busy', lookalikes: ['valuable', 'avoidable'], wrong: ['availible', 'avalable'],
      tricky: [2, 'able-ible', 'It ends a-b-l-e: you are ABLE to have it.'], pics: ['✅', '🟢', '🛒'],
      also: { tech: 'The app is {available} on every phone.' },
    }),
  w(2, 4, 'professional', 'pro|fes|sion|al', 'pruh|fesh|un|ul', 'adj', 'trained and paid to do a job well',
    'Trained and paid to do it, not doing it as a hobby.', 'We hired a {professional} painter for the ceiling.', {
      topics: ['work', 'sport'], links: ['expert', 'career', 'paid', 'skilled'], not: ['puddle', 'pillow', 'onion'],
      same: 'expert', opposite: 'amateur', lookalikes: ['provisional', 'confessional'], wrong: ['proffesional', 'profesional'],
      tricky: [1, 'double', 'One f, two s’s: pro + fes + sion + al.'], pics: ['👔', '🏅', '🛠️'],
      also: { sport: 'He became a {professional} golfer at nineteen.' },
    }),

  // ── Money ─────────────────────────────────────────────────────
  w(2, 5, 'guarantee', 'guar|an|tee', 'gair|un|tee', 'n', 'a firm promise that something will work or happen',
    'A promise from the maker to fix or replace it if it breaks.', 'The washer comes with a two-year {guarantee}.', {
      topics: ['money', 'tech'], links: ['promise', 'warranty', 'refund', 'repair'], not: ['forest', 'pillow', 'soup'],
      same: 'warranty', lookalikes: ['guardian', 'quarantine'], wrong: ['garantee', 'guarentee'],
      tricky: [0, 'silent', 'A silent u after the g, as in guard. It GUARds what you bought.'], pics: ['🛡️', '✅', '🤝'],
    }),
  w(2, 3, 'budget', 'bud|get', 'buj|it', 'n', 'a plan for how much money you can spend',
    'A plan for how much you can spend each month on rent, food and fun.', 'A new phone is not in my {budget} this month.', {
      topics: ['money'], links: ['spending', 'savings', 'plan', 'bills'], not: ['violin', 'mud', 'shoelace'],
      lookalikes: ['budge', 'gadget'], wrong: ['buget', 'budjet'],
      tricky: [1, 'soft-cg', 'The j sound is spelled d-g, as in bridge and fudge.'], pics: ['💰', '📊', '🧾'],
      also: { travel: 'We toured Italy on a tight {budget}.' },
    }),
  w(2, 4, 'mortgage', 'mort|gage', 'mor|gij', 'n', 'a loan from a bank to buy a home',
    'The big bank loan you pay off every month for years to buy a house.', 'They finally paid off the {mortgage} last year.', {
      topics: ['money', 'home'], links: ['house', 'bank', 'loan', 'monthly payment'], not: ['sandwich', 'trumpet', 'sock'],
      lookalikes: ['mortar', 'montage'], wrong: ['morgage', 'mortgauge'],
      tricky: [0, 'silent', 'A silent t in the middle: write mort + gage.'], pics: ['🏠', '🏦', '💸'],
    }),

  // ── Body and health ───────────────────────────────────────────
  w(2, 3, 'symptom', 'symp|tom', 'simp|tum', 'n', 'a sign that you are ill',
    'A sign of illness, like a cough, a rash or a fever.', 'A sore throat was the first {symptom}.', {
      topics: ['body'], links: ['illness', 'fever', 'doctor', 'sign'], not: ['curtain', 'wallet', 'guitar'],
      lookalikes: ['system', 'sympathy'], wrong: ['simptom', 'symtom'],
      tricky: [0, 'y-vowel', 'The “i” sound is spelled y, and the p is easy to miss: sym + p + tom.'], pics: ['🤒', '🤧', '🩺'],
    }),
  w(2, 4, 'prescription', 'pre|scrip|tion', 'prih|skrip|shun', 'n', 'a doctor’s written order for medicine',
    'The note from your doctor that lets the pharmacy give you medicine.', 'The doctor wrote me a {prescription} for antibiotics.', {
      topics: ['body'], links: ['doctor', 'medicine', 'pharmacy', 'pills'], not: ['tractor', 'blanket', 'guitar'],
      lookalikes: ['subscription', 'description'], wrong: ['perscription', 'prescripsion'],
      tricky: [0, 'prefix', 'It starts p-r-e, not p-e-r: it is PRE-pared before you take it.'], pics: ['💊', '📝', '🩺'],
    }),
  w(2, 3, 'breathe', 'breathe', 'breeth', 'v', 'to take air in and let it out',
    'To take air into your lungs and let it out again.', 'I could barely {breathe} after running up the stairs.', {
      topics: ['body', 'sport'], links: ['lungs', 'air', 'inhale', 'oxygen'], not: ['wallet', 'staircase', 'pencil'],
      lookalikes: ['breath', 'bathe'], wrong: ['breethe', 'breeth'],
      tricky: [0, 'ending', 'The e on the end makes it the doing word: you breathE a breath.'], pics: ['🌬️', '🧘', '😤'],
      also: { sport: 'Remember to {breathe} out as you lift.' },
    }),
  w(2, 3, 'emergency', 'e|mer|gen|cy', 'ih|mur|jun|see', 'n', 'a sudden, serious problem that needs fast action',
    'A sudden, dangerous situation where you call for help right away.', 'In an {emergency}, use the stairs, not the elevator.', {
      topics: ['society', 'body'], links: ['ambulance', 'urgent', 'help', 'danger'], not: ['pillow', 'hedge', 'recipe'],
      lookalikes: ['emergence', 'urgency'], wrong: ['emergancy', 'emmergency'],
      tricky: [2, 'soft-cg', 'A soft g before e, and the end is e-n-c-y.'], pics: ['🚨', '🚑', '🆘'],
    }),

  // ── Food and home ─────────────────────────────────────────────
  w(2, 3, 'recipe', 'rec|i|pe', 'res|uh|pee', 'n', 'instructions for cooking a dish',
    'The list of steps and amounts you follow to cook a dish.', 'This is my grandmother’s {recipe} for apple pie.', {
      topics: ['food'], links: ['cooking', 'ingredients', 'cookbook', 'steps'], not: ['tire', 'glove', 'bridge'],
      lookalikes: ['receipt', 'recite'], wrong: ['recipie', 'resipe'],
      tricky: [2, 'odd', 'The last e is spoken: rec + i + pe says “pee”.'], pics: ['📖', '🍲', '🥘'],
    }),
  w(2, 4, 'delicious', 'de|li|cious', 'dih|lish|us', 'adj', 'tasting or smelling very good',
    'What you say about food that tastes wonderful.', 'That soup was absolutely {delicious}.', {
      topics: ['food'], links: ['tasty', 'yum', 'flavor', 'dessert'], not: ['wrench', 'puddle', 'invoice'],
      same: 'tasty', opposite: 'disgusting', lookalikes: ['malicious', 'delirious'], wrong: ['delishous', 'delicous'],
      tricky: [2, 'shun', 'The “sh” sound is spelled c-i: de + li + cious.'], pics: ['😋', '🍰', '🤤'],
    }),
  w(2, 3, 'appetite', 'ap|pe|tite', 'ap|uh|tyt', 'n', 'the feeling of wanting to eat',
    'The feeling of wanting food; a long walk gives you a big one.', 'The smell of baking gave me an {appetite}.', {
      topics: ['food', 'body'], links: ['hunger', 'eating', 'craving', 'mealtime'], not: ['ladder', 'receipt', 'tire'],
      lookalikes: ['aptitude', 'petite'], wrong: ['apetite', 'appitite'],
      tricky: [0, 'double', 'Two p’s at the start, and the quiet middle is e: ap + pe + tite.'], pics: ['🍽️', '😋', '🍔'],
    }),
  w(2, 3, 'furniture', 'fur|ni|ture', 'fur|nih|cher', 'n', 'things like chairs, tables and beds',
    'Chairs, tables, sofas and beds are all this.', 'We need new {furniture} for the living room.', {
      topics: ['home'], links: ['chair', 'sofa', 'table', 'living room'], not: ['thunder', 'salad', 'ticket'],
      lookalikes: ['furnace', 'future'], wrong: ['furnature', 'furnicher'],
      tricky: [2, 'r-vowel', 'The “cher” ending is spelled t-u-r-e, as in picture.'], pics: ['🛋️', '🪑', '🛏️'],
    }),

  // ── Nature and travel ─────────────────────────────────────────
  w(2, 4, 'environment', 'en|vi|ron|ment', 'en|vy|run|munt', 'n', 'the natural world around us; your surroundings',
    'The air, water, land and living things all around us.', 'Plastic waste is bad for the {environment}.', {
      topics: ['nature', 'society'], links: ['nature', 'climate', 'pollution', 'surroundings'], not: ['sandwich', 'sleeve', 'invoice'],
      lookalikes: ['entertainment', 'enrollment'], wrong: ['enviroment', 'envirnment'],
      tricky: [2, 'silent', 'Do not lose the n before the m: envi + ron + ment. There is “iron” in it.'], pics: ['🌍', '🌳', '♻️'],
      also: { work: 'It is a friendly {environment} to work in.' },
    }),
  w(2, 4, 'drought', 'drought', 'drowt', 'n', 'a long time with no rain',
    'Months with no rain, when the fields crack and rivers run dry.', 'The {drought} killed most of the crops.', {
      topics: ['nature'], links: ['dry', 'no rain', 'desert', 'heatwave'], not: ['sofa', 'receipt', 'guitar'],
      opposite: 'flood', lookalikes: ['doubt', 'brought'], wrong: ['drout', 'drowt'],
      tricky: [0, 'ough', 'The “ow” sound is spelled o-u-g-h. The g and h are silent.'], pics: ['🏜️', '☀️', '🌵'],
    }),
  w(2, 3, 'destination', 'des|ti|na|tion', 'des|tuh|nay|shun', 'n', 'the place you are going to',
    'The place at the end of your trip; where you are headed.', 'The final {destination} of this train is Chicago.', {
      topics: ['travel'], links: ['journey', 'arrival', 'map', 'trip'], not: ['saucepan', 'sock', 'pillow'],
      lookalikes: ['destiny', 'designation'], wrong: ['destanation', 'destinashun'],
      tricky: [1, 'schwa', 'The quiet second beat is t-i, and the “shun” at the end is t-i-o-n.'], pics: ['📍', '🗺️', '✈️'],
    }),
  w(2, 5, 'accommodate', 'ac|com|mo|date', 'uh|kom|uh|dayt', 'v', 'to have room for someone, or to fit in with their needs',
    'To make room for guests, or to adjust so that someone’s needs are met.', 'The hotel can {accommodate} up to two hundred guests.', {
      topics: ['travel', 'people'], links: ['room', 'guests', 'hotel', 'fitting in'], not: ['thunder', 'shoelace', 'onion'],
      lookalikes: ['accumulate', 'commemorate'], wrong: ['accomodate', 'acommodate'],
      tricky: [1, 'double', 'Two c’s and two m’s: the word is big enough to accommodate them all.'], pics: ['🏨', '🛏️', '🤝'],
      also: { work: 'We can {accommodate} your request for a later start.' },
    }),
  w(2, 4, 'foreign', 'for|eign', 'for|un', 'adj', 'from or in another country',
    'From another country, not your own.', 'She speaks three {foreign} languages.', {
      topics: ['travel', 'society'], links: ['abroad', 'overseas', 'passport', 'another country'], not: ['saucepan', 'sock', 'haircut'],
      opposite: 'local', lookalikes: ['forgone', 'reign'], wrong: ['foriegn', 'forein'],
      tricky: [1, 'ei-ie', 'e before i, then a silent g, like “reign”: for + eign.'], pics: ['🌍', '🛂', '🗣️'],
    }),

  // ── Tech, arts and sport ──────────────────────────────────────
  w(2, 3, 'technology', 'tech|nol|o|gy', 'tek|nol|uh|jee', 'n', 'machines and tools made using science',
    'Phones, computers, robots: the tools that science gives us.', 'New {technology} makes video calls easy.', {
      topics: ['tech'], links: ['computers', 'phones', 'science', 'gadgets'], not: ['pillow', 'soup', 'hedge'],
      lookalikes: ['terminology', 'technique'], wrong: ['tecnology', 'technolagy'],
      tricky: [0, 'ph-ch', 'The k sound is spelled c-h, as in school and echo.'], pics: ['💻', '📱', '🤖'],
    }),
  w(2, 5, 'rhythm', 'rhy|thm', 'rih|thum', 'n', 'a regular pattern of beats or sounds',
    'The steady beat in music that makes you tap your foot.', 'The drummer kept a steady {rhythm} all night.', {
      topics: ['arts', 'sport'], links: ['beat', 'drums', 'music', 'dancing'], not: ['invoice', 'saucepan', 'hedge'],
      lookalikes: ['rhyme', 'writhe'], wrong: ['rythm', 'rhythem'],
      tricky: [0, 'y-vowel', 'No a, e, i, o or u at all. Rhythm Helps Your Two Hips Move.'], pics: ['🥁', '🎵', '💃'],
      also: { sport: 'Find a steady {rhythm} and the run gets easier.' },
    }),
  w(2, 3, 'audience', 'au|di|ence', 'aw|dee|uns', 'n', 'the people watching or listening to a show',
    'The crowd of people sitting and watching a show or a talk.', 'The {audience} clapped for five minutes.', {
      topics: ['arts'], links: ['theater', 'crowd', 'applause', 'show'], not: ['wrench', 'puddle', 'invoice'],
      lookalikes: ['audition', 'obedience'], wrong: ['audiance', 'awdience'],
      tricky: [0, 'vowel-team', 'The “aw” sound is a-u, as in audio. The end is e-n-c-e.'], pics: ['👏', '🎭', '🎤'],
    }),
  w(2, 3, 'character', 'char|ac|ter', 'kair|uk|ter', 'n', 'a person in a story, or what someone is like',
    'A person in a book, film or play.', 'My favorite {character} dies in the last chapter.', {
      topics: ['arts', 'people'], links: ['story', 'film', 'hero', 'personality'], not: ['wrench', 'puddle', 'saucepan'],
      lookalikes: ['charter', 'caricature'], wrong: ['charecter', 'caracter'],
      tricky: [0, 'ph-ch', 'The k sound is spelled c-h, as in chorus and chaos.'], pics: ['🎭', '📖', '🦸'],
    }),
  w(2, 4, 'tournament', 'tour|na|ment', 'toor|nuh|munt', 'n', 'a contest with many games and one winner',
    'A competition where teams or players are knocked out round by round.', 'Our team won the weekend {tournament}.', {
      topics: ['sport'], links: ['competition', 'knockout', 'trophy', 'final'], not: ['toaster', 'pillow', 'soup'],
      lookalikes: ['tourniquet', 'torment'], wrong: ['tornament', 'tournement'],
      tricky: [0, 'vowel-team', 'It starts with “tour”: t-o-u-r. Then n-a, then ment.'], pics: ['🏆', '⚽', '🎾'],
      also: { tech: 'She entered an online chess {tournament}.' },
    }),

  // ── Out in the world ──────────────────────────────────────────
  w(2, 4, 'occasion', 'oc|ca|sion', 'uh|kay|zhun', 'n', 'a special event or time',
    'A special event, like a wedding or birthday, that you dress up for.', 'I am saving this dress for a special {occasion}.', {
      topics: ['society', 'people'], links: ['event', 'celebration', 'party', 'wedding'], not: ['wrench', 'puddle', 'sock'],
      lookalikes: ['occupation', 'equation'], wrong: ['ocassion', 'occassion'],
      tricky: [1, 'double', 'Two c’s, one s: an occasion needs two Cakes and one Speech.'], pics: ['🎉', '👗', '🥂'],
    }),
  w(2, 3, 'government', 'gov|ern|ment', 'guv|ern|munt', 'n', 'the group of people who run a country',
    'The group of people who run a country and make its laws.', 'The {government} announced a new tax today.', {
      topics: ['society'], links: ['laws', 'elections', 'president', 'taxes'], not: ['saucepan', 'sock', 'pillow'],
      lookalikes: ['garment', 'covenant'], wrong: ['goverment', 'govenment'],
      tricky: [1, 'silent', 'It is “govern” + “ment”. Do not drop the n before the m.'], pics: ['🏛️', '🗳️', '📜'],
    }),
  // ── More things and actions that slip away ────────────────────
  w(2, 4, 'binoculars', 'bin|oc|u|lars', 'bih|nok|yuh|lerz', 'n', 'a pair of joined tubes for seeing far-off things',
    'The two little telescopes joined together that bird watchers hold up to their eyes.', 'Bring the {binoculars} so we can watch the eagles.', {
      topics: ['nature', 'sport'], links: ['bird watching', 'far away', 'lenses', 'telescope'], not: ['pancake', 'sofa', 'invoice'],
      lookalikes: ['barnacles', 'particulars'], wrong: ['binoculers', 'binoculors'],
      tricky: [3, 'r-vowel', 'The ending sounds like “lerz” but is spelled l-a-r-s, as in “popular”.'], pics: ['🔭', '🦅', '👀'],
    }),
  w(2, 3, 'tweezers', 'twee|zers', 'twee|zerz', 'n', 'a small tool for gripping and pulling tiny things',
    'The little pinching tool you use to pull out a splinter.', 'I need {tweezers} to get this splinter out.', {
      topics: ['body', 'home'], links: ['splinter', 'pinching', 'eyebrows', 'first aid'], not: ['bus stop', 'curtain', 'trumpet'],
      lookalikes: ['freezers', 'sneezes'], wrong: ['tweasers', 'twezers'],
      tricky: [0, 'vowel-team', 'The long e sound is a double e, as in “squeeze” and “freeze”.'], pics: ['🩹', '🤏', '🧰'],
    }),
  w(2, 4, 'misspell', 'mis|spell', 'mis|spel', 'v', 'to write a word with the wrong letters',
    'To write a word with a letter wrong, left out or in the wrong place.', 'People often {misspell} my last name.', {
      topics: ['work', 'mind'], links: ['typo', 'wrong letters', 'writing', 'dictionary'], not: ['umbrella', 'gravel', 'pancake'],
      lookalikes: ['dispel', 'mislead'], wrong: ['mispell', 'misspel'],
      tricky: [0, 'prefix', 'It is mis + spell, so both s’s stay: one from each part.'], pics: ['✏️', '🔡', '🔤'],
    }),
  w(2, 4, 'gymnasium', 'gym|na|si|um', 'jim|nay|zee|um', 'n', 'a large room or building for indoor sports',
    'The big hall at a school where you play indoor games and climb ropes.', 'The school {gymnasium} smells like floor polish.', {
      topics: ['sport'], links: ['basketball court', 'exercise', 'bleachers', 'training'], not: ['saucepan', 'envelope', 'lighthouse'],
      lookalikes: ['magnesium', 'geranium'], wrong: ['gymnasiam', 'jimnasium'],
      tricky: [0, 'y-vowel', 'The short i sound is spelled y, and the j sound is a soft g: g-y-m.'], pics: ['🏀', '🤸', '🏋️'],
    }),
  w(2, 3, 'valuable', 'val|u|a|ble', 'val|yoo|uh|bul', 'adj', 'worth a lot of money, or very useful',
    'Describes something worth a lot, like a diamond ring or a rare painting.', 'Keep your {valuable} things in the hotel safe.', {
      topics: ['money'], links: ['jewelry', 'worth a lot', 'precious', 'hotel safe'], not: ['puddle', 'sock', 'sneeze'],
      same: 'precious', opposite: 'worthless', lookalikes: ['variable', 'valiant'], wrong: ['valueable', 'valuble'],
      tricky: [2, 'ending', '“Value” drops its e before a-b-l-e is added: v-a-l-u, then a-b-l-e.'], pics: ['💎', '💍', '🔐'],
      also: { work: 'Her advice was the most {valuable} part of the course.' },
    }),
  w(2, 3, 'flexible', 'flex|i|ble', 'flek|sih|bul', 'adj', 'able to bend easily, or to change plans easily',
    'Describes a gymnast’s body, a rubber hose, or a boss who lets you swap shifts.', 'Yoga keeps my back {flexible}.', {
      topics: ['body', 'sport'], links: ['bending', 'stretching', 'rubber', 'yoga'], not: ['invoice', 'lighthouse', 'pepper'],
      same: 'bendy', opposite: 'stiff', lookalikes: ['feasible', 'legible'], wrong: ['flexable', 'flexibel'],
      tricky: [1, 'able-ible', 'It ends i-b-l-e, with an i, the same as “possible” and “terrible”.'], pics: ['🤸', '🧘', '🐍'],
      also: { work: 'My hours are {flexible}, so I can pick up the kids from school.' },
    }),
  w(2, 2, 'forecast', 'fore|cast', 'for|kast', 'n', 'a statement of what is likely to happen, especially the weather',
    'What the weather presenter gives you: rain tomorrow, sun by the weekend.', 'The {forecast} for tomorrow is snow.', {
      topics: ['nature', 'society'], links: ['weather', 'prediction', 'tomorrow', 'chance of rain'], not: ['sandal', 'violin', 'receipt'],
      same: 'prediction', lookalikes: ['foremost', 'broadcast'], wrong: ['forcast', 'forecaste'],
      tricky: [0, 'prefix', '“Fore” means before, with an e: f-o-r-e, as in “forehead” and “foresee”.'], pics: ['🌦️', '📺', '☔'],
      also: { money: 'The sales {forecast} for next year looks strong.' },
    }),
  w(2, 3, 'ambulance', 'am|bu|lance', 'am|byuh|luns', 'n', 'a vehicle that takes sick or hurt people to the hospital',
    'The vehicle with a siren and flashing lights that rushes people to the hospital.', 'An {ambulance} arrived within five minutes.', {
      topics: ['body', 'travel'], links: ['siren', 'paramedic', 'hospital', 'emergency'], not: ['pancake', 'curtain', 'guitar'],
      lookalikes: ['abundance', 'ambience'], wrong: ['ambulence', 'ambulanse'],
      tricky: [2, 'ant-ent', 'It ends a-n-c-e, not e-n-c-e. Picture the “lance” at the end.'], pics: ['🚑', '🚨', '🏥'],
    }),
];
