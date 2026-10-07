/**
 * Browser E2E — dashboard status donut (docs/07 § 2.4 / TESTCASES DASH-01, DASH-03).
 * Run: node e2e/dashboard-flow.mjs   (backend :8000 + vite :5173)
 * Evidence: screenshots in client/e2e/shots/
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(__dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });

const BASE = process.env.E2E_BASE || 'http://localhost:5173';

let browser, page;
let passed = 0;
let failed = 0;
const failures = [];

const ok = (name, cond, extra = '') => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name} ${extra}`);
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
const step = (title) => console.log(`\n${title}`);
const bodyText = () => page.evaluate(() => document.body.innerText);

const waitUntil = async (fn, timeout = 10000, interval = 200) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return true;
    await sleep(interval);
  }
  return false;
};

const clickButton = async (text) => {
  for (const handle of await page.$$('button')) {
    const label = (await handle.evaluate((el) => el.textContent)) || '';
    if (label.toLowerCase().includes(text.toLowerCase())) {
      await handle.click();
      return true;
    }
  }
  return false;
};

const typeInput = async (sel, value) => {
  await page.waitForSelector(sel, { timeout: 5000 });
  await page.focus(sel);
  await page.$eval(sel, (el) => el.select());
  await page.keyboard.press('Backspace');
  await page.type(sel, value);
};

const openProject = async (name) => {
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      a.textContent.includes('All projects'),
    );
    link?.click();
  });
  await waitUntil(async () => (await bodyText()).includes('projects you'), 8000);
  await page.evaluate((n) => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      a.textContent.includes(n),
    );
    link?.click();
  }, name);
  await waitUntil(async () => /Recent tasks/.test(await bodyText()), 8000);
};

try {
  browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();
  page.on('pageerror', (err) => console.log(`  [pageerror] ${err.message}`));

  step('Login');
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await typeInput('#identifier', 'maya');
  await typeInput('#password', 'DemoPass123!');
  await clickButton('log in');
  await waitUntil(async () => (await bodyText()).includes('Website Revamp'));
  ok('logged in', (await bodyText()).includes('Website Revamp'));

  step('DASH-01 — donut counts match the board (Website Revamp)');
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      a.textContent.includes('Website Revamp'),
    );
    link?.click();
  });
  await waitUntil(async () => /Recent tasks/.test(await bodyText()), 8000);
  const text = await bodyText();
  ok('Status breakdown card renders', text.includes('Status breakdown'));
  ok(
    'shows total task count',
    /9 tasks across the board/.test(text),
    text.match(/\d+ tasks? across the board/)?.[0],
  );
  // Legend rows: "To do 4 44%" etc.
  ok('To do = 4', /To do\s+4\s+44%/.test(text), JSON.stringify(text.match(/To do\s+\d+\s+\d+%/)));
  ok('In progress = 3', /In progress\s+3\s+33%/.test(text), JSON.stringify(text.match(/In progress\s+\d+\s+\d+%/)));
  ok('Done = 2', /Done\s+2\s+22%/.test(text), JSON.stringify(text.match(/Done\s+\d+\s+\d+%/)));
  const svgLabel = await page.$eval('svg[role="img"]', (el) => el.getAttribute('aria-label'));
  ok(
    'svg has accessible label',
    /4 To do, 3 In progress, 2 Done/.test(svgLabel ?? ''),
    String(svgLabel),
  );
  const segCount = await page.$$eval('svg[role="img"] circle', (els) => els.length);
  ok('ring + 3 segments drawn', segCount === 4, `circles: ${segCount}`);
  await shot('dashboard-01-donut');

  step('DASH-03 — empty project → zeroed chart, no NaN');
  // Create a throwaway project via the API (same-origin cookies), then open it.
  const created = await page.evaluate(async () => {
    const res = await fetch('/api/v1/projects', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Donut empty check ${Date.now()}`,
        description: 'temporary dashboard test',
      }),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, id: body?.data?._id };
  });
  ok('throwaway project created', created.status === 201 && Boolean(created.id), JSON.stringify(created));

  await page.goto(`${BASE}/projects/${created.id}`, { waitUntil: 'networkidle0' });
  await waitUntil(async () => /Recent tasks/.test(await bodyText()), 8000);
  const emptyText = await bodyText();
  ok('empty dashboard renders', /Recent tasks/.test(emptyText));
  ok('zeroed total copy', /No tasks yet/.test(emptyText), JSON.stringify(emptyText.match(/No tasks yet.{0,30}/)));
  ok('legend shows 0s', /To do\s+0\s+0%/.test(emptyText), JSON.stringify(emptyText.match(/To do\s+\d+\s+\d+%/)));
  ok('no NaN anywhere', !/NaN/.test(emptyText), JSON.stringify(emptyText.match(/.{0,20}NaN.{0,20}/)));
  ok('progress is 0% (no NaN)', /0%/.test(emptyText) && !/NaN/.test(emptyText));
  const emptySeg = await page.$$eval('svg[role="img"] circle', (els) => els.length);
  ok('only the base ring drawn (no segments)', emptySeg === 1, `circles: ${emptySeg}`);
  await shot('dashboard-02-empty');

  step('Cleanup — delete the throwaway project');
  const deleted = await page.evaluate(
    async (id) => {
      const res = await fetch(`/api/v1/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return res.status;
    },
    created.id,
  );
  ok('throwaway project deleted', deleted === 200 || deleted === 204, String(deleted));
} catch (err) {
  failed++;
  failures.push(`FATAL: ${err.message}`);
  console.log(`\n  ✗ FATAL: ${err.message}`);
} finally {
  if (browser) await browser.close();
}

console.log(`\n  RESULT: ${passed} passed, ${failed} failed`);
if (failures.length) console.log(`  FAILURES:\n   - ${failures.join('\n   - ')}`);
process.exit(failed ? 1 : 0);
