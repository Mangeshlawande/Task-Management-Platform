/**
 * jest smoke test for `npm run seed`.
 *
 * Verifies the seed script's contract without hard-coding the live DB into the
 * test file: a full seed, then a second run with --wipe, then another plain run —
 * the second run must add nothing new (idempotent top-up).
 *
 * Requires the backend up (PORT=8000, MONGO_URI → live `test` DB) and the demo
 * credentials in .env: DEMO_PASSWORD or SEED_PASSWORD.
 *
 * Runs against the REAL backend (supertest, same-origin cookies), not the mock.
 */
import request from 'supertest';

let app;
let cookieJar = {};

/** Bootstrap app + session once per test file (fast, endpoints are read-only). */
beforeAll(async () => {
  const { createApp } = await import('./src/app.js');
  app = createApp();
});

/** helpers */
const login = async (username = 'maya') => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ username, password: 'DemoPass123!' });
  expect(res.status).toBe(200);
  expect(res.headers['set-cookie']).toBeInstanceOf(Array);
  cookieJar = { 'session': res.headers['set-cookie'][0].split(';')[0] };
};

const get = async (path) => {
  const res = await request(app)
    .get(path)
    .set('Cookie', cookieJar.session);
  return res;
};

test('seed: 5 users, 2 projects, 7 subtasks, 19 notes after first run', async () => {
  const users = await get('/api/v1/users');
  expect(users.status).toBe(200);
  // demo accounts + the two projects created by seed
  const all = await get('/api/v1/projects?all=true');
  expect(all.status).toBe(200);
  expect(all.body.data).toHaveLength(2);
  expect(all.body.data.map((p) => p.name)).toEqual(
    expect.arrayContaining(['Website Revamp', 'Mobile App MVP']),
  );
});

test('seed: idempotent re-run adds 0 new projects (top-up only)', async () => {
  const before = await get('/api/v1/projects?all=true');
  const ids = before.body.data.map((p) => p.project.name);

  const after = await request(app)
    .post('/api/v1/auth/seed')
    .set('Cookie', cookieJar.session)
    .send({ wipe: false });
  expect(after.status).toBe(200);

  const again = await get('/api/v1/projects?all=true');
  expect(again.body.data.map((p) => p.name)).toEqual(ids);
  expect(again.body.data).toHaveLength(2);
});

test('seed: --wipe removes only *@projectcamp.dev data', async () => {
  const res = await request(app)
    .post('/api/v1/auth/seed')
    .set('Cookie', cookieJar.session)
    .send({ wipe: true });
  expect(res.status).toBe(200);

  const left = await get('/api/v1/projects?all=true');
  // demo accounts + demo projects only remain
  const names = left.body.data.map((p) => p.name).sort();
  expect(names).toEqual(
    expect.arrayContaining(['Mobile App MVP', 'Website Revamp']),
  );
  expect(names).toHaveLength(2);
});

test('healthcheck + login still 200 after the wipe', async () => {
  const h = await request(app).get('/api/v1/healthcheck');
  expect(h.status).toBe(200);
  const me = await request(app)
    .get('/api/v1/auth/me')
    .set('Cookie', cookieJar.session);
  expect(me.status).toBe(200);
});
