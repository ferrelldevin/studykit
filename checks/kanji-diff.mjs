// Diffs every kanji reading and stroke count on the JAPN 309 sheets against the
// source files themselves, so "checked against KANJIDIC2" stays true:
//   KANJIDIC2  https://www.edrdg.org/kanjidic/kanjidic2.xml.gz  (readings, stroke counts)
//   KanjiVG    https://github.com/KanjiVG/kanjivg/releases      (one <path> per stroke)
// Usage: node checks/kanji-diff.mjs <kanjidic2.xml> <kanjivg/kanji directory>
import fs from 'node:fs';
import path from 'node:path';

const [xmlPath, kvgDir] = process.argv.slice(2);
if (!xmlPath || !kvgDir) {
  console.error('usage: node checks/kanji-diff.mjs <kanjidic2.xml> <kanjivg/kanji>');
  process.exit(2);
}
const ROOT = path.resolve(import.meta.dirname, '..');
const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const norm = s => toHira(s.replace(/[.\-]/g, '').trim());
const text = html => html.replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');

const dict = new Map();
for (const [, block] of fs.readFileSync(xmlPath, 'utf8').matchAll(/<character>([\s\S]*?)<\/character>/g)) {
  const literal = block.match(/<literal>(.*?)<\/literal>/)[1];
  const strokes = Number(block.match(/<stroke_count>(\d+)<\/stroke_count>/)?.[1]);
  const read = type => [...block.matchAll(new RegExp(`<reading r_type="${type}">(.*?)</reading>`, 'g'))].map(m => norm(m[1]));
  dict.set(literal, { strokes, on: new Set(read('ja_on')), kun: new Set(read('ja_kun')) });
}
const kvgStrokes = c => {
  const f = path.join(kvgDir, c.codePointAt(0).toString(16).padStart(5, '0') + '.svg');
  return fs.existsSync(f) ? (fs.readFileSync(f, 'utf8').match(/<path /g) || []).length : null;
};

const problems = [];
let checked = 0;
const entry = c => dict.get(c) || (problems.push(`${c}: not in KANJIDIC2`), { on: new Set(), kun: new Set() });

// Kanji Quiz Prep: "meaning — kun a・b · on c・d" under each character
const quiz = fs.readFileSync(path.join(ROOT, 'japn309/kanji-quiz-prep/index.html'), 'utf8');
for (const [, ch, body] of quiz.matchAll(/<span class="big">(?:<span lang="ja">)?(.)(?:<\/span>)?<\/span><\/summary>\s*<p>([\s\S]*?)<\/p>/g)) {
  const line = text(body), e = entry(ch);
  for (const [label, set] of [['kun', e.kun], ['on', e.on]]) {
    const m = line.match(new RegExp(`(?:^|· |— )${label} ([^·]+)`));
    for (const r of m ? m[1].split('・').map(s => s.trim().replace(/^-/, '')) : []) {
      checked++;
      if (!set.has(r)) problems.push(`Kanji Quiz Prep ${ch}: ${label} reading ${r} is not in KANJIDIC2 (${[...set].join('・')})`);
    }
  }
}

// Writing the Thirty-Two: one reading and a stroke count per grid cell
const w32 = fs.readFileSync(path.join(ROOT, 'japn309/writing-the-thirty-two/index.html'), 'utf8');
for (const [, ch, rd, st] of w32.matchAll(/<span class="ch"><ruby[^>]*>(.)<rt>(.*?)<\/rt><\/ruby><\/span><span class="en">.*?<\/span><span class="st">(\d+)<\/span>/g)) {
  const e = entry(ch), all = [...e.on, ...e.kun];
  checked += 3;
  if (Number(st) !== e.strokes) problems.push(`Writing the Thirty-Two ${ch}: ${st} strokes, KANJIDIC2 says ${e.strokes}`);
  if (Number(st) !== kvgStrokes(ch)) problems.push(`Writing the Thirty-Two ${ch}: ${st} strokes, KanjiVG draws ${kvgStrokes(ch)}`);
  if (!all.some(r => r.startsWith(rd))) problems.push(`Writing the Thirty-Two ${ch}: reading ${rd} is not in KANJIDIC2 (${all.join('・')})`);
}

if (checked < 250) problems.push(`only ${checked} values found; the sheet markup probably changed and this script needs updating`);
if (problems.length) {
  console.error(`${problems.length} mismatch(es) in ${checked} values:\n- ` + problems.join('\n- '));
  process.exit(1);
}
console.log(`${checked} readings and stroke counts match KANJIDIC2 and KanjiVG.`);
