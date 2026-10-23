# Plinkemoji: deforming Blob

The playable Blob now uses a live Three.js surface rather than enlarging its bonus-picker image. Its glossy body, separate eyes, pupils, cheeks and smile are built from geometry. The generated image remains the picker icon.

## Movement and collisions

- A 48-node damped spring ring drives the body outline at the existing 120 Hz physics rate. Mesh vertices follow that ring, with smooth radial interpolation and recomputed surface normals for moving reflections.
- After reaching the middle, the Blob eases horizontally toward the board centre. Horizontal growth is faster than vertical growth, with travelling irregularities, so it becomes fat and lumpy instead of uniformly scaling.
- Pegs hold the skin back for 0.32 seconds. The skin dents around their contact points and springs back when they break. Peg destruction still uses the shared, once-only scoring system, including red-peg penalties.
- Inflation has no fixed end timer or maximum-size trigger. The first intersection of the skin perimeter with an electric zigzag segment causes the single burst, at that contact point.
- Glossy droplets scatter from the contact point. The body collapses into a rippling, deflated shape, then launches upward into six seconds of air-powered circular flight. Steering keeps it within the playfield while it loops, slowing over the final 2.2 seconds as the air runs out. Normal gravity and box rules then finish the turn. Only one box scores, and its lid must already be broken.

## Rendering and fallback

The transparent 3D layer follows the same board projection on desktop and mobile. The front box edge hides the final sinking body. Pixel density is capped at 1.75, geometry is reused, and unchanged frames skip drawing. The renderer loads only when Blob is selected and disposes its resources when removed. If 3D support is missing or lost, an animated vector outline follows the same physics data; it does not revert to scaling the old image.

## Verification

`node scripts/test-plinko.mjs` covers 2,640 turns across eight round layouts, ten entries and all bonuses, including 240 Blob turns. Checks include finite skin coordinates, widening shape, peg resistance, one burst, wall contact at the burst, deflation, complete landing and scoring integrity. Browser checks cover the live 3D body at growth/contact/burst/deflation checkpoints, desktop and mobile full-turn gameplay, and the no-3D fallback. Test captures are in ignored `output/playwright/`.
