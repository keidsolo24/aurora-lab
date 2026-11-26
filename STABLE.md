# Aurora Lab · stable baseline

**Stable version: v2069 (26. 11. 2026)** — branch `stable-v2069` on GitHub.
If an update breaks something, this is the version to go back to.

## Freeze · Fri 27. 11. – Sun 29. 11. 2026
No visual changes (layout, colours, motion, CSS look). Only logic and added value:
sync, data, AI behaviour, tools, flows. A visual bug fix is allowed only if something is broken, not "nicer".

## Rules that must not regress
1. Top area (title + back/actions) is fixed and the same on every page. No band, no glow, no blur drawn over it. Content scrolls away under it.
2. Phone and PC behave the same: coloured Spaces cards, same orb squares.
3. Orb squares never overlap and never leave the screen (edge-aware fan from any orb).
4. Board stack: back photos slightly blurred, sharpen on fan; stack must not stick out.
5. Plan: List/Week/Month switch stays on the right.
6. Mobile Home without scrolling.

## Before every push
- New class names checked against all CSS/JS (no collisions — v2061 broke on `.a3lw`, `.a3pill`, `.a3dl`).
- Screenshots: phone, iPad, PC, light and dark.
- Bump `?v=` in index.html + `v20-NN` in sw.js + "Lab vNNNN" in js/a3.js; copy changed files to repo root AND `app/`.
- After push: verify deploy with a marker file `v/NNNN.txt` (cached JS/CSS fetches lie). Only then tell Matej to open the app.
