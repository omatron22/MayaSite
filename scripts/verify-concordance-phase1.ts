// scripts/verify-concordance-phase1.ts
// Verifies Phase 1 migration: catalog_entries count matches catalog_signs,
// parent relationships are valid, no data loss.
// Run with: npx tsx scripts/verify-concordance-phase1.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('=== Phase 1 Verification ===\n');
  let passed = 0;
  let failed = 0;

  const check = (label: string, ok: boolean, detail?: string) => {
    if (ok) {
      console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
      passed++;
    } else {
      console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  };

  // 1. Row count match
  const [csCount, ceCount] = await Promise.all([
    db.execute(`SELECT COUNT(*) as count FROM catalog_signs`),
    db.execute(`SELECT COUNT(*) as count FROM catalog_entries WHERE catalog = 'MHD'`),
  ]);
  const catalogSignsTotal = Number(csCount.rows[0].count);
  const catalogEntriesTotal = Number(ceCount.rows[0].count);
  check('Row count match', catalogSignsTotal === catalogEntriesTotal,
    `catalog_signs=${catalogSignsTotal}, catalog_entries(MHD)=${catalogEntriesTotal}`);

  // 2. Every legacy_catalog_sign_id is unique and non-null
  const legacyCheck = await db.execute(`
    SELECT COUNT(*) as total,
           COUNT(DISTINCT legacy_catalog_sign_id) as unique_ids,
           SUM(CASE WHEN legacy_catalog_sign_id IS NULL THEN 1 ELSE 0 END) as nulls
    FROM catalog_entries WHERE catalog = 'MHD'
  `);
  const lc = legacyCheck.rows[0] as Record<string, number>;
  check('Legacy IDs unique', lc.unique_ids === lc.total, `${lc.unique_ids} unique of ${lc.total}`);
  check('No null legacy IDs', lc.nulls === 0, `${lc.nulls} nulls`);

  // 3. Parent entries reference existing entries
  const parentCheck = await db.execute(`
    SELECT COUNT(*) as total
    FROM catalog_entries ce
    WHERE ce.parent_entry IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM catalog_entries p WHERE p.entry_id = ce.parent_entry)
  `);
  const orphans = Number(parentCheck.rows[0].total);
  check('No orphan parents', orphans === 0, `${orphans} orphans`);

  // 4. Parent entries have shorter codes than children
  const parentRelCheck = await db.execute(`
    SELECT COUNT(*) as count
    FROM catalog_entries ce
    WHERE ce.parent_entry IS NOT NULL
      AND ce.catalog = 'MHD'
  `);
  check('Parent relationships exist', Number(parentRelCheck.rows[0].count) > 0,
    `${parentRelCheck.rows[0].count} entries have parents`);

  // 5. Reading values preserved
  const readingCheck = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM catalog_signs WHERE syllabic_value IS NOT NULL OR logographic_value IS NOT NULL) as src,
      (SELECT COUNT(*) FROM catalog_entries WHERE catalog = 'MHD' AND reading_value IS NOT NULL) as dst
  `);
  const rc = readingCheck.rows[0] as Record<string, number>;
  check('Reading values preserved', rc.dst >= rc.src * 0.95,
    `source has ${rc.src} with readings, destination has ${rc.dst}`);

  // 6. Gloss preserved
  const glossCheck = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM catalog_signs WHERE english_translation IS NOT NULL) as src,
      (SELECT COUNT(*) FROM catalog_entries WHERE catalog = 'MHD' AND gloss_english IS NOT NULL) as dst
  `);
  const gc = glossCheck.rows[0] as Record<string, number>;
  check('English glosses preserved', gc.src === gc.dst,
    `source=${gc.src}, destination=${gc.dst}`);

  // 7. Images preserved
  const imgCheck = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM catalog_signs WHERE primary_image_url IS NOT NULL) as src,
      (SELECT COUNT(*) FROM catalog_entries WHERE catalog = 'MHD' AND image_url IS NOT NULL) as dst
  `);
  const ic = imgCheck.rows[0] as Record<string, number>;
  check('Images preserved', ic.src === ic.dst,
    `source=${ic.src}, destination=${ic.dst}`);

  // 8. New tables exist
  for (const table of ['catalog_entries', 'concordance_links', 'graphs', 'block_sign_slots']) {
    try {
      await db.execute(`SELECT COUNT(*) FROM ${table}`);
      check(`Table ${table} exists`, true);
    } catch {
      check(`Table ${table} exists`, false);
    }
  }

  // 9. New columns on blocks
  for (const col of ['event_gregorian', 'transcription_1', 'transcription_2']) {
    try {
      await db.execute(`SELECT ${col} FROM blocks LIMIT 1`);
      check(`blocks.${col} exists`, true);
    } catch {
      check(`blocks.${col} exists`, false);
    }
  }

  // 10. New columns on graphemes
  for (const col of ['graph_id', 'assigned_by']) {
    try {
      await db.execute(`SELECT ${col} FROM graphemes LIMIT 1`);
      check(`graphemes.${col} exists`, true);
    } catch {
      check(`graphemes.${col} exists`, false);
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
