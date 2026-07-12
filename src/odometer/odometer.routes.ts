import { Hono } from 'hono';
import { createDb } from '@/db/client';
import { requireApiKey } from '@/middleware/require-api-key';
import type { AppContext } from '@/routes/app';
import { createOdometerRepository } from './odometer.repository';
import { createOdometerService } from './odometer.service';

export const odometerRoutes = new Hono<AppContext>();

odometerRoutes.get('/odometer', requireApiKey, async (c) => {
  const odometerService = createOdometerService(createOdometerRepository(createDb(c.env.DB)));
  const odometer = await odometerService.getOdometer();

  return c.json(odometer);
});
