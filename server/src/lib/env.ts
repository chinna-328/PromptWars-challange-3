import { z } from 'zod';

/**
 * Environment configuration, validated at startup with zod so a
 * misconfigured deployment fails fast with a clear message instead of
 * misbehaving at runtime. See `.env.example` for documentation.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DB_PATH: z.string().min(1).default('server/data/ecotrace.db'),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
});

/** Validated environment values used across the server. */
export const env = envSchema.parse(process.env);
