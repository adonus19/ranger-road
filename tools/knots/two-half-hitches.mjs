// Two half hitches around a horizontal post, six steps. Each hitch goes over the standing part,
// around behind it, and out through the loop it just made, crossing over its own rope, so the
// end reads over, under, over; both hitches turn the same way. (An earlier version tucked the
// end under its own rope, which only wraps the two strands and does not tie off.)
import { analyze, panelSVG, renderPNG } from './knot-tool.mjs';

const W = 512, H = 768, ROPE = 32;
const POST = { y0: 150, y1: 240 };
const BASE = [
  ['S', [[220, 800], [220, 600], [220, 450], [221, 300], [222, 242]]],
  ['front', [[224, 215], [232, 170], [246, 128], [270, 104], [292, 112], [302, 142]]],
  ['back', [[303, 165], [302, 215], [301, 250]]],
];

// ty: the height where a hitch's end tucks under its own descending part.
const hitch1 = (ty) => [
  ['E1', [...(ty - 70 > 270 ? [[300, ty - 70]] : []), [300, ty - 36], [299, ty + 14], [292, ty + 42]]],
  ['h1over', [[268, ty + 56], [220, ty + 64], [190, ty + 58]]],
  ['h1around', [[172, ty + 40], [178, ty + 20]]],
  ['h1back', [[198, ty + 8], [220, ty + 4], [248, ty + 2], [272, ty]]],
  ['tuck1', [[286, ty - 1], [312, ty], [336, ty + 12], [348, ty + 42]]],
];
const hitch2 = (t1, ty) => [
  ['d2', [[352, (t1 + 42 + ty - 26) / 2], [352, ty - 26], [351, ty + 14], [342, ty + 44]]],
  ['h2over', [[312, ty + 56], [220, ty + 64], [190, ty + 58]]],
  ['h2around', [[172, ty + 40], [178, ty + 20]]],
  ['h2back', [[198, ty + 8], [220, ty + 4], [250, ty + 2], [290, ty]]],
  ['tuck2', [[330, ty], [365, ty + 6], [384, ty + 22], [394, ty + 60], [398, ty + 120]]],
];

const RULES = [
  ['h1over', 'S'], // over the standing part
  ['S', 'h1back'], // around behind it
  ['tuck1', 'E1'], // out through the loop, over its own rope
  ['h2over', 'S'],
  ['S', 'h2back'],
  ['tuck2', 'd2'],
];

function panel(n, rope) {
  const names = rope.map(([k]) => k);
  return {
    name: `two-half-hitches-${n}`,
    width: W,
    height: H,
    post: POST,
    overPost: ['front'],
    rope,
    over: RULES.filter(([a, b]) => names.includes(a) && names.includes(b)),
  };
}

// The end after going around behind the standing part, before it comes out through the loop.
const around = (name, ty) => [name, [[198, ty + 8], [220, ty + 4], [244, ty + 2], [256, ty + 2]]];
const drop = ['d2', [[352, 470], [354, 540], [355, 590]]];
const steps = [
  panel(1, [...BASE, ['E1', [[300, 280], [300, 400], [301, 500], [303, 560]]]]),
  panel(2, [...BASE, ...hitch1(386).slice(0, 3), around('h1back', 386)]),
  panel(3, [...BASE, ...hitch1(386), drop]),
  panel(4, [...BASE, ...hitch1(386), ...hitch2(386, 546).slice(0, 3), around('h2back', 546)]),
  panel(5, [...BASE, ...hitch1(386), ...hitch2(386, 546)]),
  panel(6, [...BASE, ...hitch1(300), ...hitch2(300, 400)]),
];
for (const p of steps) {
  const an = analyze(p);
  console.log(p.name, 'crossings', an.crossings.length, 'problems', an.problems);
  renderPNG(panelSVG(p, an, { debug: true, w: ROPE }), `${process.cwd()}/${p.name}-debug.png`, W, H);
  renderPNG(panelSVG(p, an, { scale: 2, w: ROPE }), `${process.cwd()}/${p.name}-ref.png`, W * 2, H * 2);
}
