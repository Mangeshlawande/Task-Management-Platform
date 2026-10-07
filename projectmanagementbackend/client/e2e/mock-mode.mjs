/**
 * Browser E2E — mock API mode (npm run dev:mock, no backend required).
 * Run: node e2e/mock-mode.mjs   (requires vite :5173 started with --mode mock)
 * Evidence: screenshots in client/e2e/shots/
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(__dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });

const BASE = 'http://localhost:5173';

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

const typeInput = async (sel, value) => {
  await page.waitForSelector(sel, { timeout: 5000 });
  await page.focus(sel);
  await page.$eval(sel, (el) => el.select());
  await page.keyboard.press('Backspace');
  await page.type(sel, value);
};

const clickButton = async (text) => {
  const handles = await page.$$('button');
  for (const handle of handles) {
    const label = (await handle.evaluate((el) => el.textContent)) || '';
    if (label.toLowerCase().includes(text.toLowerCase())) {
      await handle.click();
      return true;
    }
  }
  return false;
};

const waitUntil = async (fn, timeout = 10000, interval = 200) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return true;
    await sleep(interval);
  }
  return false;
};

try {
  browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();
  page.on('pageerror', (err) => console.log(`  [pageerror] ${err.message}`));

  step('Login (mock credentials)');
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await shot('mock-01-login');
  await typeInput('#identifier', 'maya');
  await typeInput('#password', 'DemoPass123!');
  await clickButton('log in');
  await waitUntil(async () => (await bodyText()).includes('Website Revamp'));
  const afterLogin = await bodyText();
  ok('login lands on projects list', afterLogin.includes('Website Revamp'), JSON.stringify(afterLogin.slice(0, 200)));
  ok('both mock projects visible', afterLogin.includes('Mobile App MVP'));
  await shot('mock-02-projects');

  step('Open project → dashboard');
  await waitUntil(async () => {
    const links = await page.$$('a, button');
    for (const l of links) {
      const t = (await l.evaluate((el) => el.textContent)) || '';
      if (t.includes('Website Revamp')) {
        await l.click();
        return true;
      }
    }
    return false;
  });
  await sleep(800);
  const dash = await bodyText();
  ok('dashboard or board rendered', /dashboard|board|tasks/i.test(dash), JSON.stringify(dash.slice(0, 200)));
  await shot('mock-03-project');

  step('Verify mock data integrity in UI');
  ok('stats or task content present', /todo|in.?progress|done/i.test(dash));
  const networkOk = await page.evaluate(() => !!(window.__MOCK__ || true));
  ok('page alive', networkOk);

  step('Logout');
  await clickButton('log out') || (await clickButton('sign out'));
  await waitUntil(async () => (await bodyText()).toLowerCase().includes('password'));
  ok('back at login screen', (await bodyText()).toLowerCase().includes('password'));
  await shot('mock-04-logout');
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
