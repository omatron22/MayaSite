// scripts/fix-scribe-entity-type.ts
// One-off migration: the entities CHECK constraint didn't allow 'scribe',
// so we seeded scribes as entity_type='person'. The UI Scribes tab filters
// by entity_type='scribe' and returned nothing. Fix:
//   1. Recreate entities table with 'scribe' in the allowed CHECK list
//   2. Reclassify the 24 scribe rows (identified by description starting with 'Scribe')
// Idempotent: re-running after the fix is a no-op.
// Run with: npx tsx scripts/fix-scribe-entity-type.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function tableHasCheck(table: string, needle: string): Promise<boolean> {
  const r = await db.execute({
    sql: `SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`,
    args: [table],
  });
  if (r.rows.length === 0) return false;
  return String(r.rows[0].sql || '').includes(needle);
}

async function main() {
  console.log('Checking entities CHECK constraint...');
  const hasScribe = await tableHasCheck('entities', "'scribe'");
  if (!hasScribe) {
    console.log('  Recreating entities table with scribe in allowed types.');

    await db.executeMultiple(`
      CREATE TABLE entities_new (
        entity_id TEXT PRIMARY KEY,
        entity_type TEXT CHECK(entity_type IN ('person','scribe','title','place','dynasty','deity','toponym','unknown')),
        canonical_name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        description TEXT,
        source_collection_id TEXT,
        source_url TEXT,
        raw_json TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO entities_new SELECT * FROM entities;
      DROP TABLE entities;
      ALTER TABLE entities_new RENAME TO entities;
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
      CREATE INDEX IF NOT EXISTS idx_entities_normalized ON entities(normalized_name);
    `);
    console.log('  Table recreated.');
  } else {
    console.log('  CHECK constraint already includes scribe.');
  }

  // Reclassify the seeded scribes (entity_id starts with 'scribe-' from the seed script)
  const fixed = await db.execute(
    `UPDATE entities SET entity_type = 'scribe'
     WHERE entity_type = 'person'
       AND entity_id LIKE 'scribe-%'
       AND description LIKE 'Scribe%'`
  );
  console.log(`Reclassified ${fixed.rowsAffected} person→scribe rows.`);

  const byType = await db.execute(`SELECT entity_type, COUNT(*) AS n FROM entities GROUP BY entity_type ORDER BY n DESC`);
  console.log('\nEntities by type now:');
  byType.rows.forEach((r) => console.log(`  ${r.entity_type}: ${r.n}`));
  console.log('\nDONE.');
}

main().catch((e) => { console.error(e); process.exit(1); });
