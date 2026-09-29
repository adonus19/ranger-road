// Tighten generous search boxes to the ink they contain, then emit regions.json (fractions of the comp).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const COMP = '../mocks/decision/field-manual-switch-v2.png', W = 864, H = 1872;
// [id, kind, note, searchBox[x,y,w,h], mode]  mode: 'light' ink on dark, 'dark' ink on light, 'edge' container edge vs ground, 'asis' keep box
const R = [
  ['header-bar', 'chrome', 'flat night-forest header bar across the top', [0, 0, 864, 150], 'asis'],
  ['brand-mark', 'chrome', 'small gold three-pine mark', [40, 30, 85, 90], 'light'],
  ['app-title', 'text', "serif app title The Ranger's Road in cream", [135, 40, 420, 70], 'light'],
  ['page-title', 'text', 'large serif page title Field Manual', [30, 185, 480, 95], 'dark'],
  ['switch', 'control', 'segmented three-way switch, 1px rule border, 6px outer corners, full width', [38, 298, 791, 72], 'asis'],
  ['switch-selected', 'control', 'selected This week segment filled night-forest pine', [39, 299, 263, 70], 'asis'],
  ['switch-this-week', 'text', 'sans label This week in cream on the selected segment', [100, 312, 150, 45], 'light'],
  ['switch-contents', 'text', 'sans label Contents in secondary ink', [360, 312, 150, 45], 'dark'],
  ['switch-index', 'text', 'sans label Index in secondary ink', [640, 312, 120, 45], 'dark'],
  ['week-heading', 'text', 'serif section heading Week 2 · Keep Your Word', [30, 398, 590, 70], 'dark'],
  ['week-subline', 'text', 'sans subline Chapter I · The Muster in secondary ink', [30, 466, 330, 42], 'dark'],
  ['rule-this-week', 'chrome', 'hairline rule above the rows', [37, 524, 790, 4], 'asis'],
  ['lesson-medallion', 'chrome', 'round medallion ground with a gold heart pictogram (icon-sized)', [36, 545, 122, 122], 'edge'],
  ['lesson-title', 'text', 'serif row title Keep small promises', [185, 558, 380, 50], 'dark'],
  ['lesson-line', 'text', 'sans line Leadership lesson · Read Monday, about 3 minutes in secondary ink', [185, 610, 590, 42], 'dark'],
  ['lesson-arrow', 'control', 'thin right arrow', [785, 585, 45, 40], 'dark'],
  ['rule-lesson', 'chrome', 'soft hairline between rows', [37, 680, 790, 4], 'asis'],
  ['tool-medallion', 'chrome', 'round medallion ground with a gold hatchet pictogram (icon-sized)', [36, 700, 122, 122], 'edge'],
  ['tool-title', 'text', 'serif row title Tool inspection', [185, 712, 300, 52], 'dark'],
  ['tool-line', 'text', 'sans line Field card · Wednesday or Saturday in secondary ink', [185, 763, 450, 42], 'dark'],
  ['tool-arrow', 'control', 'thin right arrow', [785, 740, 45, 40], 'dark'],
  ['rule-tool', 'chrome', 'soft hairline between rows', [37, 837, 790, 4], 'asis'],
  ['reading-medallion', 'chrome', 'round medallion ground with a gold open-book pictogram (icon-sized)', [36, 858, 122, 122], 'edge'],
  ['reading-title', 'text', 'serif row title Habits of the Household', [185, 868, 440, 52], 'dark'],
  ['reading-line', 'text', 'sans line Reading · Wednesday and Friday, 10 minutes in secondary ink', [185, 920, 550, 42], 'dark'],
  ['reading-arrow', 'control', 'thin right arrow', [785, 897, 45, 40], 'dark'],
  ['rule-reading', 'chrome', 'soft hairline between rows', [37, 995, 790, 4], 'asis'],
  ['scripture-medallion', 'chrome', 'round medallion ground with a gold sunrise pictogram (icon-sized)', [36, 1016, 122, 122], 'edge'],
  ['scripture-title', 'text', 'serif row title Matthew 5:33–37', [185, 1028, 320, 52], 'dark'],
  ['scripture-line', 'text', 'sans line Scripture today · six more this week in secondary ink', [185, 1080, 440, 42], 'dark'],
  ['scripture-arrow', 'control', 'thin right arrow', [785, 1057, 45, 40], 'dark'],
  ['rule-scripture', 'chrome', 'soft hairline between rows', [37, 1152, 790, 4], 'asis'],
  ['forge-medallion', 'chrome', 'round medallion ground with a gold anvil pictogram (icon-sized)', [36, 1176, 124, 124], 'edge'],
  ['forge-title', 'text', 'serif row title Forge and Restoration', [185, 1190, 430, 52], 'dark'],
  ['forge-line', 'text', 'sans line Exercise guides · 18 movements this week in secondary ink', [185, 1242, 510, 42], 'dark'],
  ['forge-arrow', 'control', 'thin right arrow', [785, 1218, 45, 40], 'dark'],
  ['rule-forge', 'chrome', 'hairline closing the rows', [37, 1321, 790, 4], 'asis'],
  ['nav-bar', 'chrome', 'the app-wide five-tab bar (Keep, Road, Forge, Journal, Field Manual selected), inherited from DESIGN.md at 76px; the comp redraws it about 9px short', [0, 1700, 864, 172], 'asis'],
];
const tight = ([x, y, w, h], mode) => {
  if (mode === 'asis') return [x, y, w, h];
  const ops = mode === 'edge'
    ? ['-fuzz', '4%']
    : ['-colorspace', 'gray', ...(mode === 'dark' ? ['-negate'] : []), '-threshold', mode === 'dark' ? '45%' : '55%'];
  const g = execFileSync('magick', [COMP, '-crop', `${w}x${h}+${x}+${y}`, '+repage', ...ops, '-format', '%@', 'info:']).toString().trim();
  const m = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(g);
  if (!m) throw new Error(`no ink for box ${[x, y, w, h]}: ${g}`);
  return [x + +m[3], y + +m[4], +m[1], +m[2]];
};
const f = (v, d) => Math.round((v / d) * 10000) / 10000;
const regions = R.map(([id, kind, note, box, mode]) => {
  const t = tight(box, mode), P = mode === 'asis' ? 0 : 4;
  const x = Math.max(0, t[0] - P), y = Math.max(0, t[1] - P), w = Math.min(W - x, t[2] + 2 * P), h = Math.min(H - y, t[3] + 2 * P);
  console.log(id.padEnd(22), kind.padEnd(8), `${x},${y} ${w}x${h}`);
  return { id, kind, note, box: { x: f(x, W), y: f(y, H), w: f(w, W), h: f(h, H) }, snap: false };
});
writeFileSync('regions.json', JSON.stringify({ regions, allowUncovered: true }, null, 2) + '\n');
