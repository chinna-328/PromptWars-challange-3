import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { activityPayload, makeTestApp } from '../helpers';

describe('POST /api/activities', () => {
  it('creates an activity and computes emissions server-side (201)', async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post('/api/activities')
      .send(activityPayload({ quantity: 5 }));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeGreaterThan(0);
    // 5 km petrol car × 0.192 = 0.96 — computed by the server, not the client
    expect(res.body.emissionsKg).toBeCloseTo(0.96, 6);
  });

  it('ignores any client-supplied emissions value (400 via strict schema)', async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post('/api/activities')
      .send({ ...activityPayload(), emissionsKg: 0.000001 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid body with 400 and the error envelope', async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post('/api/activities')
      .send(activityPayload({ quantity: -5 }));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(typeof res.body.error.message).toBe('string');
  });

  it('rejects a category/activity mismatch with 400', async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post('/api/activities')
      .send(activityPayload({ category: 'food', activityType: 'car_petrol' }));
    expect(res.status).toBe(400);
  });

  it('applies the stricter write rate limit (429 with envelope)', async () => {
    const app = makeTestApp({ limit: 1000, writeLimit: 2 });
    await request(app).post('/api/activities').send(activityPayload());
    await request(app).post('/api/activities').send(activityPayload());
    const res = await request(app).post('/api/activities').send(activityPayload());
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('GET /api/activities', () => {
  it('lists newest-first with pagination metadata', async () => {
    const app = makeTestApp();
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post('/api/activities')
        .send(activityPayload({ quantity: i + 1 }));
    }
    const res = await request(app).get('/api/activities?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({ page: 1, limit: 2, total: 3 });
    // Newest first: the last insert comes back first.
    expect(res.body.data[0].quantity).toBe(3);
  });

  it('rejects a limit above 100 with 400', async () => {
    const app = makeTestApp();
    const res = await request(app).get('/api/activities?limit=101');
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/activities/:id', () => {
  it('updates an entry and recomputes emissions', async () => {
    const app = makeTestApp();
    const created = await request(app).post('/api/activities').send(activityPayload());
    const res = await request(app)
      .put(`/api/activities/${created.body.id}`)
      .send(activityPayload({ activityType: 'train', quantity: 100 }));
    expect(res.status).toBe(200);
    expect(res.body.activityType).toBe('train');
    expect(res.body.emissionsKg).toBeCloseTo(4.1, 6);
  });

  it('returns 404 for a missing id and 400 for a malformed id', async () => {
    const app = makeTestApp();
    const missing = await request(app).put('/api/activities/9999').send(activityPayload());
    expect(missing.status).toBe(404);
    const malformed = await request(app).put('/api/activities/abc').send(activityPayload());
    expect(malformed.status).toBe(400);
  });
});

describe('DELETE /api/activities/:id', () => {
  it('deletes an entry (204) and subsequent GET returns 404', async () => {
    const app = makeTestApp();
    const created = await request(app).post('/api/activities').send(activityPayload());
    const del = await request(app).delete(`/api/activities/${created.body.id}`);
    expect(del.status).toBe(204);
    const after = await request(app).get(`/api/activities/${created.body.id}`);
    expect(after.status).toBe(404);
    expect(after.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when deleting a non-existent entry', async () => {
    const app = makeTestApp();
    const res = await request(app).delete('/api/activities/424242');
    expect(res.status).toBe(404);
  });
});
