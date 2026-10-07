/**
 * Browser E2E — ConnectionBanner (docs/07 § 2.3 / TESTCASES NF-06).
 * Run: node e2e/banner-flow.mjs   (vite :5173; backend :8000 for the probe)
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

const BANNER = '[aria-label="Connection status"]';

const bannerText = async () => {
  const handle = await page.$(BANNER);
  if (!handle) return null;
  return handle.evaluate((el) => el.innerText);
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
  ok('no banner while healthy', (await bannerText()) === null);

  step('Go offline → banner appears');
  await page.setOfflineMode(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await waitUntil(async () => (await bannerText()) !== null, 5000);
  const offlineMsg = await bannerText();
  ok('offline banner shown', Boolean(offlineMsg), String(offlineMsg));
  ok(
    'offline copy is correct',
    /offline/i.test(offlineMsg ?? ''),
    String(offlineMsg),
  );
  ok('no Retry button while offline', !(await page.$(`${BANNER} button`)));
  await shot('banner-01-offline');

  step('Back online → auto-probe clears the banner');
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.setOfflineMode(false);
  await waitUntil(async () => (await bannerText()) === null, 10000, 300);
  ok('banner cleared after recovery', (await bannerText()) === null);

  step('API-down path: abort fetches → banner shows with Retry');
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      req.abort('failed').catch(() => {});
    } else {
      req.continue().catch(() => {});
    }
  });
  // Trigger a real API call: open the project detail (we are on /projects,
  // so clicking the card causes a fetch that now fails).
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      a.textContent.includes('Website Revamp'),
    );
    link?.click();
  });
  await waitUntil(async () => (await bannerText()) !== null, 8000);
  const apiMsg = await bannerText();
  ok('api-down banner shown', Boolean(apiMsg), String(apiMsg));
  ok(
    'api-down copy mentions server',
    /server/i.test(apiMsg ?? ''),
    String(apiMsg),
  );
  ok('Retry button offered', Boolean(await page.$(`${BANNER} button`)));
  await shot('banner-02-api-down');

  step('Stop aborting → Retry clears the banner');
  await page.setRequestInterception(false);
  await clickButton('Retry');
  await waitUntil(async () => (await bannerText()) === null, 8000, 300);
  ok('banner cleared after Retry', (await bannerText()) === null);
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
