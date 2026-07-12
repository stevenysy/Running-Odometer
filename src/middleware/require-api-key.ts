import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppContext } from '@/routes/app';

export const requireApiKey = createMiddleware<AppContext>(async (c, next) => {
  const authorization = c.req.header('Authorization');
  const expected = `Bearer ${c.env.API_KEY}`;

  if (authorization !== expected) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  await next();
});
