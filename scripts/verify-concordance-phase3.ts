// scripts/verify-concordance-phase3.ts
// Verifies Phase 3: block_sign_slots populated correctly.
// Run with: npx tsx scripts/verify-concordance-phase3.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('=== Phase 3 Verification ===\n');
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

  // 1. Slots exist
  const slotCount = await db.execute(`SELECT COUNT(*) as count FROM block_sign_slots`);
  const slots = Number(slotCount.rows[0].count);
  check('Slots populated', slots > 100000, `${slots} slots`);

  // 2. All slots reference valid blocks
  const orphanSlots = await db.execute(`
    SELECT COUNT(*) as count FROM block_sign_slots bss
    WHERE NOT EXISTS (SELECT 1 FROM blocks WHERE id = bss.block_id)
  `);
  check('No orphan block references', Number(orphanSlots.rows[0].count) === 0,
    `${orphanSlots.rows[0].count} orphans`);

  // 3. Linked slots reference valid catalog entries
  const orphanEntries = await db.execute(`
    SELECT COUNT(*) as count FROM block_sign_slots bss
    WHERE bss.catalog_entry IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM catalog_entries WHERE entry_id = bss.catalog_entry)
  `);
  check('No orphan entry references', Number(orphanEntries.rows[0].count) === 0,
    `${orphanEntries.rows[0].count} orphans`);

  // 4. Certainty distribution is reasonable
  const certDist = await db.execute(`
    SELECT certainty, COUNT(*) as count
    FROM block_sign_slots GROUP BY certainty
  `);
  console.log('\n  Certainty distribution:');
  for (const row of certDist.rows) {
    console.log(`    ${row.certainty}: ${row.count}`);
  }
  check('Has all certainty types', certDist.rows.length >= 2);

  // 5. Slot positions are sequential per block (spot check)
  const spotCheck = await db.execute(`
    SELECT block_id, COUNT(*) as cnt,
           MAX(slot_position) as max_pos, MIN(slot_position) as min_pos
    FROM block_sign_slots
    GROUP BY block_id
    HAVING max_pos != cnt - 1 OR min_pos != 0
    LIMIT 10
  `);
  check('Slot positions sequential', spotCheck.rows.length === 0,
    spotCheck.rows.length > 0 ? `${spotCheck.rows.length} blocks with gaps` : 'all sequential');

  // 6. Coverage: what % of blocks with graphcodes have slots?
  const blocksWithCodes = await db.execute(`
    SELECT COUNT(*) as count FROM blocks
    WHERE block_graphcodes IS NOT NULL AND block_graphcodes != ''
  `);
  const blocksWithSlots = await db.execute(`
    SELECT COUNT(DISTINCT block_id) as count FROM block_sign_slots
  `);
  const coverage = Number(blocksWithSlots.rows[0].count) / Number(blocksWithCodes.rows[0].count) * 100;
  check('Block coverage > 95%', coverage > 95,
    `${Number(blocksWithSlots.rows[0].count)}/${Number(blocksWithCodes.rows[0].count)} (${coverage.toFixed(1)}%)`);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
