import { Hono } from 'hono';

export type AppEnv = { Bindings: Env };

export const createApp = () => new Hono<AppEnv>();
