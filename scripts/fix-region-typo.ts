// scripts/fix-region-typo.ts
// One-off migration: rename the region value 'Usmacinta' (historical typo)
// to 'Usumacinta' across the blocks table. After this runs successfully,
// the normalizeRegion shim in api/search.ts can be removed and any
// import-script source still using the old spelling should be corrected.
// Run with: npx tsx scripts/fix-region-typo.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('Checking current state...\n');

  const before = await db.execute(
    "SELECT region, COUNT(*) as count FROM blocks WHERE region IN ('Usmacinta', 'Usumacinta') GROUP BY region"
  );
  console.log('Before:');
  if (before.rows.length === 0) {
    console.log('  (no rows with either spelling)');
  } else {
    before.rows.forEach((r) => console.log(`  ${r.region}: ${r.count}`));
  }
  console.log();

  const oldCount = Number(
    before.rows.find((r) => r.region === 'Usmacinta')?.count ?? 0
  );
  if (oldCount === 0) {
    console.log('Nothing to migrate. Exiting.');
    return;
  }

  console.log(`Updating ${oldCount} rows from 'Usmacinta' to 'Usumacinta'...\n`);
  const result = await db.execute(
    "UPDATE blocks SET region = 'Usumacinta' WHERE region = 'Usmacinta'"
  );
  console.log(`Rows affected: ${result.rowsAffected}\n`);

  const after = await db.execute(
    "SELECT region, COUNT(*) as count FROM blocks WHERE region IN ('Usmacinta', 'Usumacinta') GROUP BY region"
  );
  console.log('After:');
  after.rows.forEach((r) => console.log(`  ${r.region}: ${r.count}`));

  const remaining = Number(
    after.rows.find((r) => r.region === 'Usmacinta')?.count ?? 0
  );
  if (remaining > 0) {
    console.error(`\nWARNING: ${remaining} rows still have the old spelling.`);
    process.exit(1);
  }
  console.log('\nMigration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
