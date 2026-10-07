/**
 * Browser E2E — ⌘K command palette (docs/07 § 2.2).
 * Run: node e2e/palette-flow.mjs   (vite :5173, mock mode or live backend)
 * Credentials: maya / DemoPass123! (admin on "Website Revamp")
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

const paletteOpen = async () => (await page.$('input[aria-label="Search commands"]')) !== null;

const openPalette = async () => {
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyK');
  await page.keyboard.up('Control');
  await waitUntil(paletteOpen, 4000);
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

  step('Open project (project-scoped commands only appear there)');
  const projectHref = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      a.textContent.includes('Website Revamp'),
    );
    return link?.getAttribute('href') ?? null;
  });
  await page.evaluate((h) => {
    [...document.querySelectorAll('a')]
      .find((a) => a.getAttribute('href') === h)
      ?.click();
  }, projectHref);
  await waitUntil(async () => page.url().endsWith(projectHref), 8000);
  ok('inside project', page.url().endsWith(projectHref), page.url());

  step('Ctrl+K opens the palette');
  await openPalette();
  ok('palette opens via Ctrl+K', await paletteOpen());
  await shot('palette-01-open');

  step('Filter + keyboard navigation');
  // 'kanban' only matches the Board command ('board' also hits 'dashboard').
  await page.type('input[aria-label="Search commands"]', 'kanban');
  await sleep(200);
  let options = await page.$$eval('[role="option"]', (els) =>
    els.map((el) => el.innerText),
  );
  ok('filter narrows results', options.length > 0 && options.length < 7, JSON.stringify(options));
  ok('board command visible', options.some((o) => /Go to Board/i.test(o)), JSON.stringify(options));
  await shot('palette-02-filter');

  step('Enter runs the first match → navigates to Board');
  await page.keyboard.press('Enter');
  await waitUntil(async () => page.url().endsWith('/board'), 5000);
  ok('navigated to board', page.url().endsWith('/board'), page.url());
  ok('palette closed after run', !(await paletteOpen()));

  step('No-match state');
  await openPalette();
  await page.type('input[aria-label="Search commands"]', 'zzzzz');
  await sleep(200);
  ok('empty state shown', (await bodyText()).includes('No commands match'));

  step('Esc closes without navigating');
  await page.keyboard.press('Escape');
  await sleep(300);
  ok('Esc closed palette', !(await paletteOpen()));
  ok('still on board', page.url().endsWith('/board'));

  step('Project create intent → task modal opens on the board');
  await openPalette();
  await page.type('input[aria-label="Search commands"]', 'create task');
  await sleep(200);
  await page.keyboard.press('Enter');
  await waitUntil(async () => page.url().endsWith('/board'), 5000);
  await waitUntil(async () => (await bodyText()).includes('New task') || (await page.$('input[placeholder*="title" i], #task-title')) !== null, 5000);
  const modalVisible = (await page.$('dialog[open]')) !== null;
  ok('task create modal opened from palette', modalVisible);
  await shot('palette-03-create-task');

  step('Close modal; theme command toggles dark class');
  await page.keyboard.press('Escape');
  await sleep(300);
  const darkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await openPalette();
  await page.type('input[aria-label="Search commands"]', 'theme');
  await sleep(200);
  await page.keyboard.press('Enter');
  await sleep(400);
  const darkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  ok('theme command toggled the dark class', darkBefore !== darkAfter, `${darkBefore} → ${darkAfter}`);
  // toggle back
  await openPalette();
  await page.type('input[aria-label="Search commands"]', 'theme');
  await sleep(200);
  await page.keyboard.press('Enter');
  await sleep(300);
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
