// scripts/add-grapheme-source-attribution.ts
// Adds attribution tracking on graphemes. Backfills every existing grapheme
// to the MHD source. Future imports append their own collection ID.
// Run with: npx tsx scripts/add-grapheme-source-attribution.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function tableHasColumn(table: string, col: string): Promise<boolean> {
  const r = await db.execute(`PRAGMA table_info(${table})`);
  return r.rows.some((row) => String(row.name) === col);
}

async function main() {
  if (!(await tableHasColumn('graphemes', 'source_collections'))) {
    console.log('Adding graphemes.source_collections column...');
    await db.execute(
      `ALTER TABLE graphemes ADD COLUMN source_collections TEXT DEFAULT '["mhd"]'`
    );
  } else {
    console.log('graphemes.source_collections already exists.');
  }

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS grapheme_source_attributions (
      attribution_id TEXT PRIMARY KEY,
      grapheme_id INTEGER NOT NULL,
      collection_id TEXT NOT NULL,
      source_item_id TEXT,
      confidence REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(grapheme_id, collection_id, source_item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_grapheme_sources_grapheme
      ON grapheme_source_attributions(grapheme_id);
    CREATE INDEX IF NOT EXISTS idx_grapheme_sources_collection
      ON grapheme_source_attributions(collection_id);
  `);

  console.log('grapheme_source_attributions ready.\n');

  // Backfill: every existing grapheme is from MHD.
  console.log('Backfilling existing graphemes → mhd attribution...');
  const beforeAttr = await db.execute(
    `SELECT COUNT(*) AS n FROM grapheme_source_attributions WHERE collection_id = 'mhd'`
  );
  console.log(`  Existing mhd attributions: ${beforeAttr.rows[0].n}`);

  // Backfill the denormalized column where NULL.
  const updRes = await db.execute(
    `UPDATE graphemes SET source_collections = '["mhd"]'
     WHERE source_collections IS NULL OR source_collections = ''`
  );
  console.log(`  Updated graphemes.source_collections: ${updRes.rowsAffected} rows`);

  // Insert attribution rows where absent.
  const insRes = await db.execute(
    `INSERT OR IGNORE INTO grapheme_source_attributions
       (attribution_id, grapheme_id, collection_id, confidence, notes)
     SELECT
       'gsa-mhd-' || g.id,
       g.id,
       'mhd',
       1.0,
       'Backfilled from initial MHD import'
     FROM graphemes g`
  );
  console.log(`  Inserted attributions: ${insRes.rowsAffected} rows`);

  const after = await db.execute(
    `SELECT COUNT(*) AS n FROM grapheme_source_attributions`
  );
  console.log(`\nTotal attributions now: ${after.rows[0].n}`);
  console.log('DONE.');
}

main().catch((err) => { console.error(err); process.exit(1); });
