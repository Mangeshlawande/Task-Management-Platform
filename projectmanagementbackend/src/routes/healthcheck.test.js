/**
 * Jest integration test for the Healthcheck API — /api/v1/healthcheck
 */
import request from 'supertest';
import app from '../app.js';

describe('GET /api/v1/healthcheck', () => {
  test('returns 200 with service uptime and timestamp', async () => {
    const res = await request(app).get('/api/v1/healthcheck');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('OK');
    expect(typeof res.body.data.uptime).toBe('number');
    expect(typeof res.body.data.timestamp).toBe('string');
  });
});
