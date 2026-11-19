# Root, the mascot

Root is a procedural Blender character. Nothing here is modelled by hand: `rootrig.py` builds the body,
face, leaves, limbs, props, lights and camera from code, and `clips.py` poses it. The app shows only
still pictures of Root (`src/components/Mascot.tsx` reads `src/components/mascotStills.ts`); there are no
sprite sheets or animations any more.

What the pipeline produces:

| Output | From |
| --- | --- |
| `assets/mascot/still/<pose>.webp` | one picture per pose, double size, transparent background |
| `assets/props/keepsake-<id>.webp` | the six keepsake objects on their own, 512 × 512 |
| `src/components/mascotStills.ts` | generated manifest: size, layout box, face position of every still |
| `contact.jpg`, `contact_dark.jpg` | every still on one sheet, for review |

## Rendering

With Blender 4.2+ installed (EEVEE, needs a GPU):

```bash
./render_all.sh              # every pose and keepsake, then pack
./render_all.sh map hike     # only these poses, then pack
```

On a machine without a GPU (a headless Linux box) EEVEE cannot start. Use Blender as a Python module and
render with Cycles instead:

```bash
python3 -m venv ~/bvenv && ~/bvenv/bin/pip install bpy pillow numpy
ENGINE=CYCLES BPY_PYTHON=~/bvenv/bin/python ./render_all.sh map hike
```

Cycles takes about 25 s per still on four CPU cores (about a minute each when three run side by side). The
two engines match closely but not pixel for pixel: the first 33 stills were rendered with EEVEE, the 12
added later (`trace` … `calm`) and the keepsakes with Cycles. Re-render only the poses you changed, so the
rest stay exactly as shipped.

By hand, the steps are:

```bash
blender -b --python render.py -- --draft hike              # quick look: out/draft/hike.png
blender -b --python render.py -- --still hike              # final: out/stills/hike.png
blender -b --python render.py -- --keepsake harbour        # out/keepsakes/keepsake-harbour.png
python3 pack.py                                            # WebP + manifest + contact sheets
```

(`~/bvenv/bin/python render.py -- --engine CYCLES …` is the same without Blender installed.)
`pack.py` converts whatever is in `out/stills` and `out/keepsakes`, and always rewrites the manifest and the
contact sheets from the stills in `assets/mascot/still/`. A pose without a still is left out of the manifest.

## Files

| File | What it is |
| --- | --- |
| `rootrig.py` | The character. `build()` makes the scene; `apply(pose)` poses it. Shoulders and hips ride on the body, hands and feet go where the pose says, elbows and knees bend to fit. Face: eyes that look and blink, brows, mouth shapes (the open mouth is a real cut into the body). `build_props()` makes every prop; `solo()` shows one prop without Root. |
| `clips.py` | Every pose as a function returning pose values, the registry `CLIPS` (frame box, layout anchors) and `KEEPSAKES`. The first 33 poses are functions of a phase `t` left from when Root was animated; the still is their `hold` frame. Newer poses ignore `t` and are registered with `Still(...)`. |
| `render.py` | Renders stills, drafts and keepsakes (see above). |
| `pack.py` | PNG → WebP, the manifest, the contact sheets. |
| `sheet.py` | `python3 sheet.py out.jpg a.png b.png … [--h 520] [--bg dark]`: pictures side by side, to compare drafts. |
| `lookdev.py` | Turnaround and face close-up of the neutral pose. |

## Adding a pose

1. In `clips.py`, write `def mypose(t): return {...}` (see `BASE` in `rootrig.py` for every value) and add
   `'mypose': Still(mypose)` at the END of `CLIPS`, so the order of the manifest does not change.
2. Render a draft, look at it, adjust, repeat. Check that hands touch what they hold and nothing passes
   through the body.
3. Pick the frame box: `std` (2.55 × 3.20 units), `wide` (3.20 wide, when an arm or prop reaches out) or
   `tall` (4.02 high, when something goes above the leaves). Nothing may touch the edge of the picture.
4. Set `aspect`: the width / height the app reserves for the pose. 0.66 for a plain standing pose; about
   `2 × furthest reach from the centre line / 2.92` when an arm or prop sticks out (see the existing values).
5. Render the still, run `pack.py`, check `contact.jpg`.

Rules that keep poses swappable in the app: every still is rendered at the same scale (`PX` pixels per unit,
the file at twice that) with the feet on z = 0, and standing poses keep Root centred on x = 0.

A new prop goes in `build_props()` in `rootrig.py` as `g = group('name')` plus its parts, in the same soft
clay materials. A pose shows it with `'props': {'name': {'at': 'handR' | 'handL' | 'body' | 'root', 'loc': …,
'rot': …, 'scale': …}}`; props not named by a pose are hidden.

## Keepsakes

`KEEPSAKES` in `clips.py` maps each id to a prop and how it is turned toward the camera:
garden → watering can, orchard → fruit basket, market → bunting, woods → lantern (with a soft glow behind
it), harbour → compass, summit → telescope. `render.py --keepsake` hides Root, frames the object with a
little padding and renders it under the same lights as the character.
