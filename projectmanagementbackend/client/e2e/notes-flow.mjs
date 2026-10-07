/**
 * Browser E2E — P4 notes flow (docs/05 P4 / TESTCASES NOTE-01..05).
 * Run: node e2e/notes-flow.mjs
 *   Mock mode:      vite already running via `npm run dev:mock` (no backend)
 *   Live mode:      backend :8000 + `npm run dev` on :5173
 *   Credentials:    maya / DemoPass123! (seed + mock agree; admin on
 *                   "Website Revamp", plain member on "Mobile App MVP")
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

/** Client-side navigation (a full page.goto would wipe the mock session). */
const clickHref = (href) =>
  page.evaluate((h) => {
    const link = [...document.querySelectorAll('a')].find(
      (a) => a.getAttribute('href') === h,
    );
    link?.click();
  }, href);

/** Note cards live in the grid `ul` after the header. */
const noteCards = () =>
  page.$$eval('ul.grid > li', (els) =>
    els.map((el) => ({
      text: el.innerText,
      pinned: /Pinned/i.test(el.innerText),
    })),
  );

const NOTE_TEXT = `E2E note ${Date.now()} — deployment window Sunday 02:00 UTC.`;

try {
  browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();
  page.on('pageerror', (err) => console.log(`  [pageerror] ${err.message}`));

  step('Login as maya');
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await typeInput('#identifier', 'maya');
  await typeInput('#password', 'DemoPass123!');
  await clickButton('log in');
  await waitUntil(async () => (await bodyText()).includes('Website Revamp'));
  ok('logged in, projects visible', (await bodyText()).includes('Website Revamp'));
  await shot('notes-01-projects');

  step('Open Website Revamp → Notes tab');
  const projectHref = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      a.textContent.includes('Website Revamp'),
    );
    return link?.getAttribute('href') ?? null;
  });
  ok('project card links to detail', Boolean(projectHref), String(projectHref));
  await clickHref(projectHref);
  // The tab nav renders only after the detail fetch — wait for the anchor.
  await waitUntil(
    async () =>
      page.url().endsWith(projectHref) &&
      (await page.$(`a[href="${projectHref}/notes"]`)) !== null,
    8000,
  );
  await clickHref(`${projectHref}/notes`);
  await waitUntil(async () => page.url().endsWith('/notes') && /note(s)? in this project/.test(await bodyText()), 8000);
  let text = await bodyText();
  if (!/note(s)? in this project/.test(text)) {
    console.log(`  [debug] url=${page.url()} text=${JSON.stringify(text.slice(0, 400))}`);
  }
  ok('notes grid renders', /note(s)? in this project/.test(text));
  await shot('notes-02-grid');

  step('NOTE-01 — grid + pagination, pinned first');
  let cards = await noteCards();
  ok('page 1 shows 12 cards', cards.length === 12, `got ${cards.length}`);
  ok('pinned notes sort first', cards[0].pinned && cards[1].pinned, JSON.stringify(cards.slice(0, 3).map((c) => c.pinned)));
  ok('pagination footer shows page 1 of 2', /Page 1 of 2/.test(await bodyText()));
  ok('pinned badge rendered', cards.some((c) => c.pinned));

  await clickButton('next');
  // Wait for the LOADED page-2 state: there is one intermediate render where
  // the footer already says "Page 2" but the grid still holds page-1 rows.
  await waitUntil(
    async () =>
      /Page 2 of 2/.test(await bodyText()) && (await noteCards()).length === 3,
    8000,
  );
  cards = await noteCards();
  ok('page 2 shows remaining 3 cards', cards.length === 3, `got ${cards.length}`);
  await shot('notes-03-page2');

  await clickButton('previous');
  await waitUntil(
    async () =>
      /Page 1 of 2/.test(await bodyText()) && (await noteCards()).length === 12,
    8000,
  );
  ok('back to page 1', (await noteCards()).length === 12);

  step('NOTE-02 — create note (admin)');
  await clickButton('new note');
  await page.waitForSelector('#note-content', { timeout: 5000 });
  await typeInput('#note-content', NOTE_TEXT);
  await clickButton('create note');
  await waitUntil(async () => !(await bodyText()).includes('Create note…'), 5000);
  await waitUntil(async () => (await bodyText()).includes('Note added'), 5000);
  ok('create toast shown', (await bodyText()).includes('Note added'));
  await waitUntil(async () => (await bodyText()).includes(E2E_NOTE_SHORT()), 8000);
  ok('new note appears on page 1', (await bodyText()).includes(E2E_NOTE_SHORT()));
  ok('total bumped to 16', /16 notes/.test(await bodyText()), (await bodyText()).match(/\d+ notes/)?.[0]);
  await shot('notes-04-created');

  step('NOTE-03 — pin toggle (optimistic)');
  const createdIdx = (await noteCards()).findIndex((c) => c.text.includes(E2E_NOTE_SHORT()));
  ok('found created card', createdIdx >= 0);
  // pin via the aria-label of the first pin button inside the created card
  const pinned = await page.evaluate((idx) => {
    const card = document.querySelectorAll('ul.grid > li')[idx];
    const btn = card?.querySelector('button[aria-label="Pin this note"]');
    btn?.click();
    return Boolean(btn);
  }, createdIdx);
  ok('pin button present on own note', pinned);
  await waitUntil(async () => {
    const c = await noteCards();
    return c[0]?.pinned === true && c[0].text.includes(E2E_NOTE_SHORT());
  }, 8000);
  cards = await noteCards();
  ok('pinned note re-sorted to top with badge', cards[0]?.pinned && cards[0]?.text.includes(E2E_NOTE_SHORT()));
  await shot('notes-05-pinned');

  step('NOTE-02 — edit own note');
  await page.evaluate(() => {
    const first = document.querySelectorAll('ul.grid > li')[0];
    first?.querySelector('button[aria-label="Edit this note"]')?.click();
  });
  await page.waitForSelector('#note-content', { timeout: 5000 });
  const prefilled = await page.$eval('#note-content', (el) => el.value);
  ok('editor prefilled with note content', prefilled.includes(E2E_NOTE_SHORT()));
  await typeInput('#note-content', `${NOTE_TEXT} (edited)`);
  await clickButton('save changes');
  await waitUntil(async () => (await bodyText()).includes('Note updated'), 5000);
  ok('edit toast shown', (await bodyText()).includes('Note updated'));
  ok('edited text visible', (await bodyText()).includes('(edited)'));

  step('NOTE-04 — delete with confirm');
  await page.evaluate(() => {
    const first = document.querySelectorAll('ul.grid > li')[0];
    first?.querySelector('button[aria-label="Delete this note"]')?.click();
  });
  await waitUntil(async () => (await bodyText()).includes('Delete note?'), 5000);
  ok('confirm modal opens', (await bodyText()).includes('Delete note?'));
  await clickButton('delete note');
  await waitUntil(async () => (await bodyText()).includes('Note deleted'), 5000);
  ok('delete toast shown', (await bodyText()).includes('Note deleted'));
  ok('note removed + total back to 15', /15 notes/.test(await bodyText()));
  await shot('notes-06-deleted');

  step('NOTE-05 — member role on Mobile App MVP (read-only)');
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      a.textContent.includes('All projects'),
    );
    link?.click();
  });
  await waitUntil(async () => (await bodyText()).includes('Mobile App MVP'));
  const memberHref = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      a.textContent.includes('Mobile App MVP'),
    );
    return link?.getAttribute('href') ?? null;
  });
  ok('member project card linked', Boolean(memberHref), String(memberHref));
  await clickHref(memberHref);
  await waitUntil(
    async () =>
      page.url().endsWith(memberHref) &&
      (await page.$(`a[href="${memberHref}/notes"]`)) !== null,
    8000,
  );
  await clickHref(`${memberHref}/notes`);
  await waitUntil(
    async () =>
      page.url().includes('/notes') &&
      ((await page.$('ul.grid > li')) !== null ||
        /No notes yet/i.test(await bodyText())),
    8000,
  );
  text = await bodyText();
  ok('member sees notes grid', /note/i.test(text));
  ok('no "New note" button for member', !(await page.$('button[aria-label="New note"]')) && !/New note/i.test(text));
  // Backend rule: owner OR project_admin — a member may edit/pin/delete their
  // OWN note, but must see no controls on other people's notes.
  const memberCards = await page.$$eval('ul.grid > li', (els) =>
    els.map((el) => ({
      text: el.innerText,
      canEdit: Boolean(el.querySelector('button[aria-label="Edit this note"]')),
      byMaya: /Maya Sharma/.test(el.innerText),
    })),
  );
  ok('member cards render', memberCards.length > 0, `got ${memberCards.length}`);
  const wrongControls = memberCards.filter((c) => c.canEdit && !c.byMaya);
  ok(
    'controls hidden on notes the member does not own',
    wrongControls.length === 0,
    JSON.stringify(wrongControls.map((c) => c.text.slice(0, 40))),
  );
  ok(
    'member can still edit their own note (owner rule)',
    memberCards.some((c) => c.canEdit && c.byMaya),
  );
  await shot('notes-07-member-readonly');
} catch (err) {
  failed++;
  failures.push(`FATAL: ${err.message}`);
  console.log(`\n  ✗ FATAL: ${err.message}`);
} finally {
  if (browser) await browser.close();
}

function E2E_NOTE_SHORT() {
  return 'deployment window Sunday 02:00 UTC';
}

console.log(`\n  RESULT: ${passed} passed, ${failed} failed`);
if (failures.length) console.log(`  FAILURES:\n   - ${failures.join('\n   - ')}`);
process.exit(failed ? 1 : 0);
