import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';

/** zValidator that returns the app's `{ error }` JSON shape instead of raw zod issues. */
export const validate = <T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
  message: string,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) return c.json({ error: message }, 400);
  });
