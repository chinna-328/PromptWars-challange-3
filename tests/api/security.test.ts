import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { activityPayload, makeTestApp } from '../helpers';

describe('security middleware', () => {
  it('sets helmet security headers and hides x-powered-by', async () => {
    const app = makeTestApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('answers unknown routes with the 404 error envelope (no stack traces)', async () => {
    const app = makeTestApp();
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  });

  it('rejects bodies above the 10kb limit with 413', async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post('/api/activities')
      .send(activityPayload({ note: 'x'.repeat(20000) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects malformed JSON with 400 and a generic message', async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post('/api/activities')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/); // no stack leak
  });

  it('applies the general rate limit across read endpoints (429)', async () => {
    const app = makeTestApp({ limit: 3, writeLimit: 3 });
    await request(app).get('/api/health');
    await request(app).get('/api/health');
    await request(app).get('/api/health');
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
