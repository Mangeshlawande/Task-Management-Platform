/**
 * Jest contract test for the auth API — `docs/03-api-contract.md` § Auth.
 *
 * Runs against the real app and the real database (`MONGO_URI` from `.env`),
 * i.e. exactly what `npm run dev` talks to. It pins the 2026-10 rewrite:
 *   - register creates the account AND logs it in (201 + httpOnly cookies)
 *   - no OTP / verification / forgot-password surface exists any more
 *   - login never answers 403
 *
 * Self-cleaning: an ephemeral user is created and deleted in the suite.
 *
 * Run: npm test
 */
import 'dotenv/config';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/user.models.js';

const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
const USERNAME = `authtest${suffix}`.slice(0, 30);
const EMAIL = `${USERNAME}@example.com`;
const PASSWORD = 'AuthTest123!';

/** "a=b; c=d" — everything a request needs to present the session cookies. */
const cookieHeader = (res) =>
  (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');

let session = '';

beforeAll(async () => {
  // A remote Atlas cluster can take several seconds to accept — the default
  // 5 s hook timeout is too tight for it.
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 20000,
  });
}, 30000);

afterAll(async () => {
  // Never leave a test account behind, even when an assertion fails.
  await User.deleteMany({ username: USERNAME });
  await mongoose.disconnect();
}, 30000);

describe('register — no verification step', () => {
  test('creates the account and logs the user in immediately', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      username: USERNAME,
      email: EMAIL,
      password: PASSWORD,
      fullName: 'Auth Contract Test',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe(USERNAME);

    // Signed in on signup: both cookies come back with the account.
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);

    // The mail era is gone: no dev OTP, no verification flag on the payload.
    expect(res.body.data).not.toHaveProperty('devOtp');
    expect(res.body.data.user).not.toHaveProperty('isEmailVerified');
    expect(res.body.data.user.isEmailVerified).toBeUndefined();

    session = cookieHeader(res);
  });

  test('rejects a duplicate username/email with 409', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: USERNAME, email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(409);
  });
});

describe('login', () => {
  test('accepts the account right after signup (no gate)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(USERNAME);
    expect(res.headers['set-cookie']).toBeDefined();
    session = cookieHeader(res);
  });

  test('accepts username as well as email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: USERNAME, password: PASSWORD });

    expect(res.status).toBe(200);
    session = cookieHeader(res);
  });

  test('rejects a wrong password with 401 (never 403)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: 'NotThePassword1!' });

    expect(res.status).toBe(401);
    expect(res.status).not.toBe(403);
  });

  test('session cookie resolves the user via GET /auth/me', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', session);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(USERNAME);
    expect(res.body.data).not.toHaveProperty('isEmailVerified');
  });
});

describe('removed e-mail endpoints', () => {
  const gone = [
    ['/api/v1/auth/verify-otp', { email: EMAIL, otp: '123456' }],
    ['/api/v1/auth/resend-otp', { email: EMAIL }],
    ['/api/v1/auth/forgot-password', { email: EMAIL }],
    ['/api/v1/auth/reset-password/some-token', { newPassword: PASSWORD }],
  ];

  test.each(gone)('POST %s → 404', async (path, body) => {
    const res = await request(app).post(path).send(body);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('logout + cleanup', () => {
  test('logout clears the session', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', session);

    expect(res.status).toBe(200);
  });

  test('DELETE /auth/me removes the ephemeral account', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);

    const res = await request(app)
      .delete('/api/v1/auth/me')
      .set('Cookie', cookieHeader(login));

    expect(res.status).toBe(200);

    const gone = await User.findOne({ username: USERNAME });
    expect(gone).toBeNull();
  });
});
