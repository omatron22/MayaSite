import { createClient } from '@libsql/client';

const db = createClient({
  url: (process.env.TURSO_DATABASE_URL || '').replace('libsql://', 'https://').trim(),
  authToken: (process.env.TURSO_AUTH_TOKEN || '').trim(),
  intMode: 'number',
});

export { db };
