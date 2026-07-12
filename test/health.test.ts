import { describe, expect, it } from 'vitest';
import { createApp } from '@/routes/app';

describe('health route', () => {
  it('returns ok', async () => {
    const app = createApp();
    const response = await app.request('/health');

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
  });
});
