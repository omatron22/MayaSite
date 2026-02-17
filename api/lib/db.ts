import { createClient, type Client } from '@libsql/client';

// Lazy-initialize so env vars can be loaded before first use
let _db: Client | null = null;

function getDb(): Client {
  if (!_db) {
    const url = (process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL || '').replace('libsql://', 'https://').trim();
    const authToken = (process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN || '').trim();

    if (!url) {
      throw new Error('Missing TURSO_DATABASE_URL or VITE_TURSO_DATABASE_URL env var');
    }

    _db = createClient({ url, authToken, intMode: 'number' });
  }
  return _db;
}

// Proxy that lazily initializes on first method call
const db = new Proxy({} as Client, {
  get(_, prop) {
    const client = getDb();
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  }
});

export { db };
