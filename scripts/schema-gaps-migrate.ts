// scripts/schema-gaps-migrate.ts
// Adds missing columns and fixes CHECK constraints to close all data gaps.
// Run with: npx tsx scripts/schema-gaps-migrate.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('Schema gaps migration...\n');

  const safeAddColumn = async (table: string, col: string, type: string) => {
    try {
      await db.execute(`SELECT ${col} FROM ${table} LIMIT 1`);
      console.log(`  ${table}.${col} — already exists`);
    } catch {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
      console.log(`  ${table}.${col} — added`);
    }
  };

  // ── Phase A: New columns on blocks ──
  console.log('Phase A: blocks columns');
  await safeAddColumn('blocks', 'frame_image_url', 'TEXT');
  await safeAddColumn('blocks', 'substitution', 'TEXT');
  await safeAddColumn('blocks', 'evidence', 'TEXT');

  // ── Phase B: New columns on graphs ──
  console.log('\nPhase B: graphs columns');
  await safeAddColumn('graphs', 'occurrence_count', 'INTEGER');
  await safeAddColumn('graphs', 'translation', 'TEXT');

  // ── Phase C: New columns on catalog_entries ──
  console.log('\nPhase C: catalog_entries columns');
  await safeAddColumn('catalog_entries', 'decipherment_criteria', 'TEXT');
  await safeAddColumn('catalog_entries', 'earliest_attestation', 'INTEGER');
  await safeAddColumn('catalog_entries', 'latest_attestation', 'INTEGER');

  // ── Phase D: Fix block_sign_slots certainty CHECK ──
  // SQLite can't ALTER CHECK constraints, so we recreate the table
  console.log('\nPhase D: block_sign_slots certainty CHECK');
  try {
    // Test if 'missing' is already allowed
    await db.execute(`INSERT INTO block_sign_slots (slot_id, block_id, slot_position, certainty) VALUES ('__test__', 1, 0, 'missing')`);
    await db.execute(`DELETE FROM block_sign_slots WHERE slot_id = '__test__'`);
    console.log('  certainty CHECK already includes "missing"');
  } catch {
    console.log('  Recreating block_sign_slots with updated CHECK...');
    const count = await db.execute(`SELECT COUNT(*) as c FROM block_sign_slots`);
    const rowCount = Number(count.rows[0].c);
    console.log(`  ${rowCount.toLocaleString()} existing rows to migrate`);

    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS block_sign_slots_new (
        slot_id TEXT PRIMARY KEY,
        block_id INTEGER NOT NULL REFERENCES blocks(id),
        slot_position INTEGER NOT NULL,
        catalog_entry TEXT REFERENCES catalog_entries(entry_id),
        certainty TEXT CHECK(certainty IN ('certain','uncertain','eroded','missing')),
        position_in_block TEXT,
        graph TEXT REFERENCES graphs(graph_id),
        raw_code TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    if (rowCount > 0) {
      await db.execute(`INSERT INTO block_sign_slots_new SELECT * FROM block_sign_slots`);
    }
    await db.execute(`DROP TABLE block_sign_slots`);
    await db.execute(`ALTER TABLE block_sign_slots_new RENAME TO block_sign_slots`);
    await db.executeMultiple(`
      CREATE INDEX IF NOT EXISTS idx_block_sign_slots_block ON block_sign_slots(block_id);
      CREATE INDEX IF NOT EXISTS idx_block_sign_slots_entry ON block_sign_slots(catalog_entry);
    `);
    console.log('  Done — certainty now allows: certain, uncertain, eroded, missing');
  }

  console.log('\nSchema gaps migration complete!');
}

main().catch(console.error);
