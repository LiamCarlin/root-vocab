import { w, type BankWord } from '../schema';

/**
 * Level 1 words: everyday. Almost everyone knows what these mean. They are here
 * because they are classic tip-of-the-tongue words for ordinary things, or
 * everyday spelling demons, so `spell` is often much higher than `level`.
 */
export const L1: BankWord[] = [
  // ── Around the house ──────────────────────────────────────────
  w(1, 3, 'colander', 'col|an|der', 'kol|un|der', 'n', 'a bowl with holes for draining food',
    'The bowl full of holes you pour pasta into to drain the water.', 'Tip the pasta into the {colander} over the sink.', {
      topics: ['food', 'home'], links: ['kitchen', 'pasta', 'draining', 'sieve'], not: ['pillow', 'engine', 'passport'],
      lookalikes: ['calendar', 'cylinder'], wrong: ['colender', 'collander'],
      tricky: [1, 'schwa', 'The quiet middle beat is spelled a-n, and the end is d-e-r, like “under”.'], pics: ['🍝', '🥣', '🚰'],
    }),
  w(1, 3, 'spatula', 'spat|u|la', 'spat|chuh|luh', 'n', 'a flat kitchen tool for flipping or spreading',
    'The flat tool you slide under a pancake to flip it.', 'Use the {spatula} to flip the eggs.', {
      topics: ['food', 'home'], links: ['kitchen', 'flipping', 'pancakes', 'frying pan'], not: ['tent', 'keyboard', 'river'],
      lookalikes: ['spatial', 'spectacle'], wrong: ['spatchula', 'spatular'],
      tricky: [1, 'odd', 'It sounds like “chuh”, but the middle beat is just the letter u.'], pics: ['🍳', '🥞', '🍔'],
    }),
  w(1, 3, 'thermostat', 'ther|mo|stat', 'thur|muh|stat', 'n', 'the control that sets how warm a room is',
    'The dial on the wall you turn up when the house is cold.', 'Turn the {thermostat} down before bed.', {
      topics: ['home', 'tech'], links: ['heating', 'wall dial', 'warmth', 'boiler'], not: ['sandwich', 'saddle', 'violin'],
      lookalikes: ['thermometer', 'thermos'], wrong: ['thermastat', 'thermostate'],
      tricky: [1, 'schwa', 'The quiet middle beat is “mo”, from thermo, which means heat.'], pics: ['🌡️', '🔥', '🏠'],
      also: { money: 'Lowering the {thermostat} one degree cuts the heating bill.' },
    }),
  w(1, 2, 'envelope', 'en|ve|lope', 'en|vuh|lohp', 'n', 'a paper cover for a letter',
    'The paper pocket you seal a letter or card inside.', 'Put the card in the {envelope} and add a stamp.', {
      topics: ['home', 'society'], links: ['letter', 'stamp', 'post office', 'mailbox'], not: ['ladder', 'soup', 'helmet'],
      lookalikes: ['envelop', 'antelope'], wrong: ['envalope', 'envolope'],
      tricky: [1, 'schwa', 'The quiet middle beat is spelled v-e, and “lope” ends with a silent e.'], pics: ['✉️', '📬', '💌'],
    }),
  w(1, 2, 'umbrella', 'um|brel|la', 'um|brel|uh', 'n', 'a folding cover you hold to keep off rain',
    'What you open over your head when it starts to rain.', 'Take an {umbrella}; it looks like rain.', {
      topics: ['home', 'nature'], links: ['rain', 'handle', 'weather', 'raincoat'], not: ['toaster', 'invoice', 'guitar'],
      lookalikes: ['umpire', 'mozzarella'], wrong: ['umbrela', 'umberella'],
      tricky: [1, 'double', 'Two l’s, like two ribs holding the cover open. And no e after the b.'], pics: ['☔', '🌂', '🌧️'],
      also: { travel: 'Pack a small {umbrella} for the trip.' },
    }),
  w(1, 4, 'vacuum', 'vac|uum', 'vak|yoom', 'n', 'a machine that sucks up dust from floors',
    'The noisy machine you push around to suck dust off the carpet.', 'I ran the {vacuum} over the rug before the guests came.', {
      topics: ['home'], links: ['carpet', 'dust', 'cleaning', 'broom'], not: ['orchestra', 'passport', 'lemon'],
      lookalikes: ['vaccine', 'vacant'], wrong: ['vaccum', 'vacume'],
      tricky: [1, 'vowel-team', 'One c, two u’s. The two u’s are the tube sucking up the dust.'], pics: ['🧹', '🧼', '🏠'],
    }),
  w(1, 4, 'refrigerator', 're|frig|er|a|tor', 'ruh|frij|uh|ray|ter', 'n', 'the kitchen machine that keeps food cold',
    'The tall cold box in the kitchen where the milk lives.', 'Put the leftovers in the {refrigerator}.', {
      topics: ['food', 'home'], links: ['kitchen', 'cold', 'milk', 'freezer'], not: ['bicycle', 'pencil', 'curtain'],
      lookalikes: ['radiator', 'generator'], wrong: ['refridgerator', 'refrigerater'],
      tricky: [1, 'soft-cg', '“Fridge” has a d, but the full word does not: it is f-r-i-g.'], pics: ['🧊', '🥛', '🍎'],
    }),
  w(1, 4, 'scissors', 'scis|sors', 'siz|erz', 'n', 'a tool with two blades for cutting paper or cloth',
    'The two-bladed tool you cut paper or hair with.', 'Pass me the {scissors} to open this packet.', {
      topics: ['home', 'arts'], links: ['cutting', 'paper', 'blades', 'haircut'], not: ['soup', 'cloud', 'wallet'],
      lookalikes: ['science', 'sisters'], wrong: ['sissors', 'scisors'],
      tricky: [0, 'silent', 'A silent c after the first s, the same s-c as in science. Then two more s’s.'], pics: ['✂️', '📄', '💇'],
    }),

  // ── Food ──────────────────────────────────────────────────────
  w(1, 3, 'ingredient', 'in|gre|di|ent', 'in|gree|dee|unt', 'n', 'one of the foods that go into a dish',
    'One of the things on the list at the top of a recipe.', 'The secret {ingredient} is a pinch of cinnamon.', {
      topics: ['food'], links: ['recipe', 'cooking', 'flour', 'shopping list'], not: ['tire', 'blanket', 'ticket'],
      lookalikes: ['gradient', 'obedient'], wrong: ['ingrediant', 'ingreedient'],
      tricky: [3, 'ant-ent', 'It ends e-n-t, not a-n-t. Every ingrediENT is ENTered into the pot.'], pics: ['🧂', '🥚', '🧈'],
    }),
  w(1, 3, 'vegetable', 'vege|ta|ble', 'vej|tuh|bul', 'n', 'a plant you eat, like a carrot or a bean',
    'A carrot, a bean and an onion are each one of these.', 'Add one more {vegetable} to the stew.', {
      topics: ['food', 'nature'], links: ['carrot', 'garden', 'salad', 'fruit'], not: ['hammer', 'radio', 'sock'],
      lookalikes: ['vegetarian', 'veritable'], wrong: ['vegtable', 'vegatable'],
      tricky: [0, 'silent', 'A hidden e follows the g. Say “veg-E-table” in your head as you write.'], pics: ['🥕', '🥦', '🌽'],
      also: { nature: 'We grow every {vegetable} we eat in summer.' },
    }),
  w(1, 3, 'chocolate', 'choc|o|late', 'chok|uh|lit', 'n', 'a sweet brown food made from cocoa',
    'The sweet brown treat made from cocoa beans.', 'She saved the last piece of {chocolate} for you.', {
      topics: ['food'], links: ['cocoa', 'candy', 'dessert', 'sweet'], not: ['engine', 'envelope', 'shovel'],
      lookalikes: ['collate', 'chalet'], wrong: ['choclate', 'chocolat'],
      tricky: [1, 'schwa', 'The middle o goes quiet. Say “choc-O-late” as you write. You are never too LATE for it.'], pics: ['🍫', '🍪', '🎂'],
    }),
  w(1, 4, 'restaurant', 'res|tau|rant', 'res|tuh|ront', 'n', 'a place where you pay to sit and eat a meal',
    'A place where you sit at a table, order from a menu and pay to eat.', 'We booked a table at the new {restaurant}.', {
      topics: ['food', 'travel'], links: ['menu', 'waiter', 'dinner', 'cafe'], not: ['wrench', 'pillow', 'glacier'],
      lookalikes: ['restraint', 'resistant'], wrong: ['restarant', 'resturant'],
      tricky: [1, 'vowel-team', 'The quiet middle beat is spelled t-a-u. Say “rest-AU-rant” as you write.'], pics: ['🍽️', '🍝', '🧾'],
      also: { travel: 'The best {restaurant} in town was down a side street.' },
    }),

  // ── People and feelings ───────────────────────────────────────
  w(1, 2, 'friend', 'friend', 'frend', 'n', 'someone you like and trust',
    'A person you like, trust and choose to spend time with.', 'She has been my best {friend} since first grade.', {
      topics: ['people'], links: ['trust', 'company', 'pal', 'laughter'], not: ['invoice', 'gravel', 'antenna'],
      same: 'pal', opposite: 'enemy', lookalikes: ['fiend', 'fried'], wrong: ['freind', 'frend'],
      tricky: [0, 'ei-ie', 'i before e. A friEND stays to the END.'], pics: ['🤝', '👫', '😊'],
    }),
  w(1, 4, 'neighbor', 'neigh|bor', 'nay|ber', 'n', 'a person who lives next to you',
    'The person who lives in the house next door.', 'Our {neighbor} waters the plants when we are away.', {
      topics: ['people', 'home'], links: ['next door', 'street', 'fence', 'community'], not: ['submarine', 'spoon', 'desert'],
      lookalikes: ['neither', 'harbor'], wrong: ['nieghbor', 'naybor'],
      tricky: [0, 'ough', 'The “ay” sound is spelled e-i-g-h, as in eight and weigh.'], pics: ['🏘️', '👋', '🏡'],
    }),
  w(1, 3, 'surprise', 'sur|prise', 'ser|pryz', 'n', 'something you did not expect',
    'What you feel when something happens that you did not expect at all.', 'The party was a complete {surprise}.', {
      topics: ['feelings'], links: ['unexpected', 'gasp', 'gift', 'party'], not: ['ladder', 'tax', 'soil'],
      same: 'shock', lookalikes: ['surmise', 'suppress'], wrong: ['suprise', 'surprize'],
      tricky: [0, 'r-vowel', 'There is an r in the first beat: SUR + prise. Do not skip it.'], pics: ['🎁', '😮', '🎉'],
    }),
  w(1, 5, 'embarrass', 'em|bar|rass', 'em|bair|us', 'v', 'to make someone feel awkward or ashamed',
    'To make someone go red in the face in front of other people.', 'It would {embarrass} me to sing in public.', {
      topics: ['feelings', 'people'], links: ['blushing', 'awkward', 'red face', 'shame'], not: ['gardening', 'battery', 'bridge'],
      lookalikes: ['embrace', 'harass'], wrong: ['embarass', 'embaress'],
      tricky: [2, 'double', 'Two r’s and two s’s: you go Really Red and So Shy.'], pics: ['😳', '🙈', '😅'],
    }),

  // ── Body and health ───────────────────────────────────────────
  w(1, 3, 'allergy', 'al|ler|gy', 'al|er|jee', 'n', 'when your body reacts badly to something harmless',
    'When pollen, nuts or cats make you sneeze, itch or come out in a rash.', 'He has a nut {allergy}, so check the label.', {
      topics: ['body', 'food'], links: ['sneezing', 'pollen', 'rash', 'doctor'], not: ['carpet', 'violin', 'mortgage'],
      lookalikes: ['allegory', 'energy'], wrong: ['alergy', 'allergey'],
      tricky: [1, 'double', 'Two l’s, then e-r-g-y, the same ending as energy.'], pics: ['🤧', '🥜', '🌼'],
    }),
  w(1, 3, 'stomach', 'stom|ach', 'stum|uk', 'n', 'the part of your body where food goes',
    'The part of your body that rumbles when you are hungry.', 'My {stomach} hurts after that huge lunch.', {
      topics: ['body'], links: ['belly', 'digestion', 'hunger', 'tummy'], not: ['curtain', 'keyboard', 'harbor'],
      same: 'belly', lookalikes: ['stomp', 'stamina'], wrong: ['stomack', 'stumach'],
      tricky: [1, 'ph-ch', 'The k sound at the end is spelled c-h, as in ache. A stomACH can ACHe.'], pics: ['🤢', '🍔', '😋'],
    }),
  w(1, 3, 'muscle', 'mus|cle', 'mus|ul', 'n', 'body tissue that pulls to make you move',
    'What gets bigger and stronger in your arms when you lift weights.', 'I pulled a {muscle} in my back lifting that box.', {
      topics: ['body', 'sport'], links: ['strength', 'arm', 'gym', 'tendon'], not: ['envelope', 'soup', 'lamp'],
      lookalikes: ['mussel', 'muzzle'], wrong: ['mussle', 'muscel'],
      tricky: [1, 'silent', 'A silent c. Think of “muscular”, where you can hear it.'], pics: ['💪', '🏋️', '🦵'],
      also: { sport: 'Stretch each {muscle} before you run.' },
    }),
  w(1, 3, 'pharmacy', 'phar|ma|cy', 'far|muh|see', 'n', 'a shop where you get medicines',
    'The shop where you hand over a prescription and collect your medicine.', 'The {pharmacy} closes at six, so hurry.', {
      topics: ['body', 'society'], links: ['medicine', 'prescription', 'pills', 'drugstore'], not: ['tractor', 'trumpet', 'beach'],
      same: 'drugstore', lookalikes: ['farmer', 'primacy'], wrong: ['farmacy', 'pharmasy'],
      tricky: [0, 'ph-ch', 'The f sound is spelled p-h, and the “see” at the end is c-y.'], pics: ['💊', '🏥', '🩹'],
    }),

  // ── Nature ────────────────────────────────────────────────────
  w(1, 3, 'island', 'is|land', 'eye|lund', 'n', 'land with water all around it',
    'A piece of ground with sea on every side.', 'We took the ferry out to the {island}.', {
      topics: ['nature', 'travel'], links: ['sea', 'beach', 'ferry', 'coast'], not: ['elevator', 'sandwich', 'sweater'],
      lookalikes: ['inland', 'aisle'], wrong: ['iland', 'ilsand'],
      tricky: [0, 'silent', 'A silent s. An island IS LAND in the water.'], pics: ['🏝️', '🌊', '⛴️'],
    }),
  w(1, 3, 'temperature', 'tem|per|a|ture', 'tem|per|uh|cher', 'n', 'how hot or cold something is',
    'The number that tells you how hot or cold it is.', 'The {temperature} dropped below freezing last night.', {
      topics: ['nature', 'body'], links: ['heat', 'thermometer', 'weather', 'fever'], not: ['necklace', 'sofa', 'receipt'],
      lookalikes: ['temperament', 'temporary'], wrong: ['temprature', 'tempature'],
      tricky: [1, 'schwa', 'Do not skip the middle: tem + per + a + ture. Keep your temper.'], pics: ['🌡️', '☀️', '❄️'],
      also: { body: 'The nurse took his {temperature} twice.' },
    }),
  w(1, 3, 'lightning', 'light|ning', 'lyt|ning', 'n', 'a flash of electricity in the sky in a storm',
    'The bright flash in the sky just before the thunder.', 'We counted the seconds between the {lightning} and the thunder.', {
      topics: ['nature'], links: ['thunder', 'storm', 'flash', 'sky'], not: ['sofa', 'salary', 'spoon'],
      lookalikes: ['lightening', 'lighting'], wrong: ['lightining', 'litening'],
      tricky: [1, 'odd', 'No e in the middle: light + ning. “Lightening” means making something lighter.'], pics: ['⚡', '⛈️', '🌩️'],
    }),

  // ── Money ─────────────────────────────────────────────────────
  w(1, 5, 'receipt', 're|ceipt', 'ruh|seet', 'n', 'a slip of paper showing what you paid',
    'The slip of paper the cashier hands you after you pay.', 'Keep the {receipt} in case the shoes do not fit.', {
      topics: ['money'], links: ['payment', 'shopping', 'cashier', 'refund'], not: ['mountain', 'pillow', 'violin'],
      lookalikes: ['recipe', 'reception'], wrong: ['reciept', 'receit'],
      tricky: [1, 'silent', 'After c it is e before i, plus a silent p. Picture the P as the Paper slip.'], pics: ['🧾', '💳', '🛒'],
      also: { work: 'Attach the {receipt} to your expense form.' },
    }),
  w(1, 3, 'coupon', 'cou|pon', 'koo|pon', 'n', 'a ticket that gives you money off',
    'A printed or digital ticket that gets you money off at the store.', 'I have a {coupon} for two pizzas for the price of one.', {
      topics: ['money'], links: ['discount', 'shopping', 'savings', 'voucher'], not: ['pillow', 'bridge', 'haircut'],
      same: 'voucher', lookalikes: ['couple', 'cocoon'], wrong: ['coopon', 'cupon'],
      tricky: [0, 'vowel-team', 'The “oo” sound is spelled o-u, as in soup and group.'], pics: ['🎟️', '💸', '🛍️'],
    }),
  w(1, 2, 'deposit', 'de|pos|it', 'duh|poz|it', 'n', 'money you pay first to hold something',
    'Money you pay up front to hold a rental, which you hope to get back.', 'We paid a {deposit} on the apartment today.', {
      topics: ['money', 'home'], links: ['bank', 'rent', 'payment', 'savings'], not: ['sweater', 'orchestra', 'gravel'],
      lookalikes: ['depot', 'opposite'], wrong: ['deposite', 'diposit'],
      tricky: [0, 'schwa', 'The first beat sounds like “duh” but is spelled d-e. And no e on the end.'], pics: ['🏦', '💰', '🔑'],
      also: { travel: 'The hotel holds a {deposit} on your card until checkout.' },
    }),
  w(1, 4, 'business', 'busi|ness', 'biz|nus', 'n', 'a company, or the work of buying and selling',
    'A shop, a firm or a company that sells things to make money.', 'She runs a small {business} from her kitchen.', {
      topics: ['work', 'money'], links: ['company', 'customers', 'profit', 'shop'], not: ['pillow', 'rainbow', 'ankle'],
      lookalikes: ['busyness', 'baseness'], wrong: ['buisness', 'bizness'],
      tricky: [0, 'ending', 'It is “busy” with the y changed to i, then “ness”: busi + ness.'], pics: ['💼', '🏪', '📈'],
    }),

  // ── Time and plans ────────────────────────────────────────────
  w(1, 3, 'appointment', 'ap|point|ment', 'uh|poynt|munt', 'n', 'a set time to see someone',
    'A time you book to see the doctor, dentist or hairdresser.', 'My dentist {appointment} is at nine on Friday.', {
      topics: ['work', 'body'], links: ['calendar', 'doctor', 'booking', 'time slot'], not: ['mushroom', 'anchor', 'blanket'],
      lookalikes: ['apartment', 'ointment'], wrong: ['apointment', 'appointmant'],
      tricky: [0, 'double', 'Two p’s at the start: ap + point + ment.'], pics: ['📅', '🦷', '⏰'],
    }),
  w(1, 4, 'schedule', 'sched|ule', 'skej|ool', 'n', 'a plan of what happens and when',
    'A list or plan that shows what happens at what time.', 'Check the bus {schedule} before you leave.', {
      topics: ['work', 'travel'], links: ['plan', 'times', 'calendar', 'agenda'], not: ['pillow', 'onion', 'glove'],
      same: 'timetable', lookalikes: ['scheme', 'module'], wrong: ['shedule', 'schedual'],
      tricky: [0, 'ph-ch', 's-c-h says “sk” here, the same as in school.'], pics: ['📅', '🕒', '🚌'],
      also: { work: 'My {schedule} is full until Thursday.' },
    }),
  w(1, 3, 'calendar', 'cal|en|dar', 'kal|un|der', 'n', 'a chart of the days and months of a year',
    'The chart on the wall or phone that shows the days and months.', 'Mark the party on the {calendar}.', {
      topics: ['work', 'home'], links: ['dates', 'months', 'planner', 'diary'], not: ['sandwich', 'wrench', 'ocean'],
      lookalikes: ['colander', 'cylinder'], wrong: ['calander', 'calandar'],
      tricky: [2, 'r-vowel', 'It ends d-a-r, and the middle is e-n. A calenDAR shows each DAy of the yeaR.'], pics: ['📅', '🗓️', '📆'],
    }),
  w(1, 2, 'minute', 'min|ute', 'min|it', 'n', 'sixty seconds',
    'Sixty seconds make one of these.', 'Wait a {minute}; I left my keys inside.', {
      topics: ['work', 'home'], links: ['seconds', 'clock', 'hour', 'timer'], not: ['sandwich', 'carpet', 'forest'],
      lookalikes: ['minuet', 'mint'], wrong: ['minit', 'minuite'],
      tricky: [1, 'schwa', 'The end sounds like “it” but is spelled u-t-e.'], pics: ['⏱️', '⏰', '⌛'],
      also: { sport: 'They scored in the last {minute} of the game.' },
    }),
  w(1, 3, 'tomorrow', 'to|mor|row', 'tuh|mor|oh', 'adv', 'on the day after today',
    'The day that comes after today.', 'I will call you {tomorrow} morning.', {
      topics: ['home', 'work'], links: ['next day', 'today', 'future', 'morning'], not: ['spoon', 'zebra', 'cement'],
      opposite: 'yesterday', lookalikes: ['borrow', 'sorrow'], wrong: ['tommorow', 'tomorow'],
      tricky: [2, 'double', 'One m, two r’s. Split it up: to + mor + row.'], pics: ['🌅', '📅', '⏭️'],
    }),

  // ── Travel ────────────────────────────────────────────────────
  w(1, 4, 'souvenir', 'sou|ve|nir', 'soo|vuh|neer', 'n', 'a thing you keep to remember a place',
    'A small thing you buy on a trip to remember the place.', 'I bought a fridge magnet as a {souvenir}.', {
      topics: ['travel'], links: ['vacation', 'gift shop', 'memory', 'keepsake'], not: ['invoice', 'plumbing', 'broccoli'],
      same: 'keepsake', lookalikes: ['sovereign', 'severe'], wrong: ['souviner', 'suvenir'],
      tricky: [0, 'vowel-team', 'The “oo” sound is spelled o-u, as in soup. The end is n-i-r.'], pics: ['🗽', '🎁', '🧲'],
    }),
  w(1, 3, 'luggage', 'lug|gage', 'lug|ij', 'n', 'the bags you take when you travel',
    'All the suitcases and bags you take on a trip.', 'Our {luggage} did not arrive on the same flight.', {
      topics: ['travel'], links: ['suitcase', 'airport', 'packing', 'baggage'], not: ['sofa', 'tooth', 'recipe'],
      same: 'baggage', lookalikes: ['language', 'leakage'], wrong: ['lugage', 'luggadge'],
      tricky: [1, 'double', 'Two g’s: you LUG your bagGAGE. The “ij” at the end is spelled a-g-e.'], pics: ['🧳', '✈️', '🎒'],
    }),

  // ── Tech ──────────────────────────────────────────────────────
  w(1, 1, 'password', 'pass|word', 'pass|werd', 'n', 'secret letters or numbers that let you in',
    'The secret string of letters and numbers you type to log in.', 'I forgot the {password} for my email again.', {
      topics: ['tech'], links: ['login', 'secret', 'account', 'security'], not: ['sandwich', 'saddle', 'river'],
      lookalikes: ['passport', 'passed'], wrong: ['pasword', 'passwerd'],
      tricky: [0, 'double', 'Two s’s. It is simply pass + word.'], pics: ['🔑', '🔒', '💻'],
    }),
  w(1, 2, 'battery', 'bat|ter|y', 'bat|uh|ree', 'n', 'a small store of power for a device',
    'What runs flat in your phone and needs charging.', 'My phone {battery} is down to five percent.', {
      topics: ['tech'], links: ['charger', 'power', 'phone', 'energy'], not: ['salad', 'pillow', 'river'],
      lookalikes: ['buttery', 'battle'], wrong: ['batery', 'battary'],
      tricky: [1, 'double', 'Two t’s, then e-r-y: bat + ter + y.'], pics: ['🔋', '🔌', '📱'],
      also: { home: 'The smoke alarm needs a new {battery}.' },
    }),

  // ── Music, art and sport ──────────────────────────────────────
  w(1, 3, 'guitar', 'gui|tar', 'gih|tar', 'n', 'an instrument with six strings that you strum',
    'The six-stringed instrument you strum or pluck.', 'He plays {guitar} in a band on weekends.', {
      topics: ['arts'], links: ['strings', 'music', 'band', 'strumming'], not: ['oven', 'tax', 'ladder'],
      lookalikes: ['gutter', 'quitter'], wrong: ['gitar', 'guitare'],
      tricky: [0, 'silent', 'A silent u follows the g, as in guess and guide.'], pics: ['🎸', '🎶', '🎤'],
    }),
  w(1, 4, 'beautiful', 'beau|ti|ful', 'byoo|tuh|ful', 'adj', 'very pleasing to look at or hear',
    'More than pretty: so lovely that you stop and stare.', 'What a {beautiful} sunset.', {
      topics: ['arts', 'nature'], links: ['lovely', 'sunset', 'pretty', 'art'], not: ['invoice', 'wrench', 'mud'],
      same: 'lovely', opposite: 'ugly', lookalikes: ['bountiful', 'dutiful'], wrong: ['beutiful', 'beautifull'],
      tricky: [0, 'vowel-team', 'b-e-a-u: Big Elephants Are Useful. And only one l at the end.'], pics: ['🌅', '🌸', '😍'],
      also: { arts: 'She has a {beautiful} singing voice.' },
    }),
  w(1, 3, 'favorite', 'fa|vor|ite', 'fay|ver|it', 'adj', 'liked more than all the others',
    'The one you like best out of all of them.', 'Blue is my {favorite} color.', {
      topics: ['feelings', 'arts'], links: ['best', 'choice', 'top pick', 'preference'], not: ['gravel', 'elbow', 'tax'],
      lookalikes: ['favorable', 'forfeit'], wrong: ['favrite', 'faverit'],
      tricky: [2, 'schwa', 'It ends i-t-e, though it sounds like “it”. And keep the o: fa + vor + ite.'], pics: ['⭐', '❤️', '🏆'],
      also: { food: 'Lasagna is my {favorite} meal.' },
    }),
  w(1, 4, 'exercise', 'ex|er|cise', 'ek|ser|syz', 'n', 'movement you do to stay fit',
    'Running, swimming, lifting: activity you do to keep your body fit.', 'A little {exercise} every day helps me sleep.', {
      topics: ['sport', 'body'], links: ['gym', 'fitness', 'running', 'workout'], not: ['curtain', 'envelope', 'soup'],
      same: 'workout', lookalikes: ['exorcise', 'excise'], wrong: ['excercise', 'exersize'],
      tricky: [2, 'soft-cg', 'No c after the x. The only c is near the end: ex + er + cise.'], pics: ['🏃', '🏋️', '🚴'],
    }),
  w(1, 3, 'athlete', 'ath|lete', 'ath|leet', 'n', 'a person who trains and competes in sports',
    'A person who trains hard and competes in sports.', 'She trains like a professional {athlete}.', {
      topics: ['sport', 'people'], links: ['sports', 'training', 'race', 'team'], not: ['teapot', 'carpet', 'invoice'],
      lookalikes: ['atheist', 'delete'], wrong: ['athelete', 'athleet'],
      tricky: [1, 'schwa', 'Two beats only: ath + lete. Do not slip an extra e into the middle.'], pics: ['🏅', '🏃', '🏊'],
    }),

  // ── Thinking words ────────────────────────────────────────────
  w(1, 5, 'definitely', 'def|i|nite|ly', 'def|uh|nit|lee', 'adv', 'for sure, without any doubt',
    'What you say instead of “yes, for sure, no doubt at all”.', 'That is {definitely} the best pizza in town.', {
      topics: ['mind'], links: ['certain', 'for sure', 'no doubt', 'absolutely'], not: ['ladder', 'potato', 'glove'],
      same: 'certainly', opposite: 'maybe', lookalikes: ['defiantly', 'infinitely'], wrong: ['definately', 'definatly'],
      tricky: [2, 'schwa', 'It has “finite” inside: de + finite + ly. There is no a anywhere.'], pics: ['✅', '💯', '👍'],
    }),
  w(1, 3, 'probably', 'prob|a|bly', 'prob|uh|blee', 'adv', 'likely, but not certain',
    'More likely than not, but you would not bet your house on it.', 'It will {probably} rain this afternoon.', {
      topics: ['mind'], links: ['likely', 'chance', 'maybe', 'guess'], not: ['spoon', 'anchor', 'carpet'],
      same: 'likely', lookalikes: ['provably', 'properly'], wrong: ['probly', 'probally'],
      tricky: [1, 'schwa', 'Three beats: prob + a + bly. Do not skip the middle a.'], pics: ['🤔', '🌦️', '🎲'],
    }),
  w(1, 3, 'enough', 'e|nough', 'ih|nuf', 'adj', 'as much as is needed',
    'As much as you need, and no more.', 'Is there {enough} milk for breakfast?', {
      topics: ['home', 'food'], links: ['plenty', 'sufficient', 'full', 'amount'], not: ['ladder', 'violin', 'zebra'],
      same: 'plenty', lookalikes: ['rough', 'tough'], wrong: ['enuff', 'enugh'],
      tricky: [1, 'ough', 'The “uff” sound is spelled o-u-g-h, as in rough and tough.'], pics: ['🥛', '✋', '👌'],
      also: { money: 'We have saved {enough} for the trip.' },
    }),
  w(1, 3, 'different', 'dif|fer|ent', 'dif|er|unt', 'adj', 'not the same',
    'Not the same as the other one.', 'Try a {different} key; that one is stuck.', {
      topics: ['mind'], links: ['unlike', 'change', 'variety', 'contrast'], not: ['soup', 'sock', 'anchor'],
      opposite: 'same', lookalikes: ['difficult', 'definite'], wrong: ['diffrent', 'differant'],
      tricky: [2, 'ant-ent', 'Do not skip the middle: dif + fer + ent. It ends e-n-t.'], pics: ['🔀', '🎭', '🌈'],
    }),
  w(1, 3, 'believe', 'be|lieve', 'bih|leev', 'v', 'to think something is true',
    'To feel sure that something is true, even without proof.', 'I {believe} you; you do not have to explain.', {
      topics: ['mind', 'feelings'], links: ['trust', 'faith', 'truth', 'opinion'], not: ['carpet', 'onion', 'wrench'],
      opposite: 'doubt', lookalikes: ['relieve', 'beehive'], wrong: ['beleive', 'belive'],
      tricky: [1, 'ei-ie', 'i before e. Never beLIEve a LIE: l-i-e is hiding inside.'], pics: ['🙏', '💭', '✨'],
    }),
  w(1, 3, 'weird', 'weird', 'weerd', 'adj', 'strange in a way that is hard to explain',
    'Strange, odd, a bit creepy: not normal at all.', 'That milk smells {weird}; do not drink it.', {
      topics: ['feelings', 'mind'], links: ['strange', 'odd', 'spooky', 'unusual'], not: ['invoice', 'ladder', 'breakfast'],
      same: 'strange', opposite: 'normal', lookalikes: ['wired', 'weir'], wrong: ['wierd', 'weerd'],
      tricky: [0, 'ei-ie', 'Weird breaks the rule: e comes before i. WE are weird.'], pics: ['👽', '🤨', '👻'],
    }),
  w(1, 5, 'necessary', 'nec|es|sar|y', 'nes|uh|sair|ee', 'adj', 'needed; you cannot do without it',
    'Something you really must have or do; you cannot skip it.', 'Is it {necessary} to book ahead?', {
      topics: ['mind', 'work'], links: ['needed', 'essential', 'must', 'required'], not: ['balloon', 'puddle', 'ribbon'],
      same: 'needed', opposite: 'optional', lookalikes: ['accessory', 'emissary'], wrong: ['neccessary', 'necesary'],
      tricky: [1, 'double', 'One c, two s’s: a shirt has one Collar and two Sleeves.'], pics: ['❗', '✅', '🔑'],
      also: { travel: 'A visa is {necessary} for stays over ninety days.' },
    }),
  w(1, 3, 'answer', 'an|swer', 'an|ser', 'n', 'what you say or write back to a question',
    'What you give back when someone puts a question to you.', 'Nobody knew the {answer} to the last question.', {
      topics: ['mind'], links: ['question', 'reply', 'quiz', 'solution'], not: ['curtain', 'soup', 'wheel'],
      same: 'reply', lookalikes: ['anger', 'ancestor'], wrong: ['anser', 'awnser'],
      tricky: [1, 'silent', 'A silent w: s-w-e-r, like “swear”. You swear your answer is true.'], pics: ['💬', '✅', '❓'],
    }),
  w(1, 4, 'separate', 'sep|a|rate', 'sep|uh|rayt', 'v', 'to move things apart',
    'To pull things apart so they are no longer together.', 'Please {separate} the whites from the colors before washing.', {
      topics: ['mind', 'home'], links: ['apart', 'divide', 'split', 'sort'], not: ['violin', 'soup', 'bridge'],
      same: 'divide', opposite: 'join', lookalikes: ['desperate', 'operate'], wrong: ['seperate', 'seperat'],
      tricky: [1, 'schwa', 'There is “a rat” in sep-A-RAT-e.'], pics: ['✂️', '↔️', '🧺'],
    }),

  // ── Out in the world ──────────────────────────────────────────
  w(1, 4, 'Wednesday', 'Wednes|day', 'wenz|day', 'n', 'the day between Tuesday and Thursday',
    'The middle day of the work week, after Tuesday.', '{Wednesday} comes right after Tuesday.', {
      topics: ['society', 'work'], links: ['midweek', 'Tuesday', 'Thursday', 'weekday'], not: ['spoon', 'engine', 'sleeve'],
      lookalikes: ['wedding', 'weekday'], wrong: ['Wensday', 'Wendsday'],
      tricky: [0, 'silent', 'Say it the way it is spelled as you write: Wed + nes + day.'], pics: ['📅', '📆', '🗓️'],
    }),
  w(1, 4, 'February', 'Feb|ru|ar|y', 'feb|roo|air|ee', 'n', 'the second month of the year',
    'The second and shortest month of the year.', '{February} has only 28 days most years.', {
      topics: ['society', 'nature'], links: ['month', 'winter', 'January', 'leap year'], not: ['fork', 'engine', 'sock'],
      lookalikes: ['January', 'feathery'], wrong: ['Febuary', 'Feburary'],
      tricky: [1, 'silent', 'Do not skip the first r: Feb + ru + ary. “Brr”, it is cold in FeBRuary.'], pics: ['❄️', '💘', '📅'],
    }),
  w(1, 3, 'library', 'li|brar|y', 'ly|brair|ee', 'n', 'a place where you borrow books',
    'The quiet building where you borrow books for free.', 'I have to return these books to the {library} on Monday.', {
      topics: ['society', 'arts'], links: ['books', 'borrowing', 'shelves', 'reading'], not: ['tractor', 'soup', 'glove'],
      lookalikes: ['liberty', 'literary'], wrong: ['libary', 'librery'],
      tricky: [1, 'r-vowel', 'Two r’s: li + brar + y. Do not drop the first one.'], pics: ['📚', '🏛️', '🤫'],
    }),
  w(1, 3, 'address', 'ad|dress', 'ad|dres', 'n', 'the details of where a place is',
    'The house number, street and town you write on a letter.', 'What is your new {address}?', {
      topics: ['society', 'home'], links: ['street', 'house number', 'zip code', 'mail'], not: ['trumpet', 'lemon', 'knee'],
      lookalikes: ['actress', 'undress'], wrong: ['adress', 'addres'],
      tricky: [0, 'double', 'Two d’s and two s’s: ADD your DRESS.'], pics: ['🏠', '📮', '📍'],
      also: { tech: 'Type your email {address} in the first box.' },
    }),
  w(1, 4, 'receive', 're|ceive', 'ruh|seev', 'v', 'to get something that is given or sent',
    'To be given something, or to get it in the mail.', 'Did you {receive} my message last night?', {
      topics: ['society', 'work'], links: ['getting', 'delivery', 'gift', 'mail'], not: ['mountain', 'soup', 'hammer'],
      same: 'get', opposite: 'send', lookalikes: ['deceive', 'relieve'], wrong: ['recieve', 'receeve'],
      tricky: [1, 'ei-ie', 'After c it is e before i: c-e-i.'], pics: ['📬', '🎁', '📥'],
      also: { work: 'You will {receive} your contract by email.' },
    }),
  // ── More everyday words ───────────────────────────────────────
  w(1, 3, 'bicycle', 'bi|cy|cle', 'by|sih|kul', 'n', 'a two-wheeled vehicle you pedal',
    'The two-wheeled thing you pedal, with handlebars and a chain.', 'She rides her {bicycle} to the station every morning.', {
      topics: ['sport', 'travel'], links: ['pedals', 'two wheels', 'helmet', 'handlebars'], not: ['teapot', 'curtain', 'invoice'],
      lookalikes: ['icicle', 'recycle'], wrong: ['bycicle', 'bicicle'],
      tricky: [1, 'y-vowel', 'Bi means two, cycle means wheel. The short i in the middle is spelled y: c-y.'], pics: ['🚲', '🚴', '⛑️'],
    }),
  w(1, 3, 'ceiling', 'ceil|ing', 'seel|ing', 'n', 'the top inside surface of a room',
    'The flat surface above your head when you are indoors.', 'There is a water stain on the bathroom {ceiling}.', {
      topics: ['home'], links: ['room', 'overhead', 'light fixture', 'plaster'], not: ['shoelace', 'river', 'ticket'],
      opposite: 'floor', lookalikes: ['sealing', 'ceasing'], wrong: ['cieling', 'sealling'],
      tricky: [0, 'ei-ie', 'After c it is e before i: c-e-i, the same as “receive”.'], pics: ['🏠', '💡', '🔝'],
    }),
  w(1, 3, 'daughter', 'daugh|ter', 'daw|ter', 'n', 'a person’s female child',
    'What a girl or woman is to her mother and father.', 'Their {daughter} starts school in September.', {
      topics: ['people'], links: ['family', 'child', 'parents', 'girl'], not: ['wrench', 'gravel', 'battery'],
      opposite: 'son', lookalikes: ['laughter', 'slaughter'], wrong: ['dawter', 'daugter'],
      tricky: [0, 'ough', 'The “aw” sound is spelled a-u-g-h, with a silent g-h, as in “caught” and “taught”.'], pics: ['👧', '👪', '🎀'],
    }),
  w(1, 3, 'musician', 'mu|si|cian', 'myoo|zish|un', 'n', 'a person who plays or writes songs and tunes',
    'Someone who plays an instrument or sings, often for a living.', 'The {musician} tuned her violin before the concert.', {
      topics: ['arts'], links: ['instrument', 'band', 'concert', 'singer'], not: ['ladder', 'receipt', 'pillow'],
      lookalikes: ['magician', 'physician'], wrong: ['musicion', 'musition'],
      tricky: [2, 'shun', 'The “shun” is spelled c-i-a-n, as it is for people: magician, electrician.'], pics: ['🎸', '🎻', '🎤'],
    }),
  w(1, 3, 'comfortable', 'com|fort|a|ble', 'kum|fert|uh|bul', 'adj', 'feeling relaxed, with no pain or worry',
    'How a soft chair, old slippers or a good bed feel.', 'These shoes are {comfortable} enough to walk in all day.', {
      topics: ['home', 'feelings'], links: ['sofa', 'soft', 'slippers', 'relaxed'], not: ['thunder', 'invoice', 'hammer'],
      same: 'cozy', opposite: 'painful', lookalikes: ['comparable', 'compatible'], wrong: ['comftable', 'comfterble'],
      tricky: [2, 'able-ible', 'It is the whole word “comfort” plus a-b-l-e. Say com-FORT-a-ble to hear every letter.'], pics: ['🛋️', '🧦', '😌'],
    }),
  w(1, 2, 'headphones', 'head|phones', 'hed|fohnz', 'n', 'small speakers you wear over or in your ears',
    'What you put over your ears to listen without anyone else hearing.', 'I put on my {headphones} to listen to the podcast.', {
      topics: ['tech', 'arts'], links: ['listening', 'ears', 'songs', 'volume'], not: ['spoon', 'fence', 'carpet'],
      lookalikes: ['headstones', 'telephones'], wrong: ['headfones', 'hedphones'],
      tricky: [1, 'ph-ch', 'The f sound is spelled p-h, the same as in “phone” and “photo”.'], pics: ['🎧', '🎵', '👂'],
    }),
];
