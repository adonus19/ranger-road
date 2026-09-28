// Tighten generous search boxes to the ink they contain, then emit regions.json (fractions of the comp).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const COMP = '../mocks/keep-comp-c.png', W = 864, H = 1872;
// [id, kind, note, searchBox[x,y,w,h], mode]  mode: 'light' ink on dark, 'dark' ink on light, 'edge' container edge vs ground, 'asis' keep box
const R = [
  ['forest-band', 'plate', 'painted misty dawn forest: dark sky, layered ridgelines, pine silhouettes at both edges, pale low sun right of centre, fading to flat deep-forest green behind the chapter text', [0,0,864,482], 'asis'],
  ['brand-mark', 'chrome', 'small gold three-pine mark', [30,25,100,100], 'light'],
  ['app-title', 'text', "serif app title The Ranger's Road in cream", [125,35,430,85], 'light'],
  ['chapter-kicker', 'text', 'spaced caps CHAPTER I · WEEKS 1–4 in mist', [40,255,300,35], 'light'],
  ['chapter-title', 'text', 'large serif The Muster in cream', [40,288,420,75], 'light'],
  ['chapter-theme', 'text', 'serif Answer the call. in soft gold', [40,362,260,45], 'light'],
  ['count-rule-1', 'chrome', 'thin vertical hairline between title and counts', [472,296,3,122], 'asis'],
  ['day-number', 'text', 'serif numeral 1 in cream', [495,290,70,70], 'light'],
  ['day-label', 'text', 'label Campaign day in cream sans', [495,360,170,40], 'light'],
  ['count-rule-2', 'chrome', 'thin vertical hairline between the two counts', [674,296,3,125], 'asis'],
  ['trial-number', 'text', 'serif numeral 27 in cream', [700,290,100,70], 'light'],
  ['trial-label', 'text', 'label Days until Gate Trial on two lines in cream sans', [700,360,140,70], 'light'],
  ['target-note', 'text', 'small mist line Gate Trial target: end of Week 4. You can take it when ready.', [40,432,600,40], 'light'],
  ['readiness-strip', 'control', 'full-width rounded strip on pale parchment tint that opens the readiness check', [20,495,826,190], 'edge'],
  ['readiness-icon', 'chrome', 'round parchment medallion with gold heart-pulse line icon', [50,522,140,140], 'edge'],
  ['readiness-status', 'text', 'bold serif Not checked today', [200,538,390,60], 'dark'],
  ['readiness-help', 'text', 'sans Check sleep, energy, and pain before training.', [200,598,570,45], 'dark'],
  ['readiness-chevron', 'control', 'chevron at right edge of the strip', [780,565,40,55], 'dark'],
  ['orders-heading', 'text', "large serif section heading Today's Orders", [30,705,450,85], 'dark'],
  ['main-card', 'chrome', 'featured main-order card on lighter paper, fine border, thin gold top edge', [25,795,815,295], 'edge'],
  ['main-icon', 'chrome', 'round parchment medallion with dark walking-footprints icon', [60,842,160,160], 'edge'],
  ['main-kicker', 'text', 'spaced caps MAIN ORDER in stone', [240,850,200,35], 'dark'],
  ['main-title', 'text', 'serif Short conditioning or restoration on two lines', [240,885,450,110], 'dark'],
  ['main-guidance', 'text', 'sans Check readiness before training. in stone', [240,1000,440,45], 'dark'],
  ['morning-tile', 'chrome', 'half-width tile with fine border', [28,1094,402,290], 'edge'],
  ['morning-icon', 'chrome', 'round parchment medallion with gold rising-sun icon', [68,1120,135,135], 'edge'],
  ['morning-kicker', 'text', 'spaced caps DAILY WATCH in stone', [70,1255,190,35], 'dark'],
  ['morning-title', 'text', 'serif Morning Watch', [70,1288,290,55], 'dark'],
  ['evening-tile', 'chrome', 'half-width tile with fine border', [434,1094,402,290], 'edge'],
  ['evening-icon', 'chrome', 'round parchment medallion with dark crescent-moon icon', [462,1120,130,135], 'edge'],
  ['evening-kicker', 'text', 'spaced caps DAILY WATCH in stone', [468,1255,190,35], 'dark'],
  ['evening-title', 'text', 'serif Evening Watch', [468,1288,290,55], 'dark'],
  ['hearth-rule-top', 'chrome', 'hairline rule above the Hearth row', [37,1407,790,2], 'asis'],
  ['hearth-icon', 'chrome', 'small gold fireplace icon with flame', [58,1438,95,90], 'dark'],
  ['hearth-divider', 'chrome', 'short vertical hairline between icon and text', [189,1435,2,106], 'asis'],
  ['hearth-kicker', 'text', 'spaced caps HEARTH MISSION in stone', [220,1438,240,32], 'dark'],
  ['hearth-text', 'text', 'sans Ask your spouse what would genuinely help this week. on two lines in stone-ink', [220,1470,500,80], 'dark'],
  ['hearth-rule-bottom', 'chrome', 'hairline rule below the Hearth row', [37,1565,790,2], 'asis'],
  ['mission-cta', 'control', "full-width pine rounded button Begin Today's Mission with right arrow", [25,1582,815,110], 'edge'],
  ['cta-label', 'text', "Begin Today's Mission and arrow in cream sans", [230,1605,410,60], 'light'],
  ['nav-bar', 'chrome', 'bottom navigation bar on paper with hairline top rule', [0,1705,864,167], 'asis'],
  ['nav-keep', 'control', 'selected Keep tab: filled pine house icon, label, short gold underline', [30,1725,120,120], 'dark'],
  ['nav-road', 'control', 'Road tab: gray winding-road icon and label', [215,1725,95,105], 'dark'],
  ['nav-forge', 'control', 'Forge tab: gray anvil icon and label', [385,1725,95,105], 'dark'],
  ['nav-journal', 'control', 'Journal tab: open-book line icon and label', [550,1725,105,105], 'dark'],
  ['nav-field-manual', 'control', 'Field Manual tab: folded-map line icon and label', [695,1725,150,105], 'dark'],
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
  const t = tight(box, mode), P = id === "forest-band" || id === "nav-bar" ? 0 : 4;
  const x = Math.max(0, t[0] - P), y = Math.max(0, t[1] - P), w = Math.min(W - x, t[2] + 2 * P), h = Math.min(H - y, t[3] + 2 * P);
  console.log(id.padEnd(20), kind.padEnd(8), `${x},${y} ${w}x${h}`);
  return { id, kind, note, box: { x: f(x, W), y: f(y, H), w: f(w, W), h: f(h, H) }, snap: false, ...(id === 'forest-band' ? { bleed: true } : {}) };
});
writeFileSync('regions.json', JSON.stringify({ regions }, null, 2) + '\n');
