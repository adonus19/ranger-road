# Knot step pictures

Each knot card's step strip starts as an exact diagram and is then repainted.

1. `node tools/knots/square.mjs` (run from any folder; files land in the current folder) draws each step
   with explicit over/under crossings and checks it with the Kauffman bracket: the closed
   knot type (a square knot, not a granny) and the four-ended tangle, so the finished knot
   matches the step before it rather than its mirror image. It writes `*-ref.png` (1024x1536)
   and `*-debug.png` (crossings and rope pieces labeled).
2. Each `*-ref.png` is repainted with `impeccable generate-image --ref <step>-ref.png
   --prompt-file tools/knots/paint-prompt.txt --size 1024x1536 --quality high --background opaque`
   (billed to the OpenAI key).
3. Every crossing in each painting is compared with its diagram. Then
   `tools/knots/compose.sh <card-id> <step1.png> ... <step4.png>` (run from the repo root) builds
   `public/images/field-manual/<card>/sequence.webp` (a 2000x780 strip of four 490x760 panels) and
   `grid.webp` (the same panels as a 1004x1548 2x2 grid for phones). Add both to the card's `sequence`.
4. A strip ships only after it has been checked against a knot tied in real rope.

Rendering uses Playwright's headless Chromium; `CHROME` in `knot-tool.mjs` holds its path.
