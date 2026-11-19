"""Listens to a take and says how far it is from the sounds it should have.

The voice is steady on whole words but can wander on a lone syllable: given 'lˈʌ' ("luh") it may say
"lie". Every beat is therefore recorded a few ways, and this picks the take that sounds most like the
beat. The listener is a phoneme recogniser (facebook/wav2vec2-xlsr-53-espeak-cv-ft, Apache 2.0) that
writes down the sounds it hears; the score is the edit distance between that and the beat's phonemes,
with near vowels counted as the same (the recogniser writes the 'uh' of "luck" as 'aː').
"""
import json
import re

import numpy as np
import torch
from huggingface_hub import hf_hub_download
from scipy.signal import resample_poly
from transformers import Wav2Vec2ForCTC

REPO = 'facebook/wav2vec2-xlsr-53-espeak-cv-ft'
_model = None
_vocab = None

# Both sides are reduced to one letter per sound. Vowels fall into broad classes, because the beat's
# vowel only has to be the right kind (a monophthong 'uh', not the diphthong 'eye').
HEARD = [
    ('dʒ', 'J'), ('tʃ', 'C'), ('ts', 's'), ('aɪə', 'I'), ('aɪɚ', 'IR'), ('aɪ', 'I'), ('ai', 'I'), ('eɪ', 'A'), ('ei', 'A'),
    ('oʊ', 'O'), ('əʊ', 'O'), ('ou', 'O'), ('aʊ', 'W'), ('au', 'W'), ('ɔɪ', 'Y'), ('oɪ', 'Y'), ('ɚ', 'R'), ('ɝ', 'R'),
    ('ər', 'R'), ('ɜɹ', 'R'), ('ʌɹ', 'R'), ('əɹ', 'R'), ('ɜ', 'R'), ('əl', 'al'), ('l̩', 'al'), ('n̩', 'an'), ('ɾ', 't'), ('r', 'r'), ('ɹ', 'r'), ('ɫ', 'l'),
    ('ŋ', 'G'), ('ʃ', 'S'), ('ʒ', 'Z'), ('θ', 'T'), ('ð', 'D'), ('ɡ', 'g'),
]
VOWEL_CLASS = {
    **dict.fromkeys('əʌaɐɑɒä', 'a'), **dict.fromkeys('ɛeæ', 'E'), **dict.fromkeys('iɪᵻɨy', 'i'),
    **dict.fromkeys('uʊɯʉ', 'u'), **dict.fromkeys('ɔoɵ', 'o'),
}
# Kokoro (misaki) phonemes, same reduction.
SAID = {
    'ʤ': 'J', 'ʧ': 'C', 'ɹ': 'r', 'ŋ': 'G', 'ʃ': 'S', 'ʒ': 'Z', 'θ': 'T', 'ð': 'D', 'ɡ': 'g', 'T': 't', 'ɾ': 't', 'ʔ': 't',
    'A': 'A', 'I': 'I', 'O': 'O', 'W': 'W', 'Y': 'Y', 'ᵊ': 'a', 'ɜ': 'R',
}
# Letters that may stand in for each other at no cost: (said, heard).
NEAR = {('o', 'a'), ('a', 'o'), ('O', 'o'), ('A', 'E'), ('E', 'A'), ('u', 'O'), ('R', 'a'), ('a', 'R'),
        ('z', 's'), ('s', 'z'), ('D', 'T'), ('T', 'D')}


def _load():
    global _model, _vocab
    if _model is None:
        _vocab = {i: t for t, i in json.load(open(hf_hub_download(REPO, 'vocab.json'))).items()}
        _model = Wav2Vec2ForCTC.from_pretrained(REPO).eval()
    return _model


def _letters(s, table):
    s = re.sub(r'[ːˈˌ.\d^ ]', '', s)
    out, i = [], 0
    while i < len(s):
        for k, v in table:
            if s.startswith(k, i):
                out += list(v)
                i += len(k)
                break
        else:
            out.append(VOWEL_CLASS.get(s[i], s[i]))
            i += 1
    return ''.join(out)


def said(phonemes):
    """The letters a take of these Kokoro phonemes should be heard as."""
    s = [c for c in phonemes if c not in 'ˈˌ']
    out = []
    for i, c in enumerate(s):
        if c == 'ɹ' and out and out[-1] == 'R':
            continue  # 'ɜɹ' is one sound
        out.append(SAID.get(c) or VOWEL_CLASS.get(c, c))
    return ''.join(out)


def hear(audio, sr=24000):
    """What the recogniser hears, as IPA."""
    model = _load()
    a = resample_poly(audio.astype(np.float64), 16000, sr).astype(np.float32)
    a = np.concatenate([np.zeros(3200, np.float32), a, np.zeros(3200, np.float32)])  # it misses sounds right at the edge
    a = (a - a.mean()) / (a.std() + 1e-7)
    with torch.no_grad():
        ids = model(torch.from_numpy(a)[None]).logits[0].argmax(-1).tolist()
    toks, prev = [], None
    for i in ids:
        if i != prev and _vocab[i] not in ('<pad>', '<s>', '</s>', '<unk>'):
            toks.append(_vocab[i])
        prev = i
    return ' '.join(toks)


VOWEL_LETTERS = set('aEiuoAIOWYR')


def _cost(c):
    """A wrong vowel is worse than a stray consonant: 'luh' heard as 'lie' is a different beat, while
    the recogniser often hears a faint b or d at the edge of a clip that is not there."""
    return 2 if c in VOWEL_LETTERS else 1


def distance(want, heard):
    """Weighted edit distance from the letters wanted to the letters heard."""
    d = [0]
    for h in heard:
        d.append(d[-1] + _cost(h))
    for w in want:
        prev, d[0] = d[0], d[0] + _cost(w)
        for j, h in enumerate(heard, 1):
            sub = 0 if w == h or (w, h) in NEAR else max(_cost(w), _cost(h))
            prev, d[j] = d[j], min(d[j] + _cost(w), d[j - 1] + _cost(h), prev + sub)
    return d[-1]


def score(audio, phonemes, sr=24000):
    """(distance, what was heard). 0 is a take that sounds like the phonemes."""
    ipa = hear(audio, sr)
    return distance(said(phonemes), _letters(ipa, HEARD)), ipa
