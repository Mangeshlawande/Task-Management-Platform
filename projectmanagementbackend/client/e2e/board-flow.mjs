/**
 * Browser E2E — P3 kanban board click-through (docs/05 plan acceptance criteria).
 * Run: node e2e/board-flow.mjs   (requires backend :8000 + vite :5173 already running)
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
const USER = `board${Math.floor(Math.random() * 100000)}`;
const EMAIL = `${USER}@example.com`;
const PASS = 'BoardPass123!';

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

const bodyText = () => page.evaluate(() => document.body.innerText);
const alertTexts = () => page.$$eval('[role="alert"]', (els) => els.map((e) => e.textContent));

const waitUntil = async (fn, timeout = 10000, interval = 200) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return true;
    await sleep(interval);
  }
  return false;
};

const expectPath = async (pathname, timeout = 10000) =>
  waitUntil(async () => (await page.evaluate(() => location.pathname)) === pathname, timeout);

/** Card titles inside a column (aria-label "<Column> column"). */
const columnText = async (column) =>
  page.evaluate((name) => {
    const section = [...document.querySelectorAll('section')].find(
      (s) => s.getAttribute('aria-label') === `${name} column`,
    );
    if (!section) return '';
    return section.innerText;
  }, column);

const cardsIn = (column) => columnText(column);

async function main() {
  browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 900 },
  });
  page = await browser.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  console.log(`▶ Chrome up. Ephemeral board user: ${USER}`);

  /* ── 1. Register + verify (OTP via dev panel) ─────────────── */
  step('1) Sign up + verify');
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle0' });
  await typeInput('#username', USER);
  await typeInput('#email', EMAIL);
  await typeInput('#password', PASS);
  await clickButton('Create account');
  ok('at /verify-email', await expectPath('/verify-email', 20000));
  await sleep(400);
  const clicked = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((b) =>
      /^\d{6}$/.test((b.textContent || '').trim()),
    );
    if (!el) return false;
    el.click();
    return true;
  });
  ok('dev OTP auto-submit', clicked);
  ok('landed on /projects', await expectPath('/projects'));
  await sleep(500);

  /* ── 2. Create a project, open the Board tab ──────────────── */
  step('2) Create project → open board');
  // List may still be skeleton-loading right after redirect; wait for the CTA.
  const ctaReady = await waitUntil(async () =>
    (await bodyText()).includes('Create your first project'),
  );
  ok('empty-state CTA', ctaReady && (await clickButton('Create your first project')));
  await sleep(400);
  const PROJECT = `Board E2E ${Math.floor(Math.random() * 10000)}`;
  await typeInput('#project-name', PROJECT);
  await clickButton('Create project');
  ok(
    'project card appears',
    await waitUntil(async () => (await bodyText()).includes(PROJECT)),
  );

  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      a.getAttribute('href')?.startsWith('/projects/'),
    );
    link?.click();
  });
  ok('opened project shell', await waitUntil(async () => /^\/projects\/[a-f0-9]+$/.test(await page.evaluate(() => location.pathname))));

  // The shell renders a skeleton (no tab nav) until the detail load resolves.
  const navReady = await waitUntil(async () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll('a')].some((a) =>
          (a.getAttribute('href') || '').endsWith('/board'),
        ),
    ),
  );
  ok('project tab nav rendered', navReady);
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      (a.getAttribute('href') || '').endsWith('/board'),
    );
    link?.click();
  });
  ok(
    'on /projects/:id/board',
    await waitUntil(async () =>
      (await page.evaluate(() => location.pathname)).endsWith('/board'),
    ),
  );
  // Board fetch is async — wait for the empty state (not the loading skeleton).
  ok(
    'empty board state',
    await waitUntil(async () => (await bodyText()).includes('No tasks yet')),
  );
  await shot('20-board-empty');

  /* ── 3. Create the first task ─────────────────────────────── */
  step('3) Create task (validation + success)');
  const openedCreate = await clickButton('Create the first task');
  const modalOpen = await waitUntil(async () => (await page.$('#task-title')) !== null);
  ok('create modal open', openedCreate && modalOpen);

  await clickButton('Create task'); // empty title → client validation
  await waitUntil(async () =>
    alertTexts().then((ts) => ts.some((t) => t.includes('Task title is required'))),
  );
  ok(
    'empty title → inline error',
    (await alertTexts()).some((t) => t.includes('Task title is required')),
  );

  await typeInput('#task-title', 'Design the landing page');
  await page.select('#task-priority', 'HIGH');
  await page.select('#task-status', 'todo');
  await shot('21-task-modal-filled');
  await clickButton('Create task');
  ok(
    'card appears in To do',
    await waitUntil(async () => (await cardsIn('To do')).includes('Design the landing page')),
  );
  ok('modal closed', (await page.$('#task-title')) === null);
  ok('priority badge visible', (await columnText('To do')).includes('HIGH'));
  await shot('22-board-with-card');

  /* ── 4. Move via the card status select ───────────────────── */
  step('4) Optimistic move → In progress');
  const moved = await page.evaluate(() => {
    const section = [...document.querySelectorAll('section')].find(
      (s) => s.getAttribute('aria-label') === 'To do column',
    );
    const select = section?.querySelector('select[aria-label^="Move"]');
    if (!select) return false;
    select.value = 'in_progress';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  ok('status select triggered', moved);
  ok(
    'card landed in In progress',
    await waitUntil(async () =>
      (await cardsIn('In progress')).includes('Design the landing page'),
    ),
  );
  ok('card left To do', !(await cardsIn('To do')).includes('Design the landing page'));
  await shot('23-board-moved');

  /* ── 5. Detail modal: subtasks + save ─────────────────────── */
  step('5) Detail modal — subtasks + edit + save');
  await page.evaluate(() => {
    const section = [...document.querySelectorAll('section')].find(
      (s) => s.getAttribute('aria-label') === 'In progress column',
    );
    section?.querySelector('button')?.click();
  });
  // Modal fetches GET detail before rendering the form — wait, don't sleep.
  const detailOpen = await waitUntil(async () => (await page.$('#detail-title')) !== null);
  ok('detail modal open', detailOpen);
  if (!detailOpen) throw new Error('detail modal never rendered #detail-title');
  ok('title prefilled', (await page.$eval('#detail-title', (el) => el.value)) === 'Design the landing page');

  await typeInput('input[aria-label="New subtask title"]', 'Wire the hero section');
  await clickButton('Add');
  ok(
    'subtask listed',
    await waitUntil(async () => (await bodyText()).includes('Wire the hero section')),
  );
  ok('progress shows 0/1', (await bodyText()).includes('0/1 done'));

  // Tick it — checkbox is the first checkbox in the modal.
  await page.evaluate(() => {
    const modal = document.querySelector('dialog[open]');
    const box = modal?.querySelector('input[type="checkbox"]');
    box?.click();
  });
  await sleep(700);
  ok('progress shows 1/1 done', await waitUntil(async () => (await bodyText()).includes('1/1 done')));

  // Edit priority and save.
  await page.select('#detail-priority', 'LOW');
  await clickButton('Save changes');
  ok('save toast shown', await waitUntil(async () => (await bodyText()).includes('Task saved.')));
  await shot('24-task-detail');
  await clickButton('Close');
  await sleep(400);
  ok(
    'board reflects LOW priority',
    await waitUntil(async () => (await cardsIn('In progress')).includes('LOW')),
  );

  /* ── 6. Filters ───────────────────────────────────────────── */
  step('6) Search + priority filters');
  await typeInput('input[aria-label="Search tasks by title"]', 'zzz-no-match');
  await sleep(400);
  ok('no-match empty state', (await bodyText()).includes('No tasks match your filters'));
  await shot('25-filter-no-match');
  await clickButton('Clear filters');
  await sleep(400);
  ok(
    'card back after clearing',
    await waitUntil(async () => (await cardsIn('In progress')).includes('Design the landing page')),
  );

  await page.select('select[aria-label="Filter by priority"]', 'HIGH');
  await sleep(400);
  ok('HIGH filter hides the LOW task', !(await bodyText()).includes('Design the landing page'));
  await clickButton('Clear');
  await sleep(300);

  /* ── 7. Delete the task (two-step confirm) ────────────────── */
  step('7) Delete task → empty board again');
  await page.evaluate(() => {
    const section = [...document.querySelectorAll('section')].find(
      (s) => s.getAttribute('aria-label') === 'In progress column',
    );
    section?.querySelector('button')?.click();
  });
  const reopened = await waitUntil(async () => (await page.$('#detail-title')) !== null);
  ok('reopened detail', reopened);
  await clickButton('Delete task');
  await sleep(200);
  ok('confirm step shown', (await bodyText()).includes('Confirm delete'));
  await clickButton('Confirm delete');
  ok('modal closed after delete', await waitUntil(async () => (await page.$('#detail-title')) === null));
  ok('board is empty again', await waitUntil(async () => (await bodyText()).includes('No tasks yet')));
  await shot('26-board-cleanup-done');

  /* ── 8. Cleanup — delete the ephemeral account ────────────── */
  step('8) Cleanup — delete ephemeral account');
  const deleted = await page.evaluate(async () => {
    const res = await fetch('/api/v1/auth/me', { method: 'DELETE', credentials: 'include' });
    return res.status;
  });
  ok('account deleted (project cascaded)', deleted === 200, `(status ${deleted})`);

  console.log(`\n══════════════════════════════════`);
  console.log(`  RESULT: ${passed} passed, ${failed} failed`);
  if (failures.length) console.log('  Failures:', failures.join(' | '));
  console.log(`  Screenshots: ${SHOTS}`);
  console.log(`══════════════════════════════════\n`);
}

try {
  await main();
} catch (err) {
  console.error('E2E crashed:', err);
  failed++;
} finally {
  await browser?.close();
  process.exit(failed ? 1 : 0);
}
