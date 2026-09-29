// Draws rope diagrams with explicit over/under crossings and checks them with the
// Kauffman bracket: the closed knot (ends joined over the top, standing parts joined
// by the off-panel cup) and the four-ended tangle (cup cut), which tells mirror
// images apart.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

export const CHROME =
  '/Users/apple/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell';

// ---------- path building ----------
export function tf(points, { dx = 0, dy = 0, s = 1, mirror = false, cx = 0 } = {}) {
  return points.map(([x, y]) => [(mirror ? -x : x) * s + dx, y * s + dy]);
}

function buildPath(pieces, step = 1.5) {
  const cps = [];
  const owner = [];
  for (const [name, pts] of pieces) {
    for (const p of pts) {
      const last = cps[cps.length - 1];
      if (last && Math.hypot(last[0] - p[0], last[1] - p[1]) < 0.01) continue;
      cps.push(p);
      owner.push(name);
    }
  }
  const dense = [];
  const n = cps.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = cps[i - 1] ?? cps[i];
    const p1 = cps[i];
    const p2 = cps[i + 1];
    const p3 = cps[i + 2] ?? cps[i + 1];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    const K = 60;
    for (let k = 0; k < K; k++) {
      const t = k / K;
      const m = 1 - t;
      dense.push({
        x: m * m * m * p1[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * p2[0],
        y: m * m * m * p1[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * p2[1],
        piece: owner[i + 1],
      });
    }
  }
  dense.push({ x: cps[n - 1][0], y: cps[n - 1][1], piece: owner[n - 1] });
  // resample by arc length
  const out = [{ ...dense[0], s: 0 }];
  let s = 0;
  let next = step;
  for (let i = 1; i < dense.length; i++) {
    const a = dense[i - 1];
    const b = dense[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    while (len > 0 && s + len >= next) {
      const t = (next - s) / len;
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), piece: b.piece, s: next });
      next += step;
    }
    s += len;
  }
  const last = dense[dense.length - 1];
  out.push({ ...last, s });
  return out;
}

function intersect(p, p2, q, q2) {
  const rx = p2.x - p.x;
  const ry = p2.y - p.y;
  const sx = q2.x - q.x;
  const sy = q2.y - q.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((q.x - p.x) * sy - (q.y - p.y) * sx) / den;
  const u = ((q.x - p.x) * ry - (q.y - p.y) * rx) / den;
  if (t < 0 || t >= 1 || u < 0 || u >= 1) return null;
  return { t, u, x: p.x + t * rx, y: p.y + t * ry };
}

function dirAt(pts, i) {
  const a = pts[Math.max(0, i - 2)];
  const b = pts[Math.min(pts.length - 1, i + 3)];
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  return [(b.x - a.x) / l, (b.y - a.y) / l];
}

export function analyze(panel) {
  const pts = buildPath(panel.rope);
  const crossings = [];
  for (let i = 0; i < pts.length - 1; i++) {
    for (let j = i + 2; j < pts.length - 1; j++) {
      if (pts[j].s - pts[i + 1].s < 40) continue;
      const hit = intersect(pts[i], pts[i + 1], pts[j], pts[j + 1]);
      if (!hit) continue;
      const sa = pts[i].s + hit.t * (pts[i + 1].s - pts[i].s);
      const sb = pts[j].s + hit.u * (pts[j + 1].s - pts[j].s);
      if (crossings.some((c) => Math.hypot(c.x - hit.x, c.y - hit.y) < 4)) continue;
      crossings.push({ x: hit.x, y: hit.y, ia: i, ib: j, sa, sb, pa: pts[i + 1].piece, pb: pts[j + 1].piece });
    }
  }
  const problems = [];
  for (const c of crossings) {
    if (c.pa === c.pb) {
      problems.push(`piece ${c.pa} crosses itself at (${c.x.toFixed(0)},${c.y.toFixed(0)})`);
      continue;
    }
    const rule = panel.over.find(([a, b]) => (a === c.pa && b === c.pb) || (a === c.pb && b === c.pa));
    if (!rule) {
      problems.push(`no over/under rule for ${c.pa} x ${c.pb} at (${c.x.toFixed(0)},${c.y.toFixed(0)})`);
      continue;
    }
    c.overIsA = rule[0] === c.pa;
  }
  // each rule pair should cross exactly once
  for (const [a, b] of panel.over) {
    const n = crossings.filter((c) => (c.pa === a && c.pb === b) || (c.pa === b && c.pb === a)).length;
    if (n !== 1) problems.push(`${a} x ${b} cross ${n} times (expected 1)`);
  }
  return { pts, crossings, problems };
}

// ---------- rendering ----------
const STYLE = {
  bg: '#F4F0E6',
  outline: '#3f2d1d',
  fill: '#c49a5e',
  shade: '#a57c45',
  light: '#e2c28a',
};

function polyD(pts) {
  return 'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L');
}

function ropeLayers(d, w, cap) {
  return [
    `<path d="${d}" stroke="${STYLE.outline}" stroke-width="${w + 5}" fill="none" stroke-linecap="${cap}" stroke-linejoin="round"/>`,
    `<path d="${d}" stroke="${STYLE.shade}" stroke-width="${w}" fill="none" stroke-linecap="${cap}" stroke-linejoin="round"/>`,
    `<path d="${d}" stroke="${STYLE.fill}" stroke-width="${w * 0.72}" fill="none" stroke-linecap="${cap}" stroke-linejoin="round"/>`,
    `<path d="${d}" stroke="${STYLE.light}" stroke-width="${w * 0.22}" fill="none" stroke-linecap="${cap}" stroke-linejoin="round"/>`,
  ].join('');
}

export function panelSVG(panel, analysis, { debug = false, w = 34, scale = 1 } = {}) {
  const { pts, crossings } = analysis;
  const W = panel.width;
  const H = panel.height;
  const parts = [];
  parts.push(`<rect width="${W}" height="${H}" fill="${STYLE.bg}"/>`);
  parts.push(
    `<defs><filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter></defs>`,
  );
  const d = polyD(pts);
  parts.push(`<path d="${d}" stroke="rgba(60,40,20,0.22)" stroke-width="${w + 6}" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#blur)" transform="translate(5 8)"/>`);
  parts.push(ropeLayers(d, w, 'round'));
  for (const c of crossings) {
    if (c.overIsA === undefined) continue;
    const s = c.overIsA ? c.sa : c.sb;
    const other = c.overIsA ? c.ib : c.ia;
    const self = c.overIsA ? c.ia : c.ib;
    const d1 = dirAt(pts, self);
    const d2 = dirAt(pts, other);
    const sin = Math.abs(d1[0] * d2[1] - d1[1] * d2[0]);
    let half = (w / 2 + 6) / Math.max(sin, 0.2) + w * 0.6;
    // don't run into the next crossing on this strand
    for (const o of crossings) {
      if (o === c) continue;
      for (const so of [o.sa, o.sb]) {
        const gap = Math.abs(so - s);
        if (gap > 0.5) half = Math.min(half, gap * 0.5);
      }
    }
    const seg = pts.filter((p) => p.s >= s - half && p.s <= s + half);
    const sd = polyD(seg);
    parts.push(`<path d="${sd}" stroke="rgba(40,25,10,0.35)" stroke-width="${w + 10}" fill="none" stroke-linecap="butt" filter="url(#blur)" transform="translate(3 5)"/>`);
    // clip the shadow to the under strand's neighbourhood so it only darkens the rope below
    parts.push(ropeLayers(sd, w, 'butt'));
  }
  if (debug) {
    crossings.forEach((c, i) => {
      const over = c.overIsA === undefined ? '?' : c.overIsA ? c.pa : c.pb;
      parts.push(
        `<text x="${c.x + 22}" y="${c.y - 18}" font-family="Menlo" font-size="15" fill="#b00020">${i + 1}:${over}</text>`,
      );
    });
    let lastPiece = null;
    for (const p of pts) {
      if (p.piece !== lastPiece) {
        parts.push(`<text x="${p.x + 8}" y="${p.y + 4}" font-family="Menlo" font-size="12" fill="#1a4d8f">${p.piece}</text>`);
        lastPiece = p.piece;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
}

export function renderPNG(svg, outPng, width, height) {
  const html = outPng.replace(/\.png$/, '.html');
  fs.writeFileSync(html, `<!doctype html><html><body style="margin:0">${svg}</body></html>`);
  execFileSync(CHROME, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    `--screenshot=${outPng}`,
    `file://${html}`,
  ], { stdio: 'ignore', timeout: 60000 });
}

// ---------- invariants ----------
const Poly = {
  add(a, b) {
    const r = new Map(a);
    for (const [e, c] of b) r.set(e, (r.get(e) || 0) + c);
    for (const [e, c] of [...r]) if (c === 0) r.delete(e);
    return r;
  },
  mul(a, b) {
    const r = new Map();
    for (const [e1, c1] of a) for (const [e2, c2] of b) r.set(e1 + e2, (r.get(e1 + e2) || 0) + c1 * c2);
    for (const [e, c] of [...r]) if (c === 0) r.delete(e);
    return r;
  },
  pow(a, n) {
    let r = new Map([[0, 1]]);
    for (let i = 0; i < n; i++) r = Poly.mul(r, a);
    return r;
  },
  str(a) {
    if (a.size === 0) return '0';
    return [...a]
      .sort((x, y) => y[0] - x[0])
      .map(([e, c]) => `${c < 0 ? '-' : '+'}${Math.abs(c)}${e === 0 ? '' : `A^${e}`}`)
      .join(' ');
  },
  eq(a, b) {
    return Poly.str(a) === Poly.str(b);
  },
};
export { Poly };
const DELTA = new Map([
  [2, -1],
  [-2, -1],
]);

class UF {
  constructor() {
    this.p = new Map();
  }
  find(x) {
    if (!this.p.has(x)) this.p.set(x, x);
    let r = x;
    while (this.p.get(r) !== r) r = this.p.get(r);
    this.p.set(x, r);
    return r;
  }
  union(a, b) {
    this.p.set(this.find(a), this.find(b));
  }
}

export function invariants(panel, analysis) {
  const { pts, crossings } = analysis;
  const cupIdx = pts.findIndex((p) => p.piece === panel.cut);
  const cupS = cupIdx >= 0 ? pts[cupIdx].s : null;
  // passages in path order
  const passages = [];
  crossings.forEach((c, ci) => {
    passages.push({ ci, s: c.sa, idx: c.ia, over: c.overIsA });
    passages.push({ ci, s: c.sb, idx: c.ib, over: !c.overIsA });
  });
  passages.sort((a, b) => a.s - b.s);
  const n2 = passages.length;
  // edge k runs from passage k-1 to passage k (k = 0..n2), edge 0 starts at the first rope end
  const cupEdge = cupS === null ? -1 : passages.filter((p) => p.s < cupS).length;
  function label(k, end, closed) {
    // end: 'start' (edge leaves passage k-1) or 'finish' (edge arrives at passage k)
    if (closed && k === n2) return 'e0';
    if (!closed && k === cupEdge) return end === 'start' ? 'cupA' : 'cupB';
    return 'e' + k;
  }
  function pd(closed) {
    const X = [];
    let writhe = 0;
    crossings.forEach((c, ci) => {
      const ps = passages.map((p, k) => ({ ...p, k })).filter((p) => p.ci === ci);
      const under = ps.find((p) => !p.over);
      const over = ps.find((p) => p.over);
      const du = dirAt(pts, under.idx);
      const dO = dirAt(pts, over.idx);
      const up = (v) => [v[0], -v[1]]; // y-up
      const U = up(du);
      const O = up(dO);
      const half = [
        { l: label(under.k, 'finish', closed), v: [-U[0], -U[1]] },
        { l: label(under.k + 1, 'start', closed), v: U },
        { l: label(over.k, 'finish', closed), v: [-O[0], -O[1]] },
        { l: label(over.k + 1, 'start', closed), v: O },
      ];
      const base = Math.atan2(half[0].v[1], half[0].v[0]);
      const ang = (v) => {
        let a = Math.atan2(v[1], v[0]) - base;
        while (a < 0) a += 2 * Math.PI;
        while (a >= 2 * Math.PI) a -= 2 * Math.PI;
        return a;
      };
      half.sort((h1, h2) => ang(h1.v) - ang(h2.v));
      X.push(half.map((h) => h.l));
      writhe += Math.sign(O[0] * U[1] - O[1] * U[0]);
    });
    return { X, writhe };
  }
  function stateSum(X, closed) {
    const n = X.length;
    let total = new Map();
    let cap = new Map();
    let side = new Map();
    const labels = new Set(X.flat());
    const ends = closed ? [] : ['e0', 'cupA', 'cupB', 'e' + n2];
    ends.forEach((e) => labels.add(e));
    for (let mask = 0; mask < 1 << n; mask++) {
      const uf = new UF();
      labels.forEach((l) => uf.find(l));
      let a = 0;
      X.forEach(([p, q, r, t], i) => {
        if (mask & (1 << i)) {
          uf.union(p, q);
          uf.union(r, t);
          a++;
        } else {
          uf.union(p, t);
          uf.union(q, r);
        }
      });
      const comps = new Set([...labels].map((l) => uf.find(l)));
      const coeff = new Map([[a - (n - a), 1]]);
      if (closed) {
        total = Poly.add(total, Poly.mul(coeff, Poly.pow(DELTA, comps.size - 1)));
      } else {
        const arcs = new Set(ends.map((e) => uf.find(e)));
        const term = Poly.mul(coeff, Poly.pow(DELTA, comps.size - arcs.size));
        if (uf.find('e0') === uf.find('e' + n2)) cap = Poly.add(cap, term);
        else side = Poly.add(side, term);
      }
    }
    return closed ? total : { cap, side };
  }
  const norm = (w) => new Map([[-3 * w, w % 2 === 0 ? 1 : -1]]);
  const c = pd(true);
  const closedPoly = Poly.mul(norm(c.writhe), stateSum(c.X, true));
  let tangle = null;
  if (cupEdge >= 0) {
    const t = pd(false);
    const r = stateSum(t.X, false);
    tangle = { cap: Poly.mul(norm(t.writhe), r.cap), side: Poly.mul(norm(t.writhe), r.side) };
  }
  return { closed: closedPoly, tangle, writhe: c.writhe, crossings: crossings.length };
}

// Normalized bracket of known knots (one chirality; the mirror swaps A and A^-1).
const T = new Map([
  [-4, 1],
  [-12, 1],
  [-16, -1],
]);
const mirror = (p) => new Map([...p].map(([e, c]) => [-e, c]));
export const KNOWN = {
  unknot: new Map([[0, 1]]),
  trefoil: T,
  'trefoil (mirror)': mirror(T),
  'square knot': Poly.mul(T, mirror(T)),
  'granny knot': Poly.mul(T, T),
  'granny knot (mirror)': Poly.mul(mirror(T), mirror(T)),
};
export function identify(p) {
  for (const [name, k] of Object.entries(KNOWN)) if (Poly.eq(p, k)) return name;
  return 'other: ' + Poly.str(p);
}
