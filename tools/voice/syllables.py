"""Splits a Kokoro phoneme string into the bank's beats, guided by the respelling.

The bank already says where a word breaks ('sep|uh|rayt'). The speech model says which sounds the word
has ('sˈɛpəɹˌAt'). Every beat owns exactly one vowel sound; the consonants between two vowels are shared
out the way the respelling shares them, so the audio is cut where the tiles are.
"""
import re

VOWELS = set('əiuɑɔɛɜɪʊʌæAIOWYᵊᵻɐ')
STRESS = set('ˈˌ')

# Kokoro (misaki) phoneme -> the aligner's ARPAbet phone.
ARPA = {
    'b': 'B', 'd': 'D', 'f': 'F', 'h': 'HH', 'j': 'Y', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'p': 'P', 's': 'S', 't': 'T',
    'v': 'V', 'w': 'W', 'z': 'Z', 'ɡ': 'G', 'ŋ': 'NG', 'ɹ': 'R', 'ʃ': 'SH', 'ʒ': 'ZH', 'ð': 'DH', 'θ': 'TH', 'ʤ': 'JH', 'ʧ': 'CH',
    'T': 'T', 'ɾ': 'T', 'ʔ': 'T',
    'ə': 'AH', 'i': 'IY', 'u': 'UW', 'ɑ': 'AA', 'ɔ': 'AO', 'ɛ': 'EH', 'ɜ': 'ER', 'ɪ': 'IH', 'ʊ': 'UH', 'ʌ': 'AH', 'æ': 'AE',
    'A': 'EY', 'I': 'AY', 'O': 'OW', 'W': 'AW', 'Y': 'OY', 'ᵊ': 'AH', 'ᵻ': 'IH', 'ɐ': 'AH',
}

# Respelled vowel -> the vowel sounds it may stand for. Only used to flag a likely wrong reading
# (the verb 'separate' read as the adjective); a full vowel against a lazy one is not an error.
SAY_VOWEL = {
    'uh': 'əʌᵊᵻɪ', 'ih': 'ɪəᵻiᵊ', 'ee': 'iɪ', 'ay': 'A', 'eye': 'I', 'y': 'I', 'oh': 'O', 'oo': 'uʊ', 'ow': 'W', 'oy': 'Y',
    'aw': 'ɔɑ', 'ah': 'ɑ', 'a': 'æɛə', 'e': 'ɛɪəᵊ', 'i': 'ɪᵻəᵊ', 'o': 'ɑɔə', 'u': 'ʌəᵊʊᵻ', 'er': 'ɜə', 'ur': 'ɜə', 'ir': 'ɜəɪ',
    'ar': 'ɑ', 'or': 'ɔOɑ', 'air': 'ɛ', 'eer': 'ɪi', 'oor': 'ʊuɔ',
}


def _is_vowel_at(s, i):
    c = s[i]
    if c in 'aeiou':
        return True
    return c == 'y' and not (i + 1 < len(s) and s[i + 1] in 'aeiou')


def _sounds(run):
    run = re.sub(r'(.)\1', r'\1', run)  # 'pass' ends in one s
    return len(re.sub(r'sh|ch|th|zh|ng', 'X', run))


def say_shape(say):
    """(consonant sounds before the vowel, the vowel as respelled, consonant sounds after it)."""
    s = say.lower()
    vi = [i for i in range(len(s)) if _is_vowel_at(s, i)]
    if not vi:
        return _sounds(s), '', 0
    lead, tail = s[:vi[0]], s[vi[-1] + 1:]
    vowel = s[vi[0]:vi[-1] + 1]
    if tail[:1] in ('h', 'w'):  # uh, ah, oh / aw, ow: part of the vowel
        vowel, tail = vowel + tail[0], tail[1:]
    if tail[:1] == 'r':
        vowel += 'r'
    return _sounds(lead), vowel, _sounds(tail)


def _edge(say, last):
    """The consonant letters that close (`last`) or open a respelled beat, digraphs kept whole."""
    s = say.lower()
    vi = [i for i in range(len(s)) if _is_vowel_at(s, i)]
    if not vi:
        return ''
    run = s[vi[-1] + 1:].lstrip('hw') if last else s[:vi[0]]
    units = re.findall(r'sh|ch|th|zh|ng|.', re.sub(r'(.)\1', r'\1', run))
    return (units[-1] if last else units[0]) if units else ''


def split(phonemes, says):
    """(beats, shared): one phoneme string per beat (stress marks kept), and for each boundary whether
    the consonant that opens the next beat also closes this one ('ad|dres': the d belongs to both).
    Raises ValueError when the vowel sounds and the beats do not match up.
    """
    ph = [c for c in phonemes if c != ' ']
    nuc = [i for i, c in enumerate(ph) if c in VOWELS]
    if len(nuc) != len(says):
        raise ValueError(f'{len(nuc)} vowel sounds for {len(says)} beats')
    shapes = [say_shape(s) for s in says]
    cuts, shared = [], []
    for a in range(len(nuc) - 1):
        cons = [i for i in range(nuc[a] + 1, nuc[a + 1]) if ph[i] not in STRESS]
        k, after, before = len(cons), shapes[a][2], shapes[a + 1][0]
        both = False
        if after + before == k:
            left = after
        elif after + before > k:
            # The respelling writes more consonants than are said. The next beat keeps its opening.
            left = max(0, k - before)
            closes, opens = _edge(says[a], True), _edge(says[a + 1], False)
            both = after + before == k + 1 and before <= k and (closes == opens or (closes, opens) in (('t', 'ch'), ('d', 'j')))
        elif before:
            left = k - before  # sounds the respelling leaves out open the next beat
        else:
            left = k  # the next beat starts on its vowel
        cut = cons[left] if left < k else nuc[a + 1]
        while cut > 0 and ph[cut - 1] in STRESS:  # a stress mark travels with the sound after it
            cut -= 1
        cuts.append(cut)
        shared.append(both)
    out, prev = [], 0
    for c in cuts + [len(ph)]:
        out.append(''.join(ph[prev:c]))
        prev = c
    return out, shared


def vowel_note(beat, say):
    """'' when the beat's vowel fits its respelling, else a short note for the review list."""
    v = say_shape(say)[1]
    nucleus = next(c for c in beat if c in VOWELS)
    allowed = SAY_VOWEL.get(v) or SAY_VOWEL.get(v.rstrip('r'))
    return '' if allowed is None or nucleus in allowed else f'{say}~{beat}'


def arpa(beat):
    """ARPAbet phones of one beat."""
    s = [c for c in beat if c not in STRESS]
    out, i = [], 0
    while i < len(s):
        if s[i] in 'ɜə' and i + 1 < len(s) and s[i + 1] == 'ɹ' and (i + 2 == len(s) or s[i + 2] not in VOWELS):
            out.append('ER')
            i += 2
        else:
            out.append(ARPA[s[i]])
            i += 1
    return out
