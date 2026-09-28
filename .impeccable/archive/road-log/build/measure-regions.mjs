// Tighten generous search boxes to the ink they contain, then emit regions.json (fractions of the comp).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const COMP = '../mocks/decision/road-log-halves.png', W = 864, H = 1872;
// [id, kind, note, searchBox[x,y,w,h], mode]  mode: 'light' ink on dark, 'dark' ink on light, 'edge' container edge vs ground, 'asis' keep box
const R = [
  ['header-bar', 'chrome', 'flat night-forest header bar across the top', [0,0,864,148], 'asis'],
  ['brand-mark', 'chrome', 'small gold three-pine mark', [40,30,85,90], 'light'],
  ['app-title', 'text', "serif app title The Ranger's Road in cream", [135,40,420,70], 'light'],
  ['back-link', 'control', 'left arrow and sans Back to Road in secondary ink', [35,190,265,50], 'dark'],
  ['page-title', 'text', 'large serif page title Log a walk', [30,262,440,100], 'dark'],
  ['walk-heading', 'text', 'serif section heading The walk', [30,400,270,70], 'dark'],
  ['date-label', 'text', 'spaced caps DATE in sage', [30,490,100,32], 'dark'],
  ['date-today', 'control', 'selected segmented button Today: pine fill, cream sans label', [34,530,268,88], 'edge'],
  ['date-yesterday', 'control', 'segmented button Yesterday: 1px border, ink sans label', [302,530,264,88], 'edge'],
  ['date-pick', 'control', 'segmented button Pick a date: 1px border, ink sans label', [567,530,264,88], 'edge'],
  ['miles-label', 'text', 'spaced caps MILES in sage', [30,655,110,32], 'dark'],
  ['miles-field', 'control', 'bordered number field holding the large serif numeral 2.1', [34,690,386,114], 'edge'],
  ['minutes-label', 'text', 'spaced caps MINUTES in sage', [445,655,140,32], 'dark'],
  ['minutes-field', 'control', 'bordered number field holding the large serif numeral 41', [446,690,386,114], 'edge'],
  ['terrain-label', 'text', 'spaced caps TERRAIN in sage', [30,838,140,32], 'dark'],
  ['terrain-field', 'control', 'full-width bordered text field holding Gravel trail in sans', [34,874,800,94], 'edge'],
  ['section-rule', 'chrome', 'hairline rule between the two halves', [37,1006,790,3], 'asis'],
  ['felt-heading', 'text', 'serif section heading How it felt', [30,1045,300,70], 'dark'],
  ['effort-label', 'text', 'spaced caps EFFORT (RPE) in sage', [30,1140,215,34], 'dark'],
  ['effort-scale', 'control', 'ten bordered tap buttons with serif numerals 1 to 10 in two rows of five', [34,1178,798,226], 'edge'],
  ['effort-selected', 'control', 'selected effort 6: pine fill with cream serif numeral', [34,1296,156,108], 'edge'],
  ['effort-help', 'text', 'sans help line 1 is very easy. 10 is as hard as you can go.', [30,1418,530,40], 'dark'],
  ['pain-toggle', 'control', 'plus sign and sans Add pain before and after (optional) in secondary ink', [35,1495,575,60], 'dark'],
  ['dock-rule', 'chrome', 'hairline rule above the docked save button', [37,1567,790,3], 'asis'],
  ['save-button', 'control', 'full-width pine button docked above the tabs', [33,1598,799,94], 'edge'],
  ['save-label', 'text', 'Save walk label in cream', [330,1618,205,52], 'light'],
  ['nav-bar', 'chrome', 'bottom navigation bar on paper with hairline top rule', [0,1712,864,160], 'asis'],
  ['nav-keep', 'control', 'Keep tab: gray house line icon and label', [40,1730,100,95], 'dark'],
  ['nav-road', 'control', 'selected Road tab: pine road icon, pine label, short gold underline', [200,1730,120,112], 'dark'],
  ['nav-forge', 'control', 'Forge tab: gray anvil icon and label', [385,1730,95,95], 'dark'],
  ['nav-journal', 'control', 'Journal tab: open-book line icon and label', [555,1730,100,95], 'dark'],
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
writeFileSync('regions.json', JSON.stringify({ regions }, null, 2) + '\n');
