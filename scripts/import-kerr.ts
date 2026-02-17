// scripts/import-kerr.ts
// Imports scraped Kerr vessel data into the database.
// Run with: npx tsx scripts/import-kerr.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface KerrVessel {
  k_number: string;
  k_num: number;
  description: string | null;
  image_url: string;
  still_url: string;
}

async function main() {
  console.log('Importing Kerr vessels...\n');

  // Create table if not exists
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS kerr_vessels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      k_number TEXT NOT NULL UNIQUE,
      k_num INTEGER NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      still_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kerr_knum ON kerr_vessels(k_num);
  `);

  // Clear existing
  const existing = await db.execute('SELECT COUNT(*) as c FROM kerr_vessels');
  if ((existing.rows[0].c as number) > 0) {
    console.log('Clearing existing Kerr data...');
    await db.execute('DELETE FROM kerr_vessels');
  }

  const filePath = path.join(__dirname, '..', 'data', 'kerr-vessels.json');
  const vessels: KerrVessel[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Loaded ${vessels.length} Kerr vessels\n`);

  const inserts = [];
  let imported = 0;

  for (const v of vessels) {
    inserts.push({
      sql: `INSERT INTO kerr_vessels (k_number, k_num, description, image_url, still_url)
            VALUES (?, ?, ?, ?, ?)`,
      args: [v.k_number, v.k_num, v.description, v.image_url, v.still_url],
    });

    if (inserts.length >= 100) {
      await db.batch(inserts, 'write');
      imported += inserts.length;
      inserts.length = 0;
      console.log(`  Imported ${imported}/${vessels.length}...`);
    }
  }

  if (inserts.length > 0) {
    await db.batch(inserts, 'write');
    imported += inserts.length;
  }

  console.log(`\nImported ${imported} Kerr vessels`);

  const withDesc = await db.execute("SELECT COUNT(*) as c FROM kerr_vessels WHERE description IS NOT NULL AND description != ''");
  console.log(`With description: ${withDesc.rows[0].c}`);
}

main().catch(console.error);
