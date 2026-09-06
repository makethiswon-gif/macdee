// User-authorized copy simplification. Compare factual data separately from editable prose.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..');
const out = process.env.QA_DIR || 'C:/클로드/renewal-copy-qa';
const origin = process.env.BASE_URL || 'http://localhost:3101';
const beforeCommit = 'ed81b89';
const routes = ['', '/naver-ads', '/lawfirm-seo', '/geo', '/lawfirm-blog', '/lawfirm-website', '/conversion', '/lawfirm-marketing', '/about', '/work', '/contact', '/diagnose', '/magazine'];
const baseline = process.argv.includes('--baseline');
fs.mkdirSync(out, { recursive: true });
function readData(file, old = false) {
  const source = old ? execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'show', `${beforeCommit}:${file}`], { cwd: root, encoding: 'utf8' }) : fs.readFileSync(path.join(root, file), 'utf8');
  const sandbox = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, sandbox);
  return JSON.parse(JSON.stringify(sandbox.exports));
}
function verifyFacts() {
  const old = readData('data/renewal/site.ts', true), now = readData('data/renewal/site.ts');
  const keys = ['COMPANY', 'TEAM', 'FOUNDER', 'PROOF_STATS', 'LAW_FIRM_PARTNERS', 'CORPORATE_CLIENTS', 'CHANNEL_LEDGER', 'LEDGER_FOOTNOTE'];
  for (const key of keys) assert.deepEqual(now[key], old[key], key);
  const priceFields = plans => plans.map(({ key, en, price, priceNote, includesLabel, featured, badge, includes }) => ({ key, en, price, priceNote, includesLabel, featured, badge, inclusionCount: includes.length }));
  assert.deepEqual(priceFields(now.PLANS), priceFields(old.PLANS), 'Prices, plan inheritance, scope count');
  const serviceFields = list => list.map(({ no, en, href, items }) => ({ no, en, href, badges: items.map(i => i.badge || null) }));
  assert.deepEqual(serviceFields(now.SERVICES), serviceFields(old.SERVICES), 'All service items and conditional badges retained');
  const oldServices = readData('data/renewal/services.ts', true), newServices = readData('data/renewal/services.ts');
  assert.deepEqual(newServices.SERVICES.map(s => s.faq), oldServices.SERVICES.map(s => s.faq), 'FAQ conditions preserved');
  const protectedFiles = ['data/renewal/cases.ts', 'app/renewal/flags.ts', 'app/layout.tsx', 'app/renewal/magazine/[slug]/page.tsx'];
  const diff = execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'diff', beforeCommit, '--', ...protectedFiles], { cwd: root, encoding: 'utf8' });
  assert.equal(diff, '', 'Cases, indexing, verification metadata, published articles unchanged');
  return { immutableExports: keys, pricesAndScopeCount: true, serviceConditions: true, faqConditions: true, protectedFiles };
}
(async () => {
  const facts = verifyFacts();
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const result = [];
  for (const suffix of routes) {
    const route = '/renewal' + suffix;
    const res = await page.goto(origin + route, { waitUntil: 'networkidle' });
    assert.equal(res.status(), 200, route);
    result.push({ route, ...await page.evaluate(() => {
      const main = document.querySelector('.mt-root > main');
      const chars = text => text.replace(/\s+/g, '').length;
      const clone = main.cloneNode(true);
      clone.querySelectorAll('script,style,[aria-hidden="true"],svg,canvas').forEach(e => e.remove());
      // Whole DOM count, including closed details. Not a reading-time or viewport metric.
      return { totalCharacters: chars(clone.textContent), headings: [...main.querySelectorAll('h1,h2')].map(h => h.textContent.replace(/\s+/g, ' ').trim()), links: [...document.querySelectorAll('.mt-root a[href]')].map(a => a.getAttribute('href')), canonical: document.querySelector('link[rel=canonical]').href };
    }) });
  }
  await browser.close();
  const file = path.join(out, baseline ? 'before-counts.json' : 'after-counts.json');
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
  if (baseline) { console.log('Baseline captured:', result.length); return; }
  const before = JSON.parse(fs.readFileSync(path.join(out, 'before-counts.json'), 'utf8'));
  const comparison = result.map(now => {
    const old = before.find(p => p.route === now.route);
    assert.equal(now.canonical, old.canonical, now.route + ' canonical');
    const removed = [...new Set(old.links)].filter(h => !now.links.includes(h));
    assert.deepEqual(removed, [], now.route + ' removed links');
    return { route: now.route, totalBefore: old.totalCharacters, totalAfter: now.totalCharacters, domCharacterReductionPercent: Math.round((1 - now.totalCharacters / old.totalCharacters) * 100) };
  });
  fs.writeFileSync(path.join(out, 'copy-report.json'), JSON.stringify({ facts, comparison }, null, 2));
  console.log(JSON.stringify({ facts, comparison }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
