# Root, the animated mascot

Root is a procedural Blender character. Nothing here is modelled by hand: `rootrig.py` builds the
body, face, leaves, limbs, props, lights and camera from code, and `clips.py` animates it. The app
plays the result as sprite sheets (`src/components/Sprite.tsx`, `Mascot.tsx`).

## Re-render everything

```bash
./render_all.sh
```

That renders every clip, packs one WebP sprite sheet per clip into `assets/mascot/clips/`, a
double-size still per clip into `assets/mascot/still/`, and regenerates
`src/components/mascotClips.ts`. Review `out/contact.jpg` and `out/contact_dark.jpg` afterwards.

## Files

| File | What it is |
| --- | --- |
| `rootrig.py` | The character. `build()` makes the scene; `apply(pose)` poses it. Shoulders and hips ride on the body, hands and feet go where the pose says, elbows and knees bend to fit. Face: eyes that look and blink, brows, five mouth shapes (the open mouth is a real cut into the body). |
| `clips.py` | Every clip as a function of phase `t` in 0…1 returning pose values, plus the registry (`CLIPS`: frames, fps, loop, frame box, anchors). Leaf follow-through is added automatically from how the body just moved. |
| `render.py` | `blender -b --python render.py -- <clip…>` renders frames. `--strip 8` renders eight half-size poses for a quick check, `--still` the hold frames at double size. |
| `strip.sh` | `./strip.sh wave cheer` → `out/strip_wave.jpg`: the fastest way to look at a change. |
| `lookdev.py` | Turnaround and face close-up of the neutral pose. |
| `pack.py` | Frames → sprite sheets, stills, manifest, contact sheets. |

## Changing or adding a clip

1. Write `def myclip(t): return {...}` in `clips.py` (see `BASE` in `rootrig.py` for every value) and add it to `CLIPS`.
2. `./strip.sh myclip`, look, adjust.
3. `blender -b --python render.py -- myclip`, `blender -b --python render.py -- --still myclip`, `python3 pack.py`.

Rules that keep clips swappable in the app: every clip is rendered at the same scale (`PX` pixels per
unit) with the feet on z = 0; loops must be periodic in `t`; a frame is at most 2048 px of sheet per
side (`pack.py` checks); standing clips keep Root centred on x = 0.
