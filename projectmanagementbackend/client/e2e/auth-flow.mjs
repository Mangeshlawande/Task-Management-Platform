/**
 * Browser E2E — full auth flow click-through (docs/05 plan acceptance criteria).
 * Run: node e2e/auth-flow.mjs   (requires backend :8000 + vite :5173 already running)
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
const USER = `browser${Math.floor(Math.random() * 100000)}`;
const EMAIL = `${USER}@example.com`;
const PASS = 'BrowserPass123!';
const PASS2 = 'SecondPass456!';

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

/**
 * Clear an input and type into it with REAL key events.
 * focus → native select() → Backspace → type. Synthetic value-sets are
 * ignored by React's value tracker; trusted keystrokes are the reliable way.
 */
const typeInput = async (sel, value) => {
  await page.waitForSelector(sel, { timeout: 5000 });
  await page.focus(sel);
  await page.$eval(sel, (el) => el.select());
  await page.keyboard.press('Backspace');
  await page.type(sel, value);
};

/** Click the first button whose label contains `text`, with a real mouse click. */
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

/** Poll in fresh contexts — waitForFunction can hold a stale execution context across React navigations. */
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

async function main() {
  browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 900 },
  });
  page = await browser.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('/api/v1/auth/')) {
      console.log(`  [net] ${res.request().method()} ${u.split('/api/v1/')[1]} → ${res.status()}`);
      if (res.status() >= 400 && u.includes('login')) {
        res.text().then((b) => console.log('        body:', b.slice(0, 90)));
      }
    }
  });
  console.log(`▶ Chrome up. Ephemeral user: ${USER}`);

  /* ── 1. Register — client validation ──────────────────────── */
  step('1) Register — client validation errors');
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle0' });
  await typeInput('#username', 'x');
  await typeInput('#email', 'not-an-email');
  await typeInput('#password', '123');
  await clickButton('Create account');
  await sleep(400);
  let alerts = await alertTexts();
  ok('username too short error', alerts.some((t) => t.includes('3 characters')));
  ok('invalid email error', alerts.some((t) => t.includes('valid email')));
  ok('password too short error', alerts.some((t) => t.includes('8 characters')));
  await shot('01-register-validation');

  /* ── 2. Register — success path ───────────────────────────── */
  step('2) Register — success → straight to /projects (no verification step)');
  await typeInput('#username', USER);
  await typeInput('#email', EMAIL);
  await typeInput('#password', PASS);
  await shot('02-register-filled');
  await clickButton('Create account');
  ok('redirected to /projects', await expectPath('/projects'));
  await sleep(300);
  ok('success toast shown', (await bodyText()).includes('Account created'));
  ok('register logged us in (user chip visible)', (await bodyText()).includes(USER));
  ok(
    'projects empty state rendered right after signup',
    await waitUntil(async () => (await bodyText()).includes('No projects yet')),
  );
  await shot('03-signed-in-after-register');

  /* ── 2b. Removed verification endpoints must not exist ────── */
  step('2b) No OTP / forgot-password surface left on the API or the router');
  const deadRoutes = await page.evaluate(async (email) => {
    const probe = async (path, body) => {
      const res = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.status;
    };
    return {
      verifyOtp: await probe('/api/v1/auth/verify-otp', { email, otp: '123456' }),
      resendOtp: await probe('/api/v1/auth/resend-otp', { email }),
      forgot: await probe('/api/v1/auth/forgot-password', { email }),
      reset: await probe('/api/v1/auth/reset-password/abc', {
        newPassword: 'Whatever123!',
      }),
    };
  }, EMAIL);
  ok(
    'verify-otp → 404',
    deadRoutes.verifyOtp === 404,
    `(got ${deadRoutes.verifyOtp})`,
  );
  ok(
    'resend-otp → 404',
    deadRoutes.resendOtp === 404,
    `(got ${deadRoutes.resendOtp})`,
  );
  ok(
    'forgot-password → 404',
    deadRoutes.forgot === 404,
    `(got ${deadRoutes.forgot})`,
  );
  ok(
    'reset-password → 404',
    deadRoutes.reset === 404,
    `(got ${deadRoutes.reset})`,
  );

  /* ── 2c. Log out so /login is reachable again ─────────────── */
  step('2c) Log out (the credential tests need the login page)');
  await clickButton('Log out');
  ok('logged out after verifying', await expectPath('/login'));
  await sleep(300);

  /* ── 3. Login — wrong password ────────────────────────────── */
  step('3) Login — wrong password shows generic error');
  await typeInput('#identifier', USER);
  await typeInput('#password', 'WrongPass999!');
  await clickButton('Log in');
  await sleep(800);
  ok('generic invalid-credentials banner', (await bodyText()).includes('Invalid credentials'));
  await shot('04-login-wrong-password');

  /* ── 4. Login — success ───────────────────────────────────── */
  step('4) Login — success → /projects');
  await typeInput('#password', PASS);
  await clickButton('Log in');
  ok('landed on /projects', await expectPath('/projects'));
  await sleep(400);
  const home = await bodyText();
  ok(
    'projects empty state rendered',
    await waitUntil(async () => (await bodyText()).includes('No projects yet')),
  );
  ok('user chip in topbar', home.includes(USER));
  await shot('05-projects-authed');

  /* ── 4b. Projects — create + duplicate name ───────────────── */
  step('4b) Projects — validation, create, duplicate name');
  const cardTexts = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('li h2')].map((h) => h.textContent.trim()),
    );

  ok('empty-state CTA opens the modal', await clickButton('Create your first project'));
  await sleep(400);
  ok('create modal is open', (await page.$('#project-name')) !== null);
  ok('name input is autofocused', await page.evaluate(() => document.activeElement?.id === 'project-name'));

  await typeInput('#project-name', 'ab');
  await clickButton('Create project');
  await sleep(300);
  ok(
    'name too short → inline error',
    (await alertTexts()).some((t) => t.includes('at least 3 characters')),
  );
  await shot('05b-create-modal-validation');

  const PROJECT = `E2E Board ${Math.floor(Math.random() * 10000)}`;
  await typeInput('#project-name', PROJECT);
  await typeInput('#project-description', 'Created by the browser walkthrough.');
  await clickButton('Create project');
  ok(
    'project card appears without a reload',
    await waitUntil(async () => (await cardTexts()).includes(PROJECT)),
  );
  ok('modal closed after create', (await page.$('#project-name')) === null);
  ok('creator is shown as Admin', (await bodyText()).includes('Admin'));
  ok('member count rendered', (await bodyText()).includes('1 member'));
  await shot('05c-project-created');

  // Names are unique per creator → the duplicate must land inline, not as a toast.
  await clickButton('New project');
  await sleep(400);
  await typeInput('#project-name', PROJECT);
  await clickButton('Create project');
  await sleep(1000);
  ok(
    'duplicate name → inline field error',
    (await alertTexts()).some((t) => t.includes('already exists')),
  );
  ok('duplicate did not add a second card', (await cardTexts()).length === 1);
  await shot('05d-duplicate-project');
  await clickButton('Cancel');
  await sleep(300);
  ok('cancel closes the modal', (await page.$('#project-name')) === null);

  /* ── 5. Session persists across reload ────────────────────── */
  step('5) Session persists across hard reload');
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(600);
  ok('still on /projects (not bounced)', page.url().includes('/projects'));
  ok('user chip still visible', (await bodyText()).includes(USER));
  ok(
    'created project survived the reload',
    await waitUntil(async () => (await cardTexts()).includes(PROJECT)),
  );
  await shot('06-after-reload');

  /* ── 6. Settings — change password ────────────────────────── */
  step('6) Settings — wrong current password → inline field error');
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle0' });
  await sleep(400);
  ok('settings renders with role badge', (await bodyText()).toLowerCase().includes('member'));
  ok(
    'no email-verification badge anywhere',
    !(await bodyText()).includes('Email verified'),
  );
  await typeInput('#oldPassword', 'WrongPass999!');
  await typeInput('#newPassword', PASS2);
  await typeInput('#confirmPassword', PASS2);
  await shot('07-settings-filled-wrong');
  await clickButton('Update password');
  await sleep(800);
  alerts = await alertTexts();
  ok('current-password field error', alerts.some((t) => t.includes('Current password is incorrect')));

  step('6b) Settings — correct change → forced re-login');
  await typeInput('#oldPassword', PASS);
  await typeInput('#newPassword', PASS2);
  await typeInput('#confirmPassword', PASS2);
  await clickButton('Update password');
  ok('redirected to /login', await expectPath('/login'));
  await sleep(300);
  ok('password-changed banner', (await bodyText()).includes('Password changed'));
  await shot('08-after-change-password');

  /* ── 7. Login with NEW password ───────────────────────────── */
  step('7) Login with the new password');
  await typeInput('#identifier', USER);
  await typeInput('#password', PASS2);
  await clickButton('Log in');
  // The guard preserved "from: /settings" when it bounced us out in 6b —
  // post-login should return us there (docs/04 § 8 behavior).
  const landed7 = await expectPath('/settings');
  if (!landed7) {
    console.log('  [dbg] url:', page.url());
    console.log('  [dbg] body:', JSON.stringify((await bodyText()).slice(0, 220)));
  }
  ok('returned to preserved /settings page', landed7);

  /* ── 8. Restore original password (keep re-runs clean) ────── */
  step('8) Settings — change password back (cleanup)');
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle0' });
  await sleep(400);
  await typeInput('#oldPassword', PASS2);
  await typeInput('#newPassword', PASS);
  await typeInput('#confirmPassword', PASS);
  await clickButton('Update password');
  ok('back at /login', await expectPath('/login'));

  /* ── 9. Logout flow ───────────────────────────────────────── */
  step('9) Logout');
  await typeInput('#identifier', USER);
  await typeInput('#password', PASS);
  await clickButton('Log in');
  const landed9 = await expectPath('/settings'); // preserved "from" again
  if (!landed9) {
    console.log('  [dbg] url after step 9 login:', page.url());
    console.log('  [dbg] body:', JSON.stringify((await bodyText()).slice(0, 200)));
  }
  ok('logged in again (back on /settings)', landed9);
  await sleep(400);
  await clickButton('Log out');
  ok('back on /login after logout', await expectPath('/login'));
  await shot('09-after-logout');

  /* ── 10. Auth guard bounce ────────────────────────────────── */
  step('10) Guard: logged-out /projects → bounced to /login');
  await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle0' });
  ok('bounced to /login', await expectPath('/login'));
  await shot('10-guard-bounce');

  /* ── 11. Forgot password ──────────────────────────────────── */
  step('11) Forgot password — route and API removed');
  await page.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle0' });
  await sleep(400);
  ok('old route falls through to the 404 page', (await bodyText()).includes('Page not found'));
  await shot('11-forgot-route-removed');

  /* ── 12. Cleanup ──────────────────────────────────────────── */
  step('12) Cleanup — delete the ephemeral account');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await typeInput('#identifier', USER);
  await typeInput('#password', PASS);
  await clickButton('Log in');
  ok('logged in for cleanup', await expectPath('/projects'));
  const deleted = await page.evaluate(async () => {
    const res = await fetch('/api/v1/auth/me', {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.status;
  });
  ok('ephemeral account deleted (no DB litter)', deleted === 200, `(status ${deleted})`);

  /* ── Summary ──────────────────────────────────────────────── */
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
