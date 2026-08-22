import 'dotenv/config';
import { z } from 'zod';

/**
 * Boot-time environment validation (docs/architecture/09 §6).
 * The API refuses to start with a missing or malformed configuration —
 * failing here is cheaper than failing on the first request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 chars'),
  OTP_PEPPER: z.string().min(16, 'OTP_PEPPER must be at least 16 chars'),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().default(90),
  // Web Push (optional — push is silently disabled when absent)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:ops@sprintgo.app'),
  // Firebase Cloud Messaging — reaches the Android apps when they are closed.
  // All three must be set together; push to phones is off when any is missing.
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  // Extra browser origins allowed to call the API + open a socket, comma-separated.
  // The packaged apps' own origins are always allowed (see core/config/cors.ts).
  CORS_ORIGINS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration — the API refuses to start:');
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
