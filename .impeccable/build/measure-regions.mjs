// Tighten generous search boxes to the ink they contain, then emit regions.json (fractions of the comp).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const COMP = '../mocks/decision/check-in-lookback.png', W = 864, H = 1872;
// [id, kind, note, searchBox[x,y,w,h], mode]  mode: 'light' ink on dark, 'dark' ink on light, 'edge' container edge vs ground, 'asis' keep box
const R = [
  ['header-bar', 'chrome', 'flat night-forest header bar across the top', [0,0,864,150], 'asis'],
  ['brand-mark', 'chrome', 'small gold three-pine mark', [40,30,85,90], 'light'],
  ['app-title', 'text', "serif app title The Ranger's Road in cream", [135,40,420,70], 'light'],
  ['back-link', 'control', 'left arrow and sans Back to Journal in secondary ink', [35,190,300,50], 'dark'],
  ['page-title', 'text', 'large serif page title Monthly check-in', [30,262,680,100], 'dark'],
  ['date-line', 'text', 'quiet sans line Day 29 · Monday, October 12 in secondary ink', [30,364,450,46], 'dark'],
  ['lookback-heading', 'text', 'serif section heading The last 28 days', [30,450,480,80], 'dark'],
  ['lookback-panel', 'chrome', 'read-only parchment-tint panel with 6px corners holding the readiness averages', [30,532,804,360], 'edge'],
  ['sleep-label', 'text', 'spaced caps AVERAGE SLEEP in sage', [58,574,240,34], 'dark'],
  ['sleep-value', 'text', 'large serif numeral 6.6', [58,622,170,104], 'dark'],
  ['sleep-unit', 'text', 'sans hours after the numeral', [236,680,104,46], 'dark'],
  ['panel-divider', 'chrome', 'vertical hairline dividing sleep from the pain rows', [401,565,5,221], 'asis'],
  ['back-label', 'text', 'spaced caps BACK PAIN in sage', [436,580,150,30], 'dark'],
  ['back-value', 'text', 'serif numeral 2.4', [724,570,90,54], 'dark'],
  ['shoulder-label', 'text', 'spaced caps SHOULDER PAIN in sage', [436,660,215,30], 'dark'],
  ['shoulder-value', 'text', 'serif numeral 1.1', [724,650,90,54], 'dark'],
  ['neck-label', 'text', 'spaced caps NECK PAIN in sage', [436,740,150,30], 'dark'],
  ['neck-value', 'text', 'serif numeral 0.8', [724,730,90,54], 'dark'],
  ['panel-rule', 'chrome', 'hairline rule across the panel above its note', [62,808,742,5], 'asis'],
  ['panel-note', 'text', 'sans note Averages from 22 readiness checks.', [58,826,400,40], 'dark'],
  ['section-rule', 'chrome', 'hairline rule between the look-back and Body', [37,925,790,4], 'asis'],
  ['body-heading', 'text', 'serif section heading Body', [30,960,180,76], 'dark'],
  ['weight-label', 'text', 'spaced caps WEIGHT (LB) in sage', [34,1056,200,34], 'dark'],
  ['weight-field', 'control', 'bordered number field holding the large serif numeral 221.6', [34,1094,392,118], 'edge'],
  ['waist-label', 'text', 'spaced caps WAIST (IN) in sage', [440,1056,170,34], 'dark'],
  ['waist-field', 'control', 'bordered number field holding the large serif numeral 41.5', [440,1094,392,118], 'edge'],
  ['rhr-label', 'text', 'spaced caps RESTING HEART RATE (BPM) in sage', [34,1250,400,34], 'dark'],
  ['rhr-field', 'control', 'half-width bordered number field holding the large serif numeral 68', [34,1289,394,118], 'edge'],
  ['rhr-help', 'text', 'two-line sans help Sit quietly for 5 minutes, then count for 60 seconds.', [446,1302,316,86], 'dark'],
  ['dock-rule', 'chrome', 'full-width hairline rule above the docked save button', [0,1576,864,5], 'asis'],
  ['save-button', 'control', 'full-width pine button docked above the tabs', [30,1585,805,114], 'edge'],
  ['save-label', 'text', 'Save check-in label in cream', [310,1616,250,56], 'light'],
  ['nav-bar', 'chrome', 'bottom navigation bar on paper with hairline top rule', [0,1702,864,170], 'asis'],
  ['nav-keep', 'control', 'Keep tab: gray house line icon and label', [40,1730,100,95], 'dark'],
  ['nav-road', 'control', 'Road tab: gray road icon and label', [200,1730,120,95], 'dark'],
  ['nav-forge', 'control', 'Forge tab: gray anvil icon and label', [385,1730,95,95], 'dark'],
  ['nav-journal', 'control', 'selected Journal tab: pine open-book icon, pine label, short gold underline', [540,1730,125,112], 'dark'],
  ['nav-field-manual', 'control', 'Field Manual tab: folded-map line icon and label', [695,1730,160,95], 'dark'],
];
const tight = ([x,y,w,h], mode) => {
  if (mode === 'asis') return [x,y,w,h];
  const ops = mode === 'edge'
    ? ['-fuzz', '4%']
    : ['-colorspace', 'gray', ...(mode === 'dark' ? ['-negate'] : []), '-threshold', mode === 'dark' ? '45%' : '55%'];
  const g = execFileSync('magick', [COMP, '-crop', `${w}x${h}+${x}+${y}`, '+repage', ...ops, '-format', '%@', 'info:']).toString().trim();
  const m = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(g);
  if (!m) throw new Error(`no ink for box ${[x,y,w,h]}: ${g}`);
  return [x + +m[3], y + +m[4], +m[1], +m[2]];
};
const f = (v, d) => Math.round((v / d) * 10000) / 10000;
const regions = R.map(([id, kind, note, box, mode]) => {
  const t = tight(box, mode), P = mode === 'asis' ? 0 : 4;
  const x = Math.max(0, t[0] - P), y = Math.max(0, t[1] - P), w = Math.min(W - x, t[2] + 2 * P), h = Math.min(H - y, t[3] + 2 * P);
  console.log(id.padEnd(18), kind.padEnd(8), `${x},${y} ${w}x${h}`);
  return { id, kind, note, box: { x: f(x, W), y: f(y, H), w: f(w, W), h: f(h, H) }, snap: false };
});
writeFileSync('regions.json', JSON.stringify({ regions, allowUncovered: true }, null, 2) + '\n');
