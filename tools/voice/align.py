"""Finds where each sound starts and ends in a recording (10 ms steps).

Uses the Charsiu frame classifier (charsiu/en_w2v2_fc_10ms, MIT): a wav2vec2 model that names the phone
in every 10 ms frame. Given the phones we know the word has, a Viterbi pass picks the best boundaries.
"""
import json

import numpy as np
import torch
from huggingface_hub import hf_hub_download
from scipy.signal import resample_poly
from transformers import Wav2Vec2Config, Wav2Vec2Model

REPO = 'charsiu/en_w2v2_fc_10ms'
FRAME = 0.01
_vocab = None
_model = None


class _FrameClassifier(torch.nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.wav2vec2 = Wav2Vec2Model(cfg)
        self.lm_head = torch.nn.Linear(cfg.hidden_size, cfg.vocab_size)

    def forward(self, x):
        return self.lm_head(self.wav2vec2(x).last_hidden_state)


def _load():
    global _vocab, _model
    if _model is None:
        _vocab = json.load(open(hf_hub_download('charsiu/tokenizer_en_cmu', 'vocab.json')))
        m = _FrameClassifier(Wav2Vec2Config.from_pretrained(REPO))
        state = torch.load(hf_hub_download(REPO, 'pytorch_model.bin'), map_location='cpu')
        missing, _ = m.load_state_dict(state, strict=False)
        missing = [k for k in missing if 'masked_spec_embed' not in k]
        assert not missing, missing
        _model = m.eval()
    return _model


def align(audio, phones, sr=24000):
    """[(phone, start_s, end_s, confidence)] for `phones`, with the silence either side included."""
    model = _load()
    a = resample_poly(audio.astype(np.float64), 16000, sr).astype(np.float32)
    a = (a - a.mean()) / (a.std() + 1e-7)
    with torch.no_grad():
        logp = torch.log_softmax(model(torch.from_numpy(a)[None])[0], -1).numpy()
    seq = ['[SIL]'] + list(phones) + ['[SIL]']
    em = logp[:, [_vocab[p] for p in seq]]
    T, S = em.shape
    if T < S:
        raise ValueError('recording shorter than its phones')
    score = np.full((T, S), -1e18)
    back = np.zeros((T, S), dtype=np.int8)
    score[0, 0] = em[0, 0]
    for t in range(1, T):
        stay = score[t - 1]
        move = np.concatenate(([-1e18], score[t - 1, :-1]))
        back[t] = move > stay
        score[t] = np.where(back[t], move, stay) + em[t]
    path = np.zeros(T, dtype=int)
    s = S - 1
    for t in range(T - 1, -1, -1):
        path[t] = s
        s -= back[t, s]
    out = []
    for i, p in enumerate(seq):
        fr = np.where(path == i)[0]
        out.append((p, fr[0] * FRAME, (fr[-1] + 1) * FRAME, float(np.exp(em[fr, i]).mean())))
    return out
