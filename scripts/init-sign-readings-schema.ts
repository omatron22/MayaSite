// scripts/init-sign-readings-schema.ts
// Creates the sign_readings table that captures multiple readings per sign
// (polysemy). Backfills from existing catalog_signs.syllabic_value /
// logographic_value as a starting point — TWKM re-import will add the rest.
// Run with: npx tsx scripts/init-sign-readings-schema.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sign_readings (
      reading_id TEXT PRIMARY KEY,
      catalog_entry TEXT,
      catalog_sign_id INTEGER,
      source_collection_id TEXT,
      reading_value TEXT NOT NULL,
      reading_type TEXT CHECK(reading_type IN ('syllabogram','logogram','numeral','diacritic','unknown')),
      gloss_english TEXT,
      function_context TEXT,
      confidence_level INTEGER,
      criteria_json TEXT,
      is_primary INTEGER DEFAULT 0,
      notes TEXT,
      source_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sign_readings_sign ON sign_readings(catalog_sign_id);
    CREATE INDEX IF NOT EXISTS idx_sign_readings_entry ON sign_readings(catalog_entry);
    CREATE INDEX IF NOT EXISTS idx_sign_readings_value ON sign_readings(reading_value);
    CREATE INDEX IF NOT EXISTS idx_sign_readings_type ON sign_readings(reading_type);
  `);
  console.log('sign_readings table ready.\n');

  // Backfill from existing catalog_signs values.
  const signs = await db.execute(
    `SELECT id, syllabic_value, logographic_value, english_translation
     FROM catalog_signs
     WHERE syllabic_value IS NOT NULL OR logographic_value IS NOT NULL OR english_translation IS NOT NULL`
  );

  let inserted = 0;
  const batch: { sql: string; args: (string | number | null)[] }[] = [];

  for (const r of signs.rows) {
    const signId = Number(r.id);
    const syll = r.syllabic_value as string | null;
    const log = r.logographic_value as string | null;
    const eng = r.english_translation as string | null;

    if (syll && syll !== '_' && syll !== '') {
      batch.push({
        sql: `INSERT OR IGNORE INTO sign_readings
              (reading_id, catalog_sign_id, source_collection_id, reading_value, reading_type, gloss_english, is_primary)
              VALUES (?, ?, 'mhd', ?, 'syllabogram', ?, 1)`,
        args: [`mhd-syll-${signId}`, signId, syll, eng ?? null],
      });
    }
    if (log && log !== '_' && log !== '') {
      // If syll exists this becomes secondary; if not, it's primary
      const isPrimary = !syll || syll === '_' || syll === '' ? 1 : 0;
      batch.push({
        sql: `INSERT OR IGNORE INTO sign_readings
              (reading_id, catalog_sign_id, source_collection_id, reading_value, reading_type, gloss_english, is_primary)
              VALUES (?, ?, 'mhd', ?, 'logogram', ?, ?)`,
        args: [`mhd-log-${signId}`, signId, log, eng ?? null, isPrimary],
      });
    }

    if (batch.length >= 200) {
      await db.batch(batch, 'write');
      inserted += batch.length;
      batch.length = 0;
    }
  }
  if (batch.length > 0) {
    await db.batch(batch, 'write');
    inserted += batch.length;
  }

  console.log(`Backfilled ${inserted} readings from existing MHD values.`);
  const total = await db.execute('SELECT COUNT(*) AS n FROM sign_readings');
  console.log(`Total sign_readings now: ${total.rows[0].n}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
