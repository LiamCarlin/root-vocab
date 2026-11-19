#!/usr/bin/env python3
"""Records every bank word once and cuts the recording into its beats.

    python build.py                 # every word in src/data/bank
    python build.py separate rhythm # only these (the manifest is still rewritten in full)
    python build.py --plots         # also draw out/plots/<word>.png to check the cuts by eye

For each word this writes, under assets/voice/:
    <word>_w.m4a    the word at speaking pace
    <word>_s.m4a    the word said carefully (the slow button)
    <word>_1.m4a …  the careful recording cut at the beat boundaries, one file per beat
and regenerates src/data/voice.ts, the manifest the app reads. See README.md.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import warnings
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import soundfile as sf

warnings.filterwarnings('ignore')
import torch  # noqa: E402

import align as aligner  # noqa: E402
import syllables  # noqa: E402

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BANK = ROOT / 'src' / 'data' / 'bank'
AUDIO = ROOT / 'assets' / 'voice'
MANIFEST = ROOT / 'src' / 'data' / 'voice.ts'
OUT = HERE / 'out'

SR = 24000
VOICE = 'af_heart'
NORMAL = 0.9  # speaking pace
CAREFUL = 0.65  # the pace the beats are cut from: slow enough that a lazy vowel is still a sound
LEAD_MS = 12  # silence in front of every clip
FADE = 0.004
PEAK = 0.89
STOPS = ('P', 'T', 'K', 'B', 'D', 'G', 'CH', 'JH')
VOWEL_PHONES = ('AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW')

_pipe = None


def pipe():
    global _pipe
    if _pipe is None:
        from kokoro import KPipeline
        _pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
    return _pipe


def bank():
    """[(text, parts, says)] straight from the TypeScript bank."""
    rows = []
    for f in sorted(BANK.glob('*.ts')):
        for m in re.finditer(r"\bw\(\d, \d, '([^']*)', '([^']*)', '([^']*)'", f.read_text()):
            rows.append((m[1], m[2].split('|'), m[3].split('|')))
    return rows


def stem(text):
    return re.sub(r'[^a-z0-9]+', '_', text.lower()).strip('_')


def _run(ps, speed):
    """Kokoro on a phoneme string. `speed` is one number per token (start mark, phonemes, end mark)."""
    p = pipe()
    ids = torch.LongTensor([[0, *[p.model.vocab[c] for c in ps], 0]])
    torch.manual_seed(0)
    audio, dur = p.model.forward_with_tokens(ids, p.load_voice(VOICE)[len(ps) - 1], torch.tensor([speed], dtype=torch.float32))
    return audio.squeeze().numpy().astype(np.float32), dur.tolist()


def synth(ps, pace):
    """The word at `pace` (1 is the voice's own speed).

    Only the phonemes are slowed. The model hides the start of the first sound inside its opening
    mark, so slowing that mark as well (which is what Kokoro's own `speed` does) smears the first sound.
    """
    key = hashlib.sha1(f'{VOICE}|{pace}|{ps}'.encode()).hexdigest()[:16]
    cache = OUT / 'cache' / f'{key}.npy'
    if cache.exists():
        return np.load(cache)
    audio, _ = _run(ps, [1.0] + [pace] * len(ps) + [1.0])
    cache.parent.mkdir(parents=True, exist_ok=True)
    np.save(cache, audio)
    return audio


def envelope(a):
    n = int(SR * 0.005)
    return np.sqrt(np.convolve(a * a, np.ones(n) / n, mode='same'))


def loud_span(env, lo, hi, floor, before=0.006, after=0.014):
    """The part of [lo, hi) that is not silence, with a little air left either side."""
    idx = np.where(env[lo:hi] > floor)[0]
    if not len(idx):
        return lo, hi
    return max(lo, lo + idx[0] - int(before * SR)), min(hi, lo + idx[-1] + int(after * SR))


def faded(a):
    a = a.copy()
    n = min(int(FADE * SR), len(a) // 2)
    ramp = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))
    a[:n] *= ramp
    a[-n:] *= ramp[::-1]
    return a


def encode(job):
    samples, path = job
    pad = np.concatenate([np.zeros(int(LEAD_MS / 1000 * SR), np.float32), samples.astype(np.float32), np.zeros(int(0.04 * SR), np.float32)])
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        sf.write(tmp.name, pad, SR, subtype='PCM_16')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-c:a', 'aac', '-b:a', '64k', '-ar', str(SR), '-ac', '1',
                        '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-movflags', '+faststart', str(path)], check=True)
    return round(len(pad) / SR * 1000)


def whole(audio):
    """A recording trimmed to the speech, at full level."""
    env = envelope(audio)
    lo, hi = loud_span(env, 0, len(audio), env.max() * 10 ** (-50 / 20), before=0.008, after=0.03)
    return faded(audio[lo:hi]) * (PEAK / np.abs(audio[lo:hi]).max()), lo, hi


def build_word(text, says, ps, plots):
    """Returns (clips, info). clips: {'w': samples, 's': samples, 'beats': [samples]}."""
    beats, shared = syllables.split(ps, says)
    notes = [n for n in (syllables.vowel_note(b, s) for b, s in zip(beats, says)) if n]
    normal, _, _ = whole(synth(ps, NORMAL))
    raw = synth(ps, CAREFUL)
    slow, lo, hi = whole(raw)
    gain = PEAK / np.abs(raw[lo:hi]).max()

    phones = [syllables.arpa(b) for b in beats]
    al = aligner.align(raw, [p for b in phones for p in b])
    weak = [f'{p}@{s:.2f}' for p, s, e, conf in al[1:-1] if conf < 0.2]
    thin = [f'{p}@{s:.2f}' for p, s, e, conf in al[1:-1] if p in VOWEL_PHONES and e - s < 0.035]
    env = envelope(raw)
    first = np.cumsum([1] + [len(b) for b in phones])  # index in `al` of each beat's first phone

    # One cut between each pair of beats; the outer edges come from the trim above.
    cuts = [lo]
    for k, both in enumerate(shared):
        nxt, prev = al[first[k + 1]], al[first[k + 1] - 1]
        if both:
            # A consonant that belongs to both beats is cut through the middle: the first beat closes
            # on it, the second opens with it.
            cut = int(round((nxt[1] + nxt[2]) / 2 * SR))
        else:
            cut = int(round(nxt[1] * SR))
            if nxt[0] in STOPS and prev[0] not in STOPS:
                # The next beat opens with a stop, so there is a moment of near silence right here.
                # The aligner can be 20 to 30 ms out on a weak vowel; the dip itself is exact.
                a, b = max(cuts[-1] + 1, cut - int(0.03 * SR)), min(hi - 1, cut + int(0.04 * SR))
                dip = a + int(np.argmin(env[a:b]))
                if env[dip] < 0.3 * env[max(cuts[-1], cut - int(0.08 * SR)):cut + 1].max():
                    cut = dip
        cuts.append(cut)
    cuts.append(hi)
    if any(b <= a for a, b in zip(cuts, cuts[1:])):
        raise ValueError(f'cuts out of order: {[int(c) for c in cuts]}')
    starts, ends = cuts[:-1], cuts[1:]
    # A lazy vowel can melt into the r, l, w or y that follows ('bat-uh-ree' is said 'bat-r-ee'), and
    # the aligner then leaves the beat with next to nothing. The lazy beat takes the whole melted
    # stretch and the next beat starts half way into it, so the two overlap a little.
    for k in range(len(phones) - 1):
        nxt = al[first[k + 1]]
        if ends[k] - starts[k] < 0.06 * SR and nxt[0] in ('R', 'L', 'W', 'Y', 'M', 'N', 'ER'):
            melted = int(round(nxt[2] * SR))
            starts[k + 1] = (starts[k] + melted) // 2
            ends[k] = melted

    floor = env[lo:hi].max() * 10 ** (-42 / 20)
    pieces, spans = [], []
    for a, b in zip(starts, ends):
        s, e = loud_span(env, a, b, floor)
        piece = faded(raw[s:e]) * gain
        # A quiet beat is lifted a little (never past +6 dB) so it can be heard on its own.
        peak = np.abs(piece).max()
        if 0 < peak < 0.5:
            piece = piece * min(2.0, 0.5 / peak)
        pieces.append(piece)
        spans.append((s, e))
    short = [f'{says[k]}={len(p) / SR * 1000:.0f}ms' for k, p in enumerate(pieces) if len(p) < 0.09 * SR]
    info = {'ps': ps, 'beats': beats, 'notes': notes, 'weak': weak, 'thin': thin, 'short': short}
    if plots:
        plot(text, ps, says, raw, al, cuts, spans)
    info['at'] = [round((c - lo) / SR * 1000) + LEAD_MS for c in starts]
    return {'w': normal, 's': slow, 'beats': pieces}, info


def plot(text, ps, says, raw, al, cuts, spans):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(2, 1, figsize=(13, 5.5), sharex=True)
    ax[0].plot(np.arange(len(raw)) / SR, raw, lw=0.4, color='k')
    ax[1].specgram(raw, NFFT=256, Fs=SR, noverlap=224, cmap='magma', vmin=-110)
    ax[1].set_ylim(0, 8000)
    top = ax[0].get_ylim()[1]
    for p, s, e, conf in al[1:-1]:
        for x in ax:
            x.axvline(s, color='c', lw=0.6, alpha=0.7)
        ax[0].text((s + e) / 2, top * 0.85, p, ha='center', fontsize=8, color='b' if conf >= 0.2 else 'r')
    for c in cuts:
        for x in ax:
            x.axvline(c / SR, color='lime', lw=2)
    for (s, e), say in zip(spans, says):
        ax[0].axvspan(s / SR, e / SR, color='gold', alpha=0.25)
        ax[1].text((s + e) / 2 / SR, 7300, say, ha='center', fontsize=13, color='w', weight='bold')
    ax[0].set_xlim(cuts[0] / SR - 0.08, cuts[-1] / SR + 0.1)
    ax[0].set_title(f'{text}   /{ps}/')
    plt.tight_layout()
    (OUT / 'plots').mkdir(parents=True, exist_ok=True)
    plt.savefig(OUT / 'plots' / f'{stem(text)}.png', dpi=80)
    plt.close()


def write_manifest(rows, old):
    lines = [
        '// Generated by tools/voice/build.py. Do not edit by hand.',
        '//',
        '// One recording per bank word, said once by a neural voice and cut at the beat boundaries, so a',
        '// beat played on its own is the very sound it has inside the word.',
        '',
        'export type VoiceClip = {',
        '  /** The word at speaking pace. */',
        '  word: number;',
        '  /** The word said carefully. The beats are this recording, cut up. */',
        '  slow: number;',
        '  beats: number[];',
        '  /** Lengths in ms. `at` is where each beat starts inside `slow`. */',
        '  ms: { word: number; slow: number; beats: number[]; at: number[] };',
        '};',
        '',
        '/** Keyed by the word in lower case. A word with no entry falls back to the phone\'s own voice. */',
        'export const VOICE: Record<string, VoiceClip> = {',
    ]
    for text, _, says in rows:
        ms = old.get(text.lower())
        if not ms:
            continue
        st = stem(text)
        req = lambda suffix: f"require('../../assets/voice/{st}_{suffix}.m4a')"  # noqa: E731
        beats = ', '.join(req(i + 1) for i in range(len(says)))
        lines.append(f"  {json.dumps(text.lower())}: {{ word: {req('w')}, slow: {req('s')}, beats: [{beats}], ms: {{ word: {ms['w']}, slow: {ms['s']}, beats: {json.dumps(ms['beats'])}, at: {json.dumps(ms['at'])} }} }},")
    lines += ['};', '']
    MANIFEST.write_text('\n'.join(lines))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('words', nargs='*')
    ap.add_argument('--plots', action='store_true')
    args = ap.parse_args()
    rows = bank()
    overrides = json.loads((HERE / 'overrides.json').read_text())
    lengths_file = HERE / 'lengths.json'
    lengths = json.loads(lengths_file.read_text()) if lengths_file.exists() else {}
    want = {w.lower() for w in args.words}
    unknown = want - {t.lower() for t, _, _ in rows}
    if unknown:
        sys.exit(f'not in the bank: {", ".join(sorted(unknown))}')
    AUDIO.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(exist_ok=True)
    report, failed = [], []
    for n, (text, parts, says) in enumerate(rows):
        if want and text.lower() not in want:
            continue
        ps = overrides.get(text.lower()) or pipe().g2p(text)[0]
        try:
            clips, info = build_word(text, says, ps, args.plots)
        except (ValueError, KeyError) as e:
            failed.append(f'{text}  {"|".join(says)}  /{ps}/  {e}')
            lengths.pop(text.lower(), None)
            continue
        st = stem(text)
        for old_file in AUDIO.glob(f'{st}_*.m4a'):
            old_file.unlink()
        jobs = [(clips['w'], AUDIO / f'{st}_w.m4a'), (clips['s'], AUDIO / f'{st}_s.m4a')]
        jobs += [(b, AUDIO / f'{st}_{i + 1}.m4a') for i, b in enumerate(clips['beats'])]
        with ThreadPoolExecutor(4) as pool:
            ms = list(pool.map(encode, jobs))
        lengths[text.lower()] = {'w': ms[0], 's': ms[1], 'beats': ms[2:], 'at': info['at']}
        flags = ''.join(f'  [{k}: {", ".join(v)}]' for k, v in (('vowel', info['notes']), ('thin', info['thin']), ('weak', info['weak']), ('short', info['short'])) if v)
        report.append(f'{text:16} {"|".join(says):28} {"|".join(info["beats"]):28} {ms[2:]}{flags}')
        print(f'{n + 1:3}/{len(rows)} {report[-1]}', flush=True)
    # Drop recordings of words that have left the bank.
    live = {t.lower() for t, _, _ in rows}
    for gone in [k for k in lengths if k not in live]:
        for f in AUDIO.glob(f'{stem(gone)}_*.m4a'):
            f.unlink()
        del lengths[gone]
    lengths_file.write_text(json.dumps(dict(sorted(lengths.items())), indent=0, ensure_ascii=False) + '\n')
    write_manifest(rows, lengths)
    (OUT / 'report.txt').write_text('\n'.join(report + ['', 'FAILED'] + failed) + '\n')
    print(f'\n{len(report)} built, {len(failed)} failed, {len(lengths)} in the manifest')
    for f in failed:
        print('FAILED', f)


if __name__ == '__main__':
    main()
