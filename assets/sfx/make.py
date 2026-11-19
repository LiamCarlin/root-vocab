# Synthesises Root's ten interface sounds: soft marimba-style plucks, mono 44.1 kHz 16-bit WAV.
# Standard library only. Usage: python3 sfx.py <out_dir>
import math, random, struct, sys, wave, os

SR = 44100
out = sys.argv[1]

def buf(sec): return [0.0] * int(SR * sec)

def pluck(b, at, f, amp=0.5, tau=0.16, bright=0.22, attack=0.004):
    """A mallet note: fundamental + a fast-dying 4th partial + a very short 10th partial click."""
    i0 = int(at * SR)
    for i in range(i0, len(b)):
        t = (i - i0) / SR
        a = min(1.0, t / attack)
        v = math.sin(2 * math.pi * f * t) * math.exp(-t / tau)
        v += bright * math.sin(2 * math.pi * f * 4 * t) * math.exp(-t / (tau * 0.28))
        v += bright * 0.35 * math.sin(2 * math.pi * f * 10 * t) * math.exp(-t / (tau * 0.07))
        b[i] += amp * a * v

def sweep(b, at, f0, f1, dur, amp=0.5, tau=0.05):
    i0 = int(at * SR); ph = 0.0
    for i in range(i0, min(len(b), i0 + int(dur * SR))):
        t = (i - i0) / SR
        f = f0 + (f1 - f0) * (t / dur)
        ph += 2 * math.pi * f / SR
        b[i] += amp * min(1.0, t / 0.003) * math.sin(ph) * math.exp(-t / tau)

def shimmer(b, at, dur, amp=0.12, seed=3):
    rnd = random.Random(seed)
    for k in range(9):
        f = rnd.choice([2093, 2637, 3136, 3520, 4186, 5274])
        pluck(b, at + rnd.random() * dur, f, amp=amp * (0.5 + rnd.random() * 0.5), tau=0.07, bright=0.05, attack=0.002)

def noise_sweep(b, at, dur, amp=0.4, seed=5):
    """White noise through a one-pole low-pass whose cutoff rises then falls: a soft whoosh."""
    rnd = random.Random(seed); i0 = int(at * SR); n = int(dur * SR); y = 0.0; y2 = 0.0
    for k in range(n):
        p = k / n
        cutoff = 300 + 2600 * math.sin(math.pi * p) ** 2
        a = 1 - math.exp(-2 * math.pi * cutoff / SR)
        y += a * (rnd.uniform(-1, 1) - y); y2 += a * (y - y2)
        env = math.sin(math.pi * p) ** 2
        if i0 + k < len(b): b[i0 + k] += amp * env * y2 * 3.2

def save(name, b, peak=0.5):
    # short fade out so nothing clicks, then normalise to a quiet peak
    n = len(b); f = int(0.012 * SR)
    for i in range(f): b[n - 1 - i] *= i / f
    m = max(1e-9, max(abs(v) for v in b)); k = peak / m
    with wave.open(os.path.join(out, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v * k)) * 32767)) for v in b))
    print(name, round(n / SR, 2), 's', os.path.getsize(os.path.join(out, name + '.wav')) // 1024, 'KB')

C5, D5, E5, G5, A5, C6, E6, G6, C7 = 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1318.5, 1568.0, 2093.0

b = buf(0.07); pluck(b, 0, 880, amp=0.5, tau=0.014, bright=0.1, attack=0.002); save('tap', b, 0.28)
b = buf(0.12); sweep(b, 0, 320, 760, 0.07, tau=0.035); save('pop', b, 0.42)
b = buf(0.46); pluck(b, 0, C5, tau=0.13); pluck(b, 0.095, G5, tau=0.17); save('good', b, 0.5)
b = buf(0.34); pluck(b, 0, 233.08, amp=0.5, tau=0.12, bright=0.06, attack=0.014); save('miss', b, 0.36)
b = buf(0.48); pluck(b, 0, C5, tau=0.09); pluck(b, 0.07, E5, tau=0.1); pluck(b, 0.14, G5, tau=0.16); save('combo', b, 0.5)
b = buf(0.66)
for i, f in enumerate([C5, E5, G5, C6, E6]): pluck(b, i * 0.082, f, tau=0.12 if i < 4 else 0.2, amp=0.42 + i * 0.03)
save('win', b, 0.52)
b = buf(0.66)
for i, f in enumerate([G5, C6, E6, G6]): pluck(b, i * 0.07, f, tau=0.14, amp=0.4)
shimmer(b, 0.2, 0.3); save('unlock', b, 0.5)
b = buf(0.13); pluck(b, 0, 1760, amp=0.5, tau=0.04, bright=0.12, attack=0.002); pluck(b, 0.012, 2637, amp=0.2, tau=0.03, bright=0.05); save('gem', b, 0.34)
b = buf(0.34); noise_sweep(b, 0, 0.34); save('whoosh', b, 0.3)
b = buf(0.62); sweep(b, 0, 170, 85, 0.16, amp=0.9, tau=0.07); pluck(b, 0.17, E6, tau=0.1, amp=0.3); pluck(b, 0.235, G6, tau=0.1, amp=0.3); pluck(b, 0.3, C7, tau=0.14, amp=0.3); shimmer(b, 0.3, 0.2, amp=0.07, seed=8); save('chest', b, 0.5)
