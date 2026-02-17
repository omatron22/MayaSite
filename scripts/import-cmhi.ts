// scripts/import-cmhi.ts
// Imports scraped CMHI image data into the database.
// Run with: npx tsx scripts/import-cmhi.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CmhiImage {
  site_name: string;
  site_code: string;
  image_url: string;
  filename: string;
  type: string;
  monument_type: string | null;
  monument_number: string | null;
}

async function main() {
  console.log('Importing CMHI images...\n');

  // Create table if not exists
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS cmhi_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_name TEXT NOT NULL,
      site_code TEXT NOT NULL,
      image_url TEXT NOT NULL,
      filename TEXT NOT NULL,
      image_type TEXT NOT NULL,
      monument_type TEXT,
      monument_number TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_cmhi_site ON cmhi_images(site_code);
    CREATE INDEX IF NOT EXISTS idx_cmhi_type ON cmhi_images(image_type);
  `);

  // Clear existing
  const existing = await db.execute('SELECT COUNT(*) as c FROM cmhi_images');
  if ((existing.rows[0].c as number) > 0) {
    console.log('Clearing existing CMHI data...');
    await db.execute('DELETE FROM cmhi_images');
  }

  const filePath = path.join(__dirname, '..', 'data', 'cmhi-images.json');
  const images: CmhiImage[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Loaded ${images.length} CMHI images\n`);

  const inserts = [];
  let imported = 0;

  for (const img of images) {
    inserts.push({
      sql: `INSERT INTO cmhi_images (site_name, site_code, image_url, filename, image_type, monument_type, monument_number)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [img.site_name, img.site_code, img.image_url, img.filename, img.type, img.monument_type, img.monument_number],
    });

    if (inserts.length >= 100) {
      await db.batch(inserts, 'write');
      imported += inserts.length;
      inserts.length = 0;
    }
  }

  if (inserts.length > 0) {
    await db.batch(inserts, 'write');
    imported += inserts.length;
  }

  console.log(`Imported ${imported} CMHI images`);

  // Stats
  const stats = await db.execute(`
    SELECT image_type, COUNT(*) as cnt
    FROM cmhi_images
    GROUP BY image_type
    ORDER BY cnt DESC
  `);
  for (const row of stats.rows) {
    console.log(`  ${row.image_type}: ${row.cnt}`);
  }
}

main().catch(console.error);
