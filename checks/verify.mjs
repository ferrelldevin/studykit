// Pre-publish checks from CONVENTIONS.md section 8, run against a local copy
// served the way GitHub Pages serves it (under /studykit/, 404.html on a miss).
//   1. every URL serves, and an address that should not exist returns 404
//   2. no page scrolls sideways at 320, 390, 768 or 1280px
//   3. Japanese text is marked lang="ja" and carries no Latin letters (no romaji)
//   4. no axe-core WCAG 2.2 AA violations on the sheets, front page and request page
//   5. in print view, the answers hidden behind tap-to-reveal are on the page
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = '/studykit/';
const PAGES = ['', 'request/', 'japn301/say-it-first/', 'japn309/kanji-quiz-prep/', 'japn309/writing-the-thirty-two/'];
const ALSO_SERVED = ['kurikaeshi/', 'kurikaeshi/for-your-class.html'];
const SHEETS = PAGES.filter(p => p.startsWith('japn'));
const WIDTHS = [320, 390, 768, 1280];
const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = url.startsWith(BASE) ? path.join(ROOT, url.slice(BASE.length)) : null;
  if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file || !file.startsWith(ROOT) || !fs.existsSync(file) || file.includes(`${path.sep}.`)) {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    return res.end(fs.readFileSync(path.join(ROOT, '404.html')));
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const failures = [];
const fail = (page, msg) => failures.push(`${page || '(front page)'}: ${msg}`);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext();
// Web fonts and other outside requests are blocked so results don't depend on the network.
await context.route(u => !u.href.startsWith(origin), r => r.abort());

for (const p of [...PAGES, ...ALSO_SERVED]) {
  const res = await fetch(origin + BASE + p);
  if (res.status !== 200) fail(p, `served ${res.status}, expected 200`);
}
for (const p of ['does-not-exist/', 'japn309/missing/']) {
  const res = await fetch(origin + BASE + p);
  if (res.status !== 404) fail(p, `served ${res.status}, expected 404`);
}

for (const p of PAGES) {
  const page = await context.newPage();
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(origin + BASE + p);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 0) fail(p, `scrolls sideways by ${over}px at ${w}px wide`);
  }

  const ja = await page.evaluate(() => {
    const JA = /[぀-ヿ㐀-鿿]/;
    const unmarked = new Set(), latin = new Set();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const lang = n.parentElement.closest('[lang]')?.getAttribute('lang');
      if (JA.test(n.data) && lang !== 'ja') unmarked.add(n.data.trim().slice(0, 30));
      if (lang === 'ja' && /[A-Za-z]/.test(n.data)) latin.add(n.data.trim().slice(0, 30));
    }
    return { unmarked: [...unmarked], latin: [...latin] };
  });
  ja.unmarked.forEach(s => fail(p, `Japanese not marked lang="ja": "${s}"`));
  ja.latin.forEach(s => fail(p, `Latin letters inside Japanese text: "${s}"`));

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  for (const v of axe.violations) fail(p, `axe ${v.id} (${v.impact}): ${v.nodes.length} element(s), e.g. ${v.nodes[0].target.join(' ')}`);

  if (SHEETS.includes(p)) {
    await page.emulateMedia({ media: 'print' });
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('details > :not(summary)')].filter(el => !el.checkVisibility()).length);
    if (hidden) fail(p, `${hidden} answer(s) behind tap-to-reveal are missing from print`);
    await page.emulateMedia({ media: 'screen' });
  }
  await page.close();
}

// Kurikaeshi's pages are an app, not sheets, so the romaji rule doesn't apply to them, but the layout and axe rules do.
for (const p of ALSO_SERVED) {
  const page = await context.newPage();
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(origin + BASE + p);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 0) fail(p, `scrolls sideways by ${over}px at ${w}px wide`);
  }
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  for (const v of axe.violations) fail(p, `axe ${v.id} (${v.impact}): ${v.nodes.length} element(s), e.g. ${v.nodes[0].target.join(' ')}`);
  await page.close();
}

await browser.close();
server.close();
if (failures.length) {
  console.error(`${failures.length} problem(s):\n- ` + failures.join('\n- '));
  process.exit(1);
}
console.log(`All checks passed: ${PAGES.length + ALSO_SERVED.length} URLs, 2 missing URLs 404, ${PAGES.length + ALSO_SERVED.length} pages x ${WIDTHS.length} widths, lang, axe, print.`);
