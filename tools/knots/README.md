# Knot step pictures

Each knot card's step image (one panel per written step, two per row) starts as an exact diagram
and is then repainted.

1. `node tools/knots/<knot>.mjs` (`square`, `bowline`, `two-half-hitches`; run from any folder, files
   land in the current folder) draws each step with explicit over/under crossings and reports any
   crossing without a rule. The square knot is also checked with the Kauffman bracket: the closed
   knot type (a square knot, not a granny) and the four-ended tangle, so the finished knot matches
   the step before it rather than its mirror image. The bowline and two half hitches take their
   crossings from the card's steps (each step is the finished knot's rope cut short, so only the
   end moves). Each script writes `*-ref.png` (1024x1536) and `*-debug.png` (crossings labeled).
2. Each `*-ref.png` is repainted with `impeccable generate-image --ref <step>-ref.png
   --prompt-file tools/knots/paint-prompt*.txt --size 1024x1536 --quality high --background opaque`
   (billed to the OpenAI key). `paint-prompt.txt` is the square knot's; the bowline and the two
   half hitches (with its rail) have their own.
3. Every crossing in each painting is compared with its diagram. Then
   `tools/knots/compose.sh <card-id> <step1.png> ... <step4.png>` (run from the repo root) builds
   `public/images/field-manual/<card>/sequence.webp` (1004x1548 for four steps, 1004x2316 for six).
   Add it to the card's `sequence`, with `height` when it isn't 1548.

Check the diagram itself, not only the painting against it: the first two-half-hitches drawing
tucked the end under its own rope, which only wraps the strands. The script's crossings now read
over, under, over for each hitch; closed up, one hitch is an overhand knot (trefoil) and two
same-direction hitches are two same-handed overhands.
4. The grid ships only after it has been checked against a knot tied in real rope.

Rendering uses Playwright's headless Chromium; `CHROME` in `knot-tool.mjs` holds its path.
