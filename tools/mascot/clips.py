"""
Root's poses.

Every pose is a function that returns pose overrides (see rootrig.BASE). The app shows only still pictures.
The first 33 poses were animation clips once: they are functions of a phase t (0 … 1) and the still is their
`hold` frame, with the leaves bent by how the body moved a moment before (sample() adds that follow-through).
Poses added since are plain stills: they ignore t and are registered with Still(...).
"""
import math

TAU = 2 * math.pi

# hands, relative to the body centre (x: screen right, y: toward the back, z: up)
RL, RR = (-0.80, -0.10, -0.68), (0.80, -0.10, -0.68)
HIPL = {'hand': (-0.76, -0.16, -0.42), 'len': 0.74, 'pole': (-1, 0.7, 0.3), 'rot': (0, 0, 0)}
HIPR = {'hand': (0.76, -0.16, -0.42), 'len': 0.74, 'pole': (1, 0.7, 0.3), 'rot': (0, 0, 0)}
FL, FR = (-0.25, 0, 0), (0.25, 0, 0)


def s(t, n=1, ph=0.0):
    return math.sin(TAU * (n * t + ph))


def c(t, n=1, ph=0.0):
    return math.cos(TAU * (n * t + ph))


def ss(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def lerp(a, b, k):
    if isinstance(a, (tuple, list)):
        return tuple(lerp(x, y, k) for x, y in zip(a, b))
    return a + (b - a) * k


def key(t, keys, loop=False, ease=ss):
    """Eased interpolation through [(time, value), …]. With loop, the last key runs on into the first."""
    ks = list(keys)
    if loop:
        ks = ks + [(ks[0][0] + 1, ks[0][1])]
        if t < ks[0][0]:
            t += 1
    if t <= ks[0][0]:
        return ks[0][1]
    for (t0, v0), (t1, v1) in zip(ks, ks[1:]):
        if t <= t1:
            return lerp(v0, v1, ease((t - t0) / max(1e-9, t1 - t0)))
    return ks[-1][1]


def overshoot(x, k=1.9):
    x = max(0.0, min(1.0, x)) - 1
    return 1 + x * x * ((k + 1) * x + k)


def blink(t, at=(0.4,), w=0.05):
    """1 when shut. A quick close and a slightly slower open."""
    b = 0.0
    for a in at:
        d = (t - a + 0.5) % 1 - 0.5
        if -w * 0.45 < d <= 0:
            b = max(b, ss(1 + d / (w * 0.45)))
        elif 0 < d < w:
            b = max(b, 1 - ss(d / w))
    return b


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def arc_z(u, h):
    """A jump arc: 0 → h → 0 over u in 0…1."""
    u = max(0.0, min(1.0, u))
    return 4 * h * u * (1 - u)


def breathe(t, n=1):
    return {'sq': 1 + 0.014 * s(t, n), 'dz': 0.008 * s(t, n)}


# ── poses that were animation clips (functions of the phase t) ───────────────
def idle(t):
    look = key(t, [(0.0, (0, 0)), (0.52, (0, 0)), (0.62, (0.75, 0.1)), (0.8, (0.75, 0.1)), (0.9, (0, 0))], loop=True)
    sway = s(t, 1, 0.1)
    return {**breathe(t), 'tilt': 1.3 * sway, 'lean': (0.6 * s(t, 1, 0.3), 0.8 * sway),
            'armL': {'hand': add(RL, (0.015 * sway, 0, 0.02 * s(t, 1, 0.2)))}, 'armR': {'hand': add(RR, (0.015 * sway, 0, 0.02 * s(t, 1, 0.3)))},
            'look': look, 'blink': blink(t, (0.3, 0.86)), 'open': 0.92 + 0.05 * s(t, 1, 0.5)}


def _walk(t, stride, lift, swing, bob, yaw, lean, run=False):
    """A cycle in place. Foot planted: slides back. Foot in the air: lifts and reaches forward."""
    P = {'yaw': yaw}
    duty = 0.5 if run else 0.6
    for tag, ph, x in (('L', 0.0, -0.25), ('R', 0.5, 0.25)):
        u = (t + ph) % 1
        if u < duty:                       # on the ground, travelling back (+y is behind)
            k = u / duty
            y = -stride / 2 + stride * k
            z = 0.0
            pitch = -14 * (1 - k) * (1 - k) + 26 * max(0.0, k - 0.6) / 0.4   # heel strike … toe off
        else:                              # in the air
            k = (u - duty) / (1 - duty)
            y = stride / 2 - stride * ss(k)
            z = lift * math.sin(math.pi * k) ** 0.9
            pitch = 30 * (1 - k) - 18 * k
        P['leg' + tag] = {'foot': (x * 0.8, y, z), 'rot': (pitch, 0, 0), 'pole': ((-0.2 if tag == 'L' else 0.2), -1, 0.2)}
    # the body drops as each foot takes the weight, rises as it passes over
    P['dz'] = -bob * (0.5 + 0.5 * c(t, 2, 0.06)) + (0.05 if run else 0)
    P['sq'] = 1 - 0.03 * c(t, 2, 0.12)
    P['tilt'] = 2.2 * s(t, 1, 0.0)
    P['twist'] = 7 * s(t, 1, 0.25)
    P['lean'] = (lean + 1.5 * c(t, 2), 1.5 * s(t, 1))
    # arms swing against the legs
    a = swing * s(t, 1, 0.25)
    P['armL'] = {'hand': (-0.82, -0.05 + a, -0.60 + 0.10 * abs(a) / max(swing, 1e-6)), 'pole': (-0.5, 1, -0.2), 'len': 0.74}
    P['armR'] = {'hand': (0.82, -0.05 - a, -0.60 + 0.10 * abs(a) / max(swing, 1e-6)), 'pole': (0.5, 1, -0.2), 'len': 0.74}
    return P


def walk(t):
    P = _walk(t, stride=0.52, lift=0.17, swing=0.34, bob=0.06, yaw=42, lean=4)
    P['props'] = {'backpack': {'at': 'body', 'loc': (0, 0.86, -0.1 + 0.03 * c(t, 2, 0.2)), 'rot': (4 * c(t, 2, 0.15), 0, 0), 'scale': 1.1}}
    P['look'] = (0.35, 0.05); P['blink'] = blink(t, (0.55,)); P['open'] = 0.95
    return P


def run(t):
    P = _walk(t, stride=0.78, lift=0.3, swing=0.5, bob=0.09, yaw=48, lean=13, run=True)
    P['pos'] = (0, 0, 0.07 + 0.06 * abs(s(t, 1, 0.12)))
    P['look'] = (0.4, 0.05); P['mouth'] = 'laugh'; P['open'] = 0.85; P['brow'] = (0.3, -0.2)
    return P


def write(t):
    P = run(t)
    a = P['armR']['hand']
    P['armR'] = {'hand': (0.8, -0.5, -0.25 + 0.05 * s(t, 2)), 'pole': (1, 0.6, -0.4), 'len': 0.9}
    P['props'] = {'pencil': {'at': 'handR', 'loc': (0, -0.02, 0.05), 'rot': (-70, 0, 20), 'scale': 1.3}}
    P['mouth'] = 'open'; P['open'] = 1
    return P


def wave(t):
    w = s(t, 2)
    shift = s(t, 1, 0.05)
    return {**breathe(t, 2), 'tilt': 2.2 + 1.2 * shift, 'lean': (0, 2 + 1.5 * shift),
            'armR': {'hand': (1.08 + 0.17 * w, -0.2, 0.36 + 0.05 * c(t, 4)), 'pole': (1, 0.2, -1), 'len': 0.9, 'rot': (0, 22 * w, 0)},
            'armL': {'hand': add(RL, (0.02 * shift, 0, 0.02 * shift))},
            'look': (0, 0), 'blink': blink(t, (0.62,)), 'open': 1.0, 'brow': (0.4, 0)}


def cheer(t):
    # crouch (0–.16) · leap (.16–.62) · land and bounce (.62–1)
    up = (t - 0.16) / 0.46
    z = arc_z(up, 0.8) if 0 <= up <= 1 else 0
    sq = key(t, [(0, 1), (0.1, 0.84), (0.2, 1.13), (0.4, 1.03), (0.6, 1.08), (0.66, 0.82), (0.8, 1.05), (0.92, 0.98)], loop=True)
    dz = key(t, [(0, 0), (0.1, -0.16), (0.2, 0.05), (0.6, 0.05), (0.67, -0.17), (0.82, 0.02), (0.92, 0)], loop=True)
    arms = key(t, [(0, 0.25), (0.1, 0.0), (0.26, 1.0), (0.6, 1.0), (0.7, 0.75), (0.84, 0.5)], loop=True)
    tuck = ss(up * 2.2) * (1 - ss((up - 0.62) / 0.38)) if 0 <= up <= 1 else 0
    hz = lerp(-0.55, 0.66, arms)
    return {'pos': (0, 0, z), 'sq': sq, 'dz': dz, 'eyes': 'happy', 'mouth': 'laugh', 'open': 0.85 + 0.15 * arms, 'brow': (0.7, 0),
            'armL': {'hand': (-0.98, -0.16, hz), 'pole': (-1, 0.2, -0.7), 'len': 0.92}, 'armR': {'hand': (0.98, -0.16, hz), 'pole': (1, 0.2, -0.7), 'len': 0.92},
            'legL': {'foot': (-0.25 - 0.07 * tuck, -0.06 * tuck, 0.17 * tuck), 'rot': (24 * tuck, 0, 0)},
            'legR': {'foot': (0.25 + 0.07 * tuck, 0.05 * tuck, 0.12 * tuck), 'rot': (24 * tuck, 0, 0)}}


def jump(t):
    up = (t - 0.22) / 0.46
    z = arc_z(up, 0.84) if 0 <= up <= 1 else 0
    sq = key(t, [(0, 1), (0.14, 0.82), (0.26, 1.14), (0.45, 1.03), (0.66, 1.09), (0.72, 0.8), (0.86, 1.05), (1, 1)])
    dz = key(t, [(0, 0), (0.14, -0.18), (0.26, 0.05), (0.66, 0.05), (0.73, -0.18), (0.88, 0.02), (1, 0)])
    arms = key(t, [(0, 0), (0.14, -0.25), (0.3, 1), (0.6, 1), (0.76, 0.2), (1, 0)])
    tuck = ss(up * 2.2) * (1 - ss((up - 0.62) / 0.38)) if 0 <= up <= 1 else 0
    hx = lerp(0.86, 1.0, max(0, arms)); hz = lerp(-0.66, 0.6, max(0, arms)) + min(0, arms) * 0.0
    hy = -0.1 + 0.4 * min(0, arms) * -1
    return {'pos': (0, 0, z), 'sq': sq, 'dz': dz, 'eyes': 'happy' if 0.24 < t < 0.8 else 'open', 'mouth': 'laugh' if 0.2 < t < 0.85 else 'open', 'open': 0.95,
            'armL': {'hand': (-hx, hy, hz), 'pole': (-1, 0.2, -0.7), 'len': 0.92}, 'armR': {'hand': (hx, hy, hz), 'pole': (1, 0.2, -0.7), 'len': 0.92},
            'legL': {'foot': (-0.25 - 0.06 * tuck, 0, 0.16 * tuck), 'rot': (24 * tuck, 0, 0)},
            'legR': {'foot': (0.25 + 0.06 * tuck, 0, 0.16 * tuck), 'rot': (24 * tuck, 0, 0)}}


def think(t):
    tap = max(0.0, s(t, 3)) ** 2
    look = key(t, [(0, (-0.7, 0.8)), (0.45, (-0.5, 0.9)), (0.6, (0.4, 0.85)), (0.9, (0.3, 0.8))], loop=True)
    sway = s(t, 1)
    return {**breathe(t), 'tilt': -2.5 + 0.8 * sway, 'lean': (-2, -3 + 0.8 * sway), 'twist': -6,
            'armR': {'hand': (0.30 + 0.01 * sway, -0.88, -0.27 + 0.015 * s(t, 2)), 'pole': (1, -0.3, -0.8), 'len': 0.98, 'rot': (20, 0, 0)}, 'finger': (0, 0),
            'armL': {'hand': (-0.05, -0.90, -0.66), 'pole': (-1, -0.2, -0.6), 'len': 1.1},
            'legL': {'foot': (-0.3, -0.06, 0.0), 'rot': (-20 * tap, 0, -8)},
            'look': look, 'blink': blink(t, (0.52,)), 'mouth': 'smile', 'brow': (0.7, 0.25), 'mroll': -6}


def listen(t):
    nod = s(t, 2)
    return {**breathe(t), 'tilt': 5 + 0.6 * s(t), 'lean': (3 + 2.2 * nod, 6), 'twist': 8,
            'armR': {'hand': (0.96, -0.28, 0.34 + 0.02 * nod), 'pole': (1, 0.3, -1), 'len': 0.95, 'rot': (0, -30, 0)},
            'armL': {'hand': add(RL, (0, 0, 0.02 * nod))},
            'look': (0.7, 0.15), 'blink': blink(t, (0.3, 0.8)), 'mouth': 'o', 'open': 0.55 + 0.1 * nod, 'brow': (0.8, 0.1), 'wide': 1.05}


def thumbs(t):
    b = abs(s(t, 1)) ** 1.5
    push = key(t, [(0, 0), (0.12, 1), (0.5, 0.85), (0.62, 1), (0.9, 0.9)], loop=True)
    return {'dz': 0.05 * b - 0.02, 'sq': 1 + 0.03 * s(t, 2, 0.1), 'tilt': -2, 'lean': (-1, -2), 'twist': -8,
            'armR': {'hand': (0.8, -0.72 - 0.08 * push, -0.2 + 0.05 * b), 'pole': (1, 0.4, -0.8), 'len': 0.95, 'rot': (0, 0, 0)}, 'thumbs': (0, 1),
            'armL': HIPL, 'look': (0, 0), 'blink': blink(t, (0.7,)), 'eyes': 'winkL' if 0.14 < t < 0.42 else 'open', 'open': 1, 'brow': (0.5, 0)}


def _sitting(t, lean=5):
    """Sitting on the ground, legs out in front."""
    return {'pos': (0, 0, 0), 'dz': -0.16, 'lean': (lean, 0),
            'legL': {'foot': (-0.42, -0.62, 0.02), 'rot': (-62, 0, -14), 'pole': (-0.5, -0.4, 1)},
            'legR': {'foot': (0.42, -0.62, 0.02), 'rot': (-62, 0, 14), 'pole': (0.5, -0.4, 1)}}


def sleep(t):
    br = s(t)
    P = _sitting(t, 9 + 1.5 * br)
    P.update({'sq': 1 + 0.03 * br, 'tilt': 3, 'eyes': 'shut', 'mouth': 'o', 'open': 0.32 + 0.14 * br, 'leaf': (10, 20 + 4 * br, 16), 'brow': (-0.2, 0.2),
              'armL': {'hand': (-0.62, -0.6, -0.7), 'pole': (-1, 0, 0), 'len': 0.8}, 'armR': {'hand': (0.62, -0.6, -0.7), 'pole': (1, 0, 0), 'len': 0.8}})
    return P


def read(t):
    P = _sitting(t, 6)
    scan = key(t, [(0, -0.5), (0.36, 0.5), (0.42, -0.5), (0.8, 0.5), (0.86, -0.5)], loop=True)
    turn = key(t, [(0, 0), (0.8, 0), (0.9, 1), (0.98, 0)], loop=True)
    P.update({**breathe(t), 'dz': -0.16, 'lean': (8, 0),
              'props': {'book': {'at': 'body', 'loc': (0, -1.02, -0.56), 'rot': (-24, 0, 0), 'scale': 1.25}},
              'armL': {'hand': (-0.5, -0.98, -0.62), 'pole': (-1, 0.2, -0.5), 'len': 1.0}, 'armR': {'hand': (0.5 - 0.22 * turn, -1.0 - 0.05 * turn, -0.62 + 0.16 * turn), 'pole': (1, 0.2, -0.5), 'len': 1.0},
              'look': (scan, -0.85), 'blink': blink(t, (0.4,)), 'mouth': 'smile', 'brow': (0.3, 0)})
    return P


def point(t):
    b = abs(s(t, 1)) ** 1.4
    return {'pos': (-0.22, 0, 0), 'dz': 0.045 * b - 0.01, 'sq': 1 + 0.025 * s(t, 2, 0.1), 'tilt': 3, 'lean': (0, 4), 'twist': 10,
            'armR': {'hand': (1.08 + 0.04 * b, -0.3, 0.1 + 0.06 * b), 'pole': (0.2, 0.3, -1), 'len': 0.82}, 'finger': (0, 1),
            'armL': HIPL, 'look': (0.75, 0.05), 'blink': blink(t, (0.45,)), 'open': 1, 'brow': (0.6, 0)}


def peek(t):
    look = key(t, [(0, (0, -0.2)), (0.12, (-0.85, 0)), (0.36, (-0.85, 0)), (0.5, (0.85, 0)), (0.76, (0.85, 0)), (0.9, (0, -0.2))], loop=True)
    tw = key(t, [(0, 0), (0.12, -7), (0.36, -7), (0.5, 7), (0.76, 7), (0.9, 0)], loop=True)
    bob = 0.03 * s(t, 2)
    return {'dz': bob, 'twist': tw, 'lean': (4, 0),
            'armL': {'hand': (-0.52, -0.88, -0.27 - bob), 'pole': (-1, 0.1, 0.4), 'len': 0.95, 'rot': (-60, 0, 0)},
            'armR': {'hand': (0.52, -0.88, -0.27 - bob), 'pole': (1, 0.1, 0.4), 'len': 0.95, 'rot': (-60, 0, 0)},
            'look': look, 'blink': blink(t, (0.44, 0.94)), 'mouth': 'open', 'open': 0.75, 'brow': (0.7, 0)}


SEAT = 0.52   # height of the ledge Root sits on, above the lowest point its feet reach


def sit(t):
    a, b = s(t), s(t, 1, 0.5)
    sway = s(t, 1, 0.2)
    return {'pos': (0, 0, SEAT - 0.22 - 0.06), **breathe(t), 'lean': (2, 1.2 * sway), 'tilt': 0.8 * sway,
            'legL': {'foot': (-0.28, -0.36 - 0.13 * a, -0.38 + 0.06 * abs(a)), 'rot': (30 - 22 * a, 0, -6), 'pole': (-0.2, -1, 0.6)},
            'legR': {'foot': (0.28, -0.36 - 0.13 * b, -0.38 + 0.06 * abs(b)), 'rot': (30 - 22 * b, 0, 6), 'pole': (0.2, -1, 0.6)},
            'armL': {'hand': (-0.9, -0.25, -0.86), 'pole': (-1, 0.5, 0), 'len': 0.86}, 'armR': {'hand': (0.9, -0.25, -0.86), 'pole': (1, 0.5, 0), 'len': 0.86},
            'look': key(t, [(0, (0, 0)), (0.5, (0, 0)), (0.6, (-0.6, 0.2)), (0.85, (-0.6, 0.2)), (0.95, (0, 0))], loop=True), 'blink': blink(t, (0.3,)), 'open': 0.95}


HANG_Z = 3.06  # where the fists are, above the feet


def hang(t):
    th = 7 * s(t)
    r = math.radians(th)
    kick = s(t, 2)
    return {'tilt': th, 'pos': (-HANG_Z * math.sin(r), 0, HANG_Z * (1 - math.cos(r))), 'sq': 1.04 + 0.01 * s(t, 2),
            'armL': {'hand': (-0.5, 0.0, 1.82), 'pole': (-1, 0, 0), 'len': 1.975}, 'armR': {'hand': (0.5, 0.0, 1.82), 'pole': (1, 0, 0), 'len': 1.975},
            'legL': {'foot': (-0.26, -0.10 * kick, 0.04 + 0.06 * max(0, kick)), 'rot': (38 - 12 * kick, 0, 0)},
            'legR': {'foot': (0.26, 0.10 * kick, 0.04 + 0.06 * max(0, -kick)), 'rot': (38 + 12 * kick, 0, 0)},
            'look': (0.3 * s(t), -0.1), 'blink': blink(t, (0.6,)), 'mouth': 'laugh', 'open': 0.7, 'mroll': 4 * s(t), 'brow': (0.5, 0)}


def gasp(t):
    tremble = 0.012 * s(t, 6)
    pop = key(t, [(0, 0), (0.1, 1), (0.3, 0.2), (0.6, 0.1), (0.85, 0)], loop=True)
    return {'dz': 0.1 * pop + tremble, 'sq': 1 + 0.06 * pop, 'lean': (-3 - 2 * pop, 0),
            'armL': {'hand': (-0.63, -0.72, -0.06 + tremble), 'pole': (-1, 0.1, -0.6), 'len': 0.9, 'rot': (0, 30, 0)},
            'armR': {'hand': (0.63, -0.72, -0.06 + tremble), 'pole': (1, 0.1, -0.6), 'len': 0.9, 'rot': (0, -30, 0)},
            'wide': 1.12 + 0.05 * pop, 'look': (0, 0.1), 'blink': blink(t, (0.7,), 0.04), 'mouth': 'o', 'open': 0.9 + 0.2 * pop, 'brow': (1.0 + 0.3 * pop, 0.15), 'leaf': (0, -6 * pop, -8 * pop)}


def oops(t):
    scr = s(t, 4)
    look = key(t, [(0, (-0.8, -0.1)), (0.5, (-0.8, -0.1)), (0.6, (0.1, 0.0)), (0.8, (0.1, 0.0)), (0.9, (-0.8, -0.1))], loop=True)
    return {**breathe(t), 'tilt': -3, 'lean': (2, -4 + 0.6 * s(t)), 'twist': -6,
            'armR': {'hand': (0.5 + 0.05 * scr, 0.3, 0.9 + 0.03 * c(t, 4)), 'pole': (1, 0.5, 0.5), 'len': 1.22},
            'armL': {'hand': add(RL, (0.04, 0, 0.03))},
            'look': look, 'blink': blink(t, (0.56,)), 'mouth': 'smile', 'mroll': 9, 'brow': (0.5, 0.75), 'leaf': (-4, 6, 6)}


def laugh(t):
    sh = s(t, 4)
    back = key(t, [(0, -4), (0.45, -9), (0.9, -4)], loop=True)
    return {'sq': 1 + 0.035 * sh, 'dz': 0.02 * sh, 'lean': (back, 1.5 * s(t)), 'tilt': 1.5 * s(t),
            'armR': {'hand': (0.34, -0.9, -0.52 + 0.03 * sh), 'pole': (1, 0, -0.6), 'len': 0.95},
            'armL': {'hand': (-0.34, -0.9, -0.60 + 0.03 * sh), 'pole': (-1, 0, -0.6), 'len': 0.95},
            'eyes': 'happy', 'mouth': 'laugh', 'open': 0.9 + 0.14 * sh, 'brow': (0.8, 0.1)}


def love(t):
    sway = s(t)
    return {**breathe(t, 2), 'tilt': 4 + 3 * sway, 'lean': (-1, 4 + 2 * sway), 'pos': (0.03 * sway, 0, 0),
            'armR': {'hand': (0.62, -0.76, -0.16), 'pole': (1, 0.2, -0.8), 'len': 0.92, 'rot': (0, -30, 0)},
            'armL': {'hand': (0.34, -0.92, -0.30), 'pole': (-0.4, -0.3, -1), 'len': 1.3, 'rot': (0, 30, 0)},
            'eyes': 'happy' if (0.3 < t < 0.7) else 'open', 'look': (0.1, 0.5), 'wide': 1.06, 'blink': blink(t, (0.28, 0.72), 0.03), 'mouth': 'smile', 'brow': (0.9, 0.3)}


def proud(t):
    rock = s(t)
    return {'sq': 1 + 0.012 * s(t, 2), 'dz': 0.02 * max(0, rock), 'lean': (-5 - 1.5 * rock, 0), 'tilt': 0.8 * s(t, 1, 0.25),
            'armL': HIPL, 'armR': HIPR,
            'legL': {'foot': FL, 'rot': (-10 * max(0, -rock) + 12 * max(0, rock), 0, -10)}, 'legR': {'foot': FR, 'rot': (-10 * max(0, -rock) + 12 * max(0, rock), 0, 10)},
            'eyes': 'happy' if 0.25 < t < 0.75 else 'open', 'blink': blink(t, (0.24, 0.76), 0.03), 'look': (0, 0.2), 'open': 1.0, 'brow': (0.6, -0.15)}


def wink(t):
    k = key(t, [(0, 0), (0.18, 1), (0.62, 1), (0.8, 0)], loop=True)
    jab = key(t, [(0, 0), (0.2, 1), (0.3, 0.75), (0.62, 0.8), (0.82, 0)], loop=True)
    return {**breathe(t, 2), 'tilt': 3 * k, 'lean': (1, 3 * k), 'twist': -6 * k,
            'armR': {'hand': lerp(RR, (0.62, -1.02, -0.22), k), 'pole': (1, 0.3, -0.8), 'len': 1.0}, 'finger': (0, jab),
            'armL': lerp_arm(RL, HIPL, k),
            'eyes': 'winkL' if k > 0.6 else 'open', 'blink': blink(t, (0.92,)), 'open': 1.0, 'mroll': 7 * k, 'brow': (0.5, 0)}


def lerp_arm(rest, target, k):
    return {'hand': lerp(rest, target['hand'], k), 'pole': target.get('pole', (0, 0, -1))}


def dance(t):
    # two beats: step right, step left. Hips lead, arms follow.
    side = s(t)
    beat = abs(s(t, 1, 0.0)) ** 0.8
    bounce = -0.07 * (0.5 + 0.5 * c(t, 4))
    lf = max(0.0, s(t, 1, 0.5)); rf = max(0.0, s(t, 1, 0.0))
    return {'pos': (0.16 * side, 0, 0), 'dz': bounce, 'sq': 1 + 0.03 * c(t, 4, 0.1), 'tilt': 6 * side, 'lean': (0, -7 * side), 'twist': 14 * s(t, 1, 0.1),
            'armR': {'hand': (1.0 + 0.1 * side, -0.25, 0.2 + 0.45 * side), 'pole': (1, 0.3, -0.6), 'len': 0.95},
            'armL': {'hand': (-1.0 + 0.1 * side, -0.25, 0.2 - 0.45 * side), 'pole': (-1, 0.3, -0.6), 'len': 0.95},
            'legL': {'foot': (-0.25, -0.05 * lf, 0.16 * lf), 'rot': (25 * lf, 0, -8)}, 'legR': {'foot': (0.25, -0.05 * rf, 0.16 * rf), 'rot': (25 * rf, 0, 8)},
            'eyes': 'happy', 'mouth': 'laugh', 'open': 0.8 + 0.1 * c(t, 2), 'brow': (0.7, 0)}


def flex(t):
    pump = key(t, [(0, 0.2), (0.14, 1), (0.34, 0.7), (0.5, 1), (0.78, 0.85)], loop=True)
    return {'sq': 1 + 0.02 * pump, 'dz': 0.02 * pump, 'tilt': 3, 'lean': (-2, 4), 'twist': 10,
            'armR': {'hand': (0.86, -0.12, 0.1 + 0.2 * pump), 'pole': (1, 0, -0.25), 'len': 1.05},
            'armL': HIPL, 'look': (0.5, 0.1), 'blink': blink(t, (0.9,)), 'mouth': 'open', 'open': 0.9, 'mroll': 6, 'brow': (0.2, -0.6)}


def cover(t):
    # hidden (0–.42) · parts hands and grins (.42–.86) · covers again
    k = key(t, [(0, 0), (0.42, 0), (0.52, 1), (0.86, 1), (0.96, 0)], loop=True)
    pk = ss(k)
    hx = lerp(0.33, 0.86, pk); hz = lerp(0.24, 0.12, pk)
    return {**breathe(t, 2), 'lean': (lerp(5, -2, pk), 0), 'dz': 0.05 * math.sin(math.pi * pk) if 0 < pk < 1 else 0,
            'armL': {'hand': (-hx, -0.93, hz), 'pole': (-1, -0.3, -0.5), 'len': 1.2, 'rot': (-20, 0, 0)},
            'armR': {'hand': (hx, -0.93, hz), 'pole': (1, -0.3, -0.5), 'len': 1.2, 'rot': (-20, 0, 0)},
            'eyes': 'open', 'wide': 1.08, 'blink': blink(t, (0.7,)), 'mouth': 'laugh' if pk > 0.5 else 'open', 'open': lerp(0.8, 1.0, pk), 'brow': (0.4 + 0.5 * pk, 0)}


def search(t):
    sw = s(t)
    return {**breathe(t, 2), 'twist': 9 * sw, 'lean': (7, 3 * sw), 'tilt': 1.5 * sw, 'pos': (0.05 * sw, 0, 0),
            'armR': {'hand': (0.70, -0.98, -0.22), 'pole': (1, 0.3, -0.7), 'len': 1.0},
            'props': {'magnifier': {'at': 'body', 'loc': (0.36, -1.08, 0.24), 'rot': (0, 0, 0), 'scale': 1.0}},
            'armL': HIPL, 'wide': (1.0, 1.32), 'look': (0.5 * sw, -0.1), 'blink': blink(t, (0.5,)), 'mouth': 'o', 'open': 0.5, 'brow': (0.7, 0.2)}


def idea(t):
    # wondering (0–.2) · pop! (.2–.32) · holding the idea, bulb bobbing (.32–.86) · bulb fades for the loop
    k = key(t, [(0, 0), (0.2, 0), (0.3, 1), (0.86, 1), (0.96, 0)], loop=True)
    pop = overshoot((t - 0.2) / 0.14, 2.6) if 0.2 <= t < 0.86 else (1 - ss((t - 0.86) / 0.1) if t >= 0.86 else 0)
    hop = arc_z((t - 0.2) / 0.22, 0.22) if 0.2 <= t <= 0.42 else 0
    bob = 0.03 * s(t, 2)
    P = {'pos': (0, 0, hop), 'sq': 1 + 0.07 * (overshoot((t - 0.2) / 0.14) - 1 if 0.2 <= t < 0.5 else 0), **({} if k else {}),
         'armR': {'hand': lerp((0.36, -0.84, -0.40), (0.84, -0.3, 0.86), ss(k)), 'pole': (1, 0.3, -0.6), 'len': lerp(0.86, 1.28, ss(k))}, 'finger': (0, ss(k)),
         'armL': HIPL if k > 0.5 else {'hand': RL},
         'look': lerp((-0.6, 0.8), (0, 0.25), ss(k)), 'wide': 1 + 0.1 * ss(k), 'blink': blink(t, (0.1, 0.62)), 'mouth': 'laugh' if k > 0.5 else 'smile', 'open': 0.9, 'brow': (0.6 + 0.5 * ss(k), 0)}
    if pop > 0.02:
        P['props'] = {'bulb': {'at': 'root', 'loc': (0, -0.1, 3.42 + bob + hop), 'rot': (0, 6 * s(t, 2), 0), 'scale': max(0.02, pop)}}
    return P


def trophy(t):
    b = abs(s(t)) ** 1.3
    z = 0.16 * b
    return {'pos': (0, 0, z), 'sq': 1 + 0.04 * s(t, 2, 0.15), 'dz': -0.03 * (1 - b),
            'armL': {'hand': (-0.3, -0.42, 1.22), 'pole': (-1, -0.1, 0.1), 'len': 1.75}, 'armR': {'hand': (0.3, -0.42, 1.22), 'pole': (1, -0.1, 0.1), 'len': 1.75},
            'props': {'trophy': {'at': 'body', 'loc': (0, -0.42, 1.68 + 0.02 * b), 'rot': (0, 0, 6 * s(t)), 'scale': 1.45}},
            'eyes': 'happy', 'mouth': 'laugh', 'open': 0.9, 'brow': (0.8, 0), 'leaf': (0, 10, 30)}


def water(t):
    tip = 0.5 + 0.5 * s(t)
    return {**breathe(t, 2), 'lean': (5 + 3 * tip, 3), 'twist': 12, 'tilt': 2,
            'armR': {'hand': (0.34, -1.02, -0.56 + 0.06 * tip), 'pole': (1, 0.3, -0.6), 'len': 1.0},
            'armL': {'hand': (-0.3, -0.98, -0.66 + 0.03 * tip), 'pole': (-1, 0.1, -0.6), 'len': 1.0},
            'props': {'can': {'at': 'body', 'loc': (0.12, -1.16, -0.66 + 0.06 * tip), 'rot': (0, 10 + 24 * tip, -10), 'scale': 1.15}},
            'look': (0.55, -0.6), 'blink': blink(t, (0.4,)), 'mouth': 'open', 'open': 0.85, 'brow': (0.4, 0)}


def lantern(t):
    sw = s(t)
    look = key(t, [(0, -0.8), (0.35, -0.8), (0.5, 0.8), (0.85, 0.8)], loop=True)
    return {**breathe(t, 2), 'twist': 9 * look, 'lean': (5, 2 * look), 'tilt': 1.2 * sw,
            'armR': {'hand': (1.08, -0.42, 0.42 + 0.02 * sw), 'pole': (1, 0.3, -1), 'len': 1.0},
            'props': {'lantern': {'at': 'handR', 'upright': True, 'loc': (0.0, -0.05, -0.52), 'rot': (0, 6 * s(t, 1, 0.2), 0), 'scale': 1.15}},
            'armL': {'hand': (-0.36, -0.86, 0.60), 'pole': (-1, 0.1, 0.3), 'len': 1.3, 'rot': (-70, 0, 0)},
            'look': (look, 0.05), 'wide': 1.06, 'blink': blink(t, (0.44,)), 'mouth': 'o', 'open': 0.45, 'brow': (0.9, 0.2)}


def yes(t):
    up = (t - 0.2) / 0.42
    z = arc_z(up, 0.24) if 0 <= up <= 1 else 0
    sq = key(t, [(0, 1), (0.14, 0.88), (0.26, 1.08), (0.6, 1.04), (0.68, 0.9), (0.84, 1.03), (1, 1)])
    arm = key(t, [(0, 0), (0.14, -0.1), (0.3, 1), (0.6, 1), (0.85, 0.15), (1, 0)])
    nod = key(t, [(0, 0), (0.14, 6), (0.3, -4), (0.66, 5), (0.85, 0), (1, 0)])
    a = max(0.0, arm)
    return {'pos': (0, 0, z), 'sq': sq, 'dz': key(t, [(0, 0), (0.14, -0.1), (0.26, 0.03), (0.62, 0.03), (0.69, -0.09), (0.86, 0.01), (1, 0)]), 'lean': (nod, 0),
            'armR': {'hand': lerp(RR, (0.98, -0.3, 0.5), a), 'pole': (1, 0.2, -0.7), 'len': 0.95},
            'armL': {'hand': lerp(RL, (-0.9, -0.2, -0.55), a)},
            'eyes': 'happy' if 0.2 < t < 0.8 else 'open', 'mouth': 'laugh' if 0.16 < t < 0.84 else 'open', 'open': 0.92, 'brow': (0.6 * a, 0)}


def no(t):
    amp = key(t, [(0, 0), (0.1, 1), (0.55, 0.6), (0.8, 0), (1, 0)])
    tw = 15 * amp * s(t * 0.8, 2.6)
    warm = ss((t - 0.72) / 0.2)
    return {'twist': tw, 'tilt': -2 * amp, 'lean': (2 * amp + 3 * math.sin(math.pi * warm) * (1 if warm < 1 else 0), 0), 'sq': 1 - 0.02 * amp,
            'armL': {'hand': add(RL, (0.02 * amp, 0, 0.03 * amp))}, 'armR': {'hand': add(RR, (-0.02 * amp, 0, 0.03 * amp))},
            'look': (-0.03 * tw, -0.1 * amp), 'blink': blink(t, (0.66,), 0.08), 'mouth': 'smile' if t < 0.78 else 'open', 'open': 0.9, 'mroll': 4 * amp, 'brow': (0.3, 0.55 * amp), 'leaf': (0, 5 * amp, 4 * amp)}


def hello(t):
    # runs in from screen left (0–.42) · skids to a stop (.42–.58) · turns and waves (.58–1)
    if t < 0.5:
        k = t / 0.5
        P = run((t * 5.0) % 1)
        x = lerp(-2.7, -0.0, 1 - (1 - k) ** 2.2)
        skid = ss((t - 0.36) / 0.14)
        P['pos'] = (x, 0, P['pos'][2] * (1 - skid))
        P['lean'] = (lerp(13, -9, skid), 0)
        P['yaw'] = 55
        if skid > 0.5:
            P['legL'] = {'foot': (-0.2, -0.3, 0), 'rot': (-25, 0, 0)}; P['legR'] = {'foot': (0.2, -0.1, 0), 'rot': (-25, 0, 0)}
            P['dz'] = -0.08 * skid
        return P
    k = (t - 0.5) / 0.5
    turn = ss(k / 0.25)
    settle = overshoot(k / 0.3)
    w = s(k * 1.6, 1, 0.0)
    up = ss((k - 0.08) / 0.2) * (1 - ss((k - 0.85) / 0.15))
    return {'yaw': lerp(55, 0, turn), 'lean': (lerp(-9, 0, settle), 2 * up), 'tilt': 2 * up, 'sq': lerp(0.92, 1, settle), 'dz': lerp(-0.08, 0, settle),
            'armR': {'hand': lerp(RR, (1.08 + 0.17 * w, -0.2, 0.38), up), 'pole': (1, 0.2, -1), 'len': 0.9, 'rot': (0, 22 * w * up, 0)},
            'armL': {'hand': RL}, 'look': (0, 0), 'blink': blink(k, (0.6,)), 'mouth': 'laugh' if k < 0.6 else 'open', 'open': 0.95, 'brow': (0.5 * up, 0)}



# ── still-only poses (no motion: t is ignored) ───────────────────────────────
def trace(t):
    return {'pos': (-0.12, 0, 0), 'tilt': 2, 'lean': (4, 5), 'twist': 12,
            'armR': {'hand': (1.14, -0.66, 0.28), 'pole': (0.6, 0.2, -1), 'len': 0.99}, 'finger': (0, 1),
            'armL': {'hand': RL},
            'look': (0.85, 0.3), 'mouth': 'smile', 'brow': (0.25, -0.35), 'mroll': 4}


def tap(t):
    return {'lean': (5, 2), 'twist': 6,
            'armR': {'hand': (0.74, -0.92, -0.42), 'pole': (0.8, -0.2, 1), 'len': 1.05}, 'finger': (0, 1),
            'armL': HIPL, 'look': (0.5, -0.85), 'mouth': 'open', 'open': 0.95, 'brow': (0.5, 0)}


def marble(t):
    return {'tilt': 2, 'lean': (2, 3), 'twist': 8,
            'armR': {'hand': (0.92, -0.62, 0.26), 'pole': (1, 0.2, -1), 'len': 1.0},
            'props': {'marble': {'at': 'handR', 'upright': True, 'loc': (0.0, -0.05, 0.25), 'rot': (0, 0, 30), 'scale': 1.25}},
            'armL': {'hand': RL}, 'look': (0.8, 0.3), 'wide': 1.08, 'mouth': 'o', 'open': 0.6, 'brow': (0.9, 0.1)}


def speak(t):
    return {'lean': (7, -3), 'twist': -10, 'tilt': -2,
            'armR': {'hand': (0.62, -0.78, -0.07), 'pole': (1, 0.0, -1), 'len': 1.05, 'rot': (0, -30, 0)},
            'armL': {'hand': add(RL, (-0.04, 0, 0.04))},
            'eyes': 'happy', 'mouth': 'laugh', 'open': 1.0, 'brow': (0.8, 0)}


def headphones(t):
    return {'tilt': 3, 'lean': (0, 3),
            'props': {'headphones': {'at': 'body'}},
            'armR': {'hand': (0.96, -0.2, 0.12), 'pole': (0.45, 0.3, -1), 'len': 0.8},
            'armL': {'hand': RL}, 'eyes': 'happy', 'mouth': 'smile', 'brow': (0.5, 0)}


def readmap(t):
    return {'lean': (6, 0),
            'props': {'map': {'at': 'body', 'loc': (0, -1.0, -0.60), 'rot': (-30, 0, 0), 'scale': 1.15}},
            'armL': {'hand': (-0.56, -0.96, -0.58), 'pole': (-1, 0.2, -0.5), 'len': 1.0},
            'armR': {'hand': (0.56, -0.96, -0.58), 'pole': (1, 0.2, -0.5), 'len': 1.0},
            'look': (0.15, -0.9), 'mouth': 'o', 'open': 0.32, 'brow': (0.8, 0.15), 'wide': 1.04}


def telescope(t):
    return {'pos': (-0.18, 0, 0), 'lean': (-3, 3), 'twist': 10, 'tilt': 2,
            'props': {'telescope': {'at': 'body', 'loc': (0.37, -0.76, 0.27), 'rot': (10, 42, 0), 'scale': 1.35}},
            'armR': {'hand': (0.83, -0.905, 0.585), 'pole': (1, 0.2, -1), 'len': 1.35},
            'armL': HIPL, 'eyes': 'winkL', 'mouth': 'open', 'open': 0.8, 'brow': (0.5, 0)}


def basket(t):
    return {'lean': (-2, 0),
            'props': {'basket': {'at': 'body', 'loc': (0, -1.0, -0.92), 'rot': (14, 0, 0), 'scale': 1.2}},
            'armL': {'hand': (-0.44, -1.02, -0.90), 'pole': (-1, 0.2, -0.3), 'len': 1.15},
            'armR': {'hand': (0.44, -1.02, -0.90), 'pole': (1, 0.2, -0.3), 'len': 1.15},
            'mouth': 'laugh', 'open': 0.85, 'brow': (0.7, 0)}


def compass(t):
    return {'lean': (4, -3), 'twist': -8, 'tilt': -2,
            'armL': {'hand': (-0.76, -0.90, -0.34), 'pole': (-1, 0.2, -0.8), 'len': 1.0},
            'props': {'compass': {'at': 'handL', 'upright': True, 'loc': (0, -0.05, 0.26), 'rot': (-40, 0, 0), 'scale': 1.15}},
            'armR': {'hand': RR}, 'look': (-0.7, -0.75), 'mouth': 'open', 'open': 0.6, 'brow': (0.8, 0.1)}


def shiver(t):
    return {'sq': 0.96, 'dz': -0.04, 'lean': (5, -3), 'tilt': -3,
            'armR': {'hand': (-0.36, -0.56, -0.60), 'pole': (0.2, -1, 0), 'len': 1.5},
            'armL': {'hand': (0.36, -0.64, -0.66), 'pole': (-0.2, -1, 0), 'len': 1.66},
            'legL': {'foot': (-0.21, 0, 0), 'rot': (0, 0, 9)}, 'legR': {'foot': (0.21, 0, 0), 'rot': (0, 0, -9)},
            'look': (0.65, 0.6), 'mouth': 'o', 'open': 0.4, 'brow': (0.7, 0.9), 'leaf': (6, 16, 14)}


def hike(t):
    P = _walk(0.15, stride=0.52, lift=0.17, swing=0.34, bob=0.06, yaw=36, lean=5)
    P['props'] = {'backpack': {'at': 'body', 'loc': (0, 1.0, -0.17), 'scale': 1.45}, 'strapL': {'at': 'body'},
                  'bedroll': {'at': 'body', 'loc': (0, 0.98, 0.56), 'rot': (0, 0, 0), 'scale': 1.15}}
    P['look'] = (0.4, 0.1); P['mouth'] = 'smile'; P['brow'] = (0.2, -0.5)
    return P


def calm(t):
    return {'sq': 1.02, 'lean': (-2, 0),
            'armL': {'hand': (-0.10, -0.68, -0.62), 'pole': (-1, 0.3, -0.6), 'len': 1.15},
            'armR': {'hand': (0.08, -0.75, -0.55), 'pole': (1, 0.3, -0.6), 'len': 1.15},
            'eyes': 'shut', 'mouth': 'smile', 'brow': (0.3, 0.1), 'leaf': (0, 4, 8)}


# ── registry ─────────────────────────────────────────────────────────────────
PX = 127           # pixels per unit: a standing Root is about 370 px tall
BOTTOM = -0.08
BOXES = {          # name: (width, height) in units
    'std': (2.55, 3.20), 'wide': (3.20, 3.20), 'tall': (2.55, 4.02), 'tallwide': (3.20, 4.02),
}
STAND = 2.92       # feet to leaf tips
LEDGE = 0.22 + 1.02 - 0.40   # where the peek clip is cut: just under the mouth


class Clip:
    def __init__(self, fn, frames, fps, loop=True, box='std', hold=0, bottom=BOTTOM, top=None, base=0.0, height=None, seat=None, aspect=0.66, face=1.46):
        self.fn, self.frames, self.fps, self.loop, self.box, self.hold = fn, frames, fps, loop, box, hold
        self.bottom = bottom                 # z of the frame's bottom edge
        self.w, self.h = BOXES[box] if height is None else (BOXES[box][0], height)
        self.base = base                     # z of the layout box bottom (feet, or the ledge for peek)
        self.top = STAND if top is None else top   # z of the layout box top (leaf tips, or the fists for hang)
        self.seat = seat
        self.aspect = aspect                 # layout width / layout height
        self.face = face                     # z of the middle of the face, for the round avatar crop


def Still(fn, **kw):
    """A pose with no motion: one frame."""
    return Clip(fn, 1, 1, hold=0, **kw)


CLIPS = {
    'idle': Clip(idle, 30, 12, hold=0),
    'walk': Clip(walk, 20, 18, hold=3),
    'run': Clip(run, 14, 20, box='wide', hold=2, aspect=0.8),
    'wave': Clip(wave, 24, 16, box='wide', hold=3, aspect=0.74),
    'cheer': Clip(cheer, 24, 18, box='tall', hold=9, aspect=0.74),
    'think': Clip(think, 30, 12, hold=4),
    'listen': Clip(listen, 24, 12, box='wide', hold=3, aspect=0.72),
    'thumbs': Clip(thumbs, 24, 16, hold=5),
    'sleep': Clip(sleep, 30, 10, hold=6, aspect=0.74, face=1.3),
    'point': Clip(point, 24, 16, box='wide', hold=6, aspect=0.82),
    'read': Clip(read, 30, 12, hold=4, aspect=0.74, face=1.3),
    'write': Clip(write, 14, 20, box='wide', hold=2, aspect=0.8),
    'peek': Clip(peek, 30, 12, hold=0, bottom=LEDGE, height=2.36, base=LEDGE, aspect=0.8),
    'sit': Clip(sit, 24, 12, hold=2, bottom=-0.24, height=3.42, base=-0.16, top=STAND + SEAT - 0.28, seat=SEAT, aspect=0.66, face=1.46 + SEAT - 0.28),
    'hang': Clip(hang, 24, 14, box='tall', hold=3, top=HANG_Z + 0.2, bottom=HANG_Z + 0.2 - 3.6, height=3.6, base=0.0, aspect=0.58),
    'gasp': Clip(gasp, 20, 16, hold=3),
    'oops': Clip(oops, 30, 12, hold=4),
    'laugh': Clip(laugh, 20, 18, hold=2),
    'love': Clip(love, 30, 12, hold=5, aspect=0.7),
    'proud': Clip(proud, 30, 12, hold=3),
    'wink': Clip(wink, 24, 16, hold=8),
    'dance': Clip(dance, 24, 18, box='wide', hold=5, aspect=0.82),
    'flex': Clip(flex, 24, 14, hold=4, aspect=0.72),
    'cover': Clip(cover, 30, 14, hold=4),
    'search': Clip(search, 30, 12, hold=4, aspect=0.72),
    'idea': Clip(idea, 24, 16, box='tall', hold=10),
    'trophy': Clip(trophy, 24, 16, box='tall', hold=5),
    'water': Clip(water, 30, 12, hold=10, aspect=0.74),
    'lantern': Clip(lantern, 30, 12, hold=3, aspect=0.8),
    'jump': Clip(jump, 20, 20, loop=False, box='tall', hold=9),
    'yes': Clip(yes, 16, 20, loop=False, hold=7),
    'no': Clip(no, 20, 18, loop=False, hold=4),
    'hello': Clip(hello, 25, 15, loop=False, box='wide', hold=24, aspect=0.74),
    # still-only poses
    'trace': Still(trace, box='wide', aspect=0.82),
    'tap': Still(tap, aspect=0.7),
    'marble': Still(marble, box='wide', aspect=0.8),
    'speak': Still(speak, aspect=0.7),
    'headphones': Still(headphones, aspect=0.74),
    'map': Still(readmap),
    'telescope': Still(telescope, box='wide', aspect=0.82),
    'basket': Still(basket),
    'compass': Still(compass, aspect=0.74),
    'shiver': Still(shiver),
    'hike': Still(hike, aspect=0.7),
    'calm': Still(calm),
}

# keepsake objects, rendered on their own (render.py --keepsake): id -> prop and how it is turned (degrees)
KEEPSAKES = {
    'garden': {'prop': 'can', 'rot': (20, 8, -30)},
    'orchard': {'prop': 'basket', 'rot': (22, 0, 0)},
    'market': {'prop': 'bunting', 'rot': (0, 0, 14)},
    'woods': {'prop': 'lantern', 'rot': (12, 0, 20), 'scale': 1.5, 'extra': ('halo',), 'pad': 0.0},
    'harbour': {'prop': 'compass', 'rot': (-18, 0, -24)},
    'summit': {'prop': 'telescope', 'rot': (28, 52, 0)},
}


def _kin(P):
    """What the leaves feel: sideways angle of the top of the head, and its height."""
    return (P['tilt'] + P['lean'][1] + P['twist'] * 0.4 + P['pos'][0] * 22, P['pos'][2] + P['dz'] + (P['sq'] - 1) * 2.0)


def sample(name, i):
    """Full pose for frame i of a clip, with leaf follow-through added."""
    from rootrig import pose
    cl = CLIPS[name]
    n = cl.frames
    dur = n / cl.fps

    def at(ph):
        ph = ph % 1 if cl.loop else max(0.0, min(1.0, ph))
        return pose(**cl.fn(ph))
    t = i / n if cl.loop else i / (n - 1)
    P = at(t)
    lag = 0.07 / dur
    d = 0.05 / dur
    a1, z1 = _kin(at(t - lag)); a0, z0 = _kin(at(t - lag - d))
    va, vz = (a1 - a0) / 0.05, (z1 - z0) / 0.05
    side, fwd, spread = P['leaf']
    P['leaf'] = (side - max(-26, min(26, 0.3 * va)), fwd + max(-10, min(14, 3 * vz)), spread + max(-16, min(24, 9 * vz)))
    return P
