import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { createDb } from '@/db/client';
import { requireApiKey } from '@/middleware/require-api-key';
import type { AppContext } from '@/routes/app';
import { createDisplayConfigRepository } from './display-config.repository';
import { createDisplayConfigService, isValidDateOnly } from './display-config.service';

export const displayConfigRoutes = new Hono<AppContext>();

const displayConfigSchema = z
  .object({
    nextRaceName: z.string().trim().min(1).nullable(),
    nextRaceDate: z.string().refine(isValidDateOnly, 'Expected YYYY-MM-DD').nullable()
  })
  .refine(
    (config) =>
      (config.nextRaceName === null && config.nextRaceDate === null) ||
      (config.nextRaceName !== null && config.nextRaceDate !== null),
    {
      message: 'Expected both nextRaceName and nextRaceDate, or both null'
    }
  );

displayConfigRoutes.get('/display-config', requireApiKey, async (c) => {
  const displayConfigService = createDisplayConfigService(
    createDisplayConfigRepository(createDb(c.env.DB))
  );

  return c.json(await displayConfigService.getConfig());
});

displayConfigRoutes.put('/display-config', requireApiKey, async (c) => {
  const body = await readJsonBody(c.req.raw);
  const parsedBody = displayConfigSchema.safeParse(body);

  if (!parsedBody.success) {
    throw new HTTPException(400, { message: 'Invalid display config' });
  }

  const displayConfigService = createDisplayConfigService(
    createDisplayConfigRepository(createDb(c.env.DB))
  );

  return c.json(await displayConfigService.saveConfig(parsedBody.data));
});

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  }
}
