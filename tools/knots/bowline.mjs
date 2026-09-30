// Bowline, four steps. Every step is the finished knot's rope cut short, so only the end moves.
// Crossings follow the card: the tail side crosses on top of the standing part, the end comes up
// through the small loop from behind, goes behind the standing part, and goes back down the loop.
import { analyze, panelSVG, renderPNG } from './knot-tool.mjs';

const W = 512, H = 768, ROPE = 32;
const P = {
  S1: [[262, -10], [262, 100], [262, 180], [262, 240]],
  S2: [[262, 272], [262, 300], [246, 318]],
  ringUL: [[226, 330], [198, 344], [176, 362]],
  ringBot: [[180, 392], [205, 412], [262, 422], [322, 410], [347, 388]],
  ringR: [[356, 358], [346, 334], [322, 318], [292, 306]],
  cX: [[276, 301], [262, 298], [240, 286], [212, 274], [186, 272]],
  cL: [[150, 288], [126, 340], [118, 440], [130, 570], [185, 672]],
  loop: [[262, 706], [345, 678], [392, 600], [395, 510], [368, 462]],
  up: [[335, 446], [313, 428], [307, 398], [306, 360], [307, 320], [308, 270], [308, 228]],
  collar: [[300, 198], [282, 182], [262, 176], [242, 178], [224, 192], [213, 218], [211, 240]],
  tail: [[212, 262], [213, 285], [216, 320], [219, 360], [222, 400], [226, 450], [231, 512]],
};
// Step 1 leaves the rest of the rope lying in a U with the end below the loop.
const LOOP_SHORT = [[262, 706], [345, 678], [390, 610], [398, 540]];

const RULES = [
  ['cX', 'S2'], // tail side crossing on top
  ['ringBot', 'up'], // end comes up through the loop from underneath...
  ['up', 'ringR'], // ...and out over the far rim
  ['S1', 'collar'], // around behind the standing part
  ['tail', 'cX'],
  ['tail', 'ringUL'], // back down through the loop from the front...
  ['ringBot', 'tail'], // ...and out underneath
];

const ORDER = ['S1', 'S2', 'ringUL', 'ringBot', 'ringR', 'cX', 'cL', 'loop', 'up', 'collar', 'tail'];
function step(n, last) {
  const names = ORDER.slice(0, ORDER.indexOf(last) + 1);
  return {
    name: `bowline-${n}`,
    width: W,
    height: H,
    rope: names.map((k) => [k, k === 'loop' && last === 'loop' ? LOOP_SHORT : P[k]]),
    over: RULES.filter(([a, b]) => names.includes(a) && names.includes(b)),
  };
}

const steps = [step(1, 'loop'), step(2, 'up'), step(3, 'collar'), step(4, 'tail')];
for (const p of steps) {
  const an = analyze(p);
  console.log(p.name, 'crossings', an.crossings.length, 'problems', an.problems);
  renderPNG(panelSVG(p, an, { debug: true, w: ROPE }), `${process.cwd()}/${p.name}-debug.png`, W, H);
  renderPNG(panelSVG(p, an, { scale: 2, w: ROPE }), `${process.cwd()}/${p.name}-ref.png`, W * 2, H * 2);
}
