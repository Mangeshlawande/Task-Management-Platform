/**
 * Jest contract test for Task routes authorization
 */
import request from 'supertest';
import app from '../app.js';

describe('Task routes authentication guards', () => {
  test('GET /api/v1/projects/:projectId/tasks rejects unauthenticated access with 401', async () => {
    const res = await request(app).get('/api/v1/projects/507f1f77bcf86cd799439011/tasks');
    expect(res.status).toBe(401);
  });

  test('POST /api/v1/projects/:projectId/tasks rejects unauthenticated access with 401', async () => {
    const res = await request(app)
      .post('/api/v1/projects/507f1f77bcf86cd799439011/tasks')
      .send({ title: 'Unauthorized Task' });
    expect(res.status).toBe(401);
  });
});
