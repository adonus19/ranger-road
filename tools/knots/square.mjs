import { analyze, invariants, identify, Poly, panelSVG, renderPNG, tf } from './knot-tool.mjs';
import fs from 'node:fs';
const W = 512, H = 768;
const CUP = (xl, xr) => ['cup', [[xl, 900], [(xl + xr) / 2, 1000], [xr, 900]]];
const at = (pts, dx, dy, s = 1) => tf(pts, { dx, dy, s });

// The first half knot, relative to its first crossing (c1).
const HALF = {
  L1: [[0, -300], [4, -200], [8, -110], [5, -45], [0, 0], [-12, 36]],
  L2: [[-28, 70], [-51, 140], [-66, 230], [-72, 360]],
  R1: [[76, 360], [69, 230], [52, 140], [28, 70], [12, 34]],
  R2: [[0, 0], [-25, -40], [-58, -56], [-88, -40], [-98, 0], [-86, 42], [-60, 66]],
  R3: [[-30, 78], [0, 86], [36, 88], [70, 82], [115, 45], [150, 0], [172, -45]],
};

// Step 1: right end crosses over the left.
const p1 = {
  name: 'square-1', width: W, height: H, cut: 'cup',
  rope: [
    ['L', [...at(HALF.L1, 256, 470), ...at(HALF.L2, 256, 470), [182, 900]]],
    CUP(182, 326),
    ['R', [[326, 900], ...at(HALF.R1, 256, 470), ...at([[0, 0], [-30, -45], [-75, -100], [-118, -150], [-146, -190]], 256, 470)]],
  ],
  over: [['R', 'L']],
};

// Step 2: tucked under and back up.
const p2 = {
  name: 'square-2', width: W, height: H, cut: 'cup',
  rope: [
    ['L1', at(HALF.L1, 256, 470)],
    ['L2', [...at(HALF.L2, 256, 470), [182, 900]]],
    CUP(182, 326),
    ['R1', [[326, 900], ...at(HALF.R1, 256, 470)]],
    ['R2', at(HALF.R2, 256, 470)],
    ['R3', at(HALF.R3, 256, 470)],
  ],
  over: [['R2', 'L1'], ['L2', 'R3'], ['R3', 'R1']],
};

// Step 3: left over right, tucked under and up through the middle.
const A1 = (pts) => at(pts, 236, 610, 0.85);
const p3 = {
  name: 'square-3', width: W, height: H, cut: 'cup',
  rope: [
    ['Lt', [[120, 330], [175, 385], [222, 423], [268, 452], [300, 478], [335, 497], [372, 500], [415, 495]]],
    ['Lloop', [[448, 470], [455, 425], [432, 395], [395, 388], [350, 380]]],
    ['Lmid', [[300, 385], [262, 410], [248, 445], [244, 480], ...A1([[8, -110], [5, -45], [0, 0], [-12, 36]])]],
    ['L2', [...A1(HALF.L2.slice(0, 3)), [182, 900]]],
    CUP(182, 326),
    ['R1', [[326, 900], ...A1(HALF.R1.slice(1))]],
    ['R2', A1(HALF.R2)],
    ['R3', A1(HALF.R3.slice(0, 5))],
    ['Rmid', [[350, 600], [362, 540], [372, 480], [385, 430], [397, 385], [410, 340]]],
    ['Rend', [[425, 280], [440, 220], [450, 180]]],
  ],
  over: [['R2', 'Lmid'], ['L2', 'R3'], ['R3', 'R1'], ['Lloop', 'Rmid'], ['Rmid', 'Lt'], ['Lt', 'Lmid']],
};

// Step 4: pulled snug. Over/under chosen by search to match step 3.
const K = (pts) => pts.map(([x, y]) => [256 + 88 * x, 500 - 88 * y]);
const REEF_PAIRS = [['Ast', 'Bbend'], ['Bbot', 'Abot'], ['Abend', 'Bst'], ['Bend', 'Abend'], ['Atop', 'Btop'], ['Bbend', 'Aend']];
const reef = (mask) => ({
  name: 'square-4', width: W, height: H, cut: 'cup',
  rope: [
    ['Aend', [[80, 280], [96, 360], ...K([[-1.75, 0.75], [-1.42, 0.5], [-1.0, 0.45]])]],
    ['Atop', K([[-0.5, 0.55], [0, 0.72], [0.5, 0.88], [0.95, 0.95]])],
    ['Abend', K([[1.35, 0.82], [1.58, 0.45], [1.62, 0], [1.58, -0.45], [1.35, -0.82], [0.95, -0.95]])],
    ['Abot', K([[0.5, -0.88], [0, -0.72], [-0.5, -0.55], [-1.0, -0.45]])],
    ['Ast', [...K([[-1.42, -0.5], [-1.75, -0.75]]), [132, 650], [174, 740], [182, 900]]],
    CUP(182, 326),
    ['Bst', [[326, 900], [338, 740], [380, 650], ...K([[1.75, -0.75], [1.42, -0.5]])]],
    ['Bbot', K([[1.0, -0.45], [0.5, -0.55], [0, -0.72], [-0.5, -0.88], [-0.95, -0.95]])],
    ['Bbend', K([[-1.35, -0.82], [-1.58, -0.45], [-1.62, 0], [-1.58, 0.45], [-1.35, 0.82], [-0.95, 0.95]])],
    ['Btop', K([[-0.5, 0.88], [0, 0.72], [0.5, 0.55], [1.0, 0.45]])],
    ['Bend', [...K([[1.42, 0.5], [1.75, 0.75]]), [416, 360], [432, 280]]],
  ],
  over: REEF_PAIRS.map((pr, i) => (mask & (1 << i) ? [pr[1], pr[0]] : pr)),
});

const report = (p) => {
  const an = analyze(p);
  const inv = invariants(p, an);
  return { an, inv };
};
const r3 = report(p3);
const want = r3.inv.tangle;
const matches = [];
for (let m = 0; m < 64; m++) {
  const { an, inv } = report(reef(m));
  if (an.problems.length) { console.log('reef geometry problems', an.problems); break; }
  const same = Poly.eq(inv.tangle.cap, want.cap) && Poly.eq(inv.tangle.side, want.side);
  if (identify(inv.closed) === 'square knot') matches.push({ m, same, over: reef(m).over.map((o) => o.join('>')).join(' ') });
}
console.log('square-knot over/under choices for step 4:');
for (const x of matches) console.log(' ', x.same ? 'MATCHES STEP 3' : 'different tangle', x.over);
const pick = matches.find((x) => x.same);
const p4 = reef(pick ? pick.m : 0);

export const PANELS = { p1, p2, p3, p4 };
for (const p of [p1, p2, p3, p4]) {
  const { an, inv } = report(p);
  console.log(p.name, 'crossings', inv.crossings, 'problems', an.problems);
  console.log('  closed:', identify(inv.closed));
  console.log('  tangle cap:', Poly.str(inv.tangle.cap), '| side:', Poly.str(inv.tangle.side));
  fs.writeFileSync(`${p.name}.svg`, panelSVG(p, an));
  renderPNG(panelSVG(p, an, { debug: true }), `${process.cwd()}/${p.name}-debug.png`, W, H);
  renderPNG(panelSVG(p, an, { scale: 2 }), `${process.cwd()}/${p.name}-ref.png`, W * 2, H * 2);
}
