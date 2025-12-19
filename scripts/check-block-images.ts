import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const db = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN!
});

async function check() {
  // Check column names
  const schema = await db.execute("PRAGMA table_info(blocks)");
  console.log('Block table columns:');
  schema.rows.forEach(row => console.log(` - ${row.name}`));
  
  // Sample some blocks
  const sample = await db.execute(`
    SELECT * FROM blocks LIMIT 3
  `);
  console.log('\nSample blocks:', sample.rows);
}

check().catch(console.error);
