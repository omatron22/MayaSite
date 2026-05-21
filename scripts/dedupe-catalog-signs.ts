// scripts/dedupe-catalog-signs.ts
// Removes true duplicate rows from catalog_signs (same graphcode + same
// mhd_code_sub). For each dupe group, keeps the lowest id ("canonical") and
// reassigns FK pointers from graphemes / catalog_entries to it before deleting
// the others.
//
// Run dry first to preview, then with --write to actually mutate:
//   npx tsx scripts/dedupe-catalog-signs.ts
//   npx tsx scripts/dedupe-catalog-signs.ts --write
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

const WRITE = process.argv.includes('--write');

async function main() {
  console.log(WRITE ? '*** WRITE MODE ***\n' : '*** DRY RUN (use --write to apply) ***\n');

  const groups = await db.execute(
    `SELECT graphcode, COALESCE(mhd_code_sub, '') AS sub, GROUP_CONCAT(id) AS ids
     FROM catalog_signs WHERE graphcode IS NOT NULL AND graphcode != ''
     GROUP BY graphcode, COALESCE(mhd_code_sub, '') HAVING COUNT(*) > 1`
  );

  let totalKept = 0;
  let totalRemoved = 0;
  let totalGraphemesReassigned = 0;
  let totalEntriesReassigned = 0;

  for (const g of groups.rows) {
    const ids = String(g.ids).split(',').map(Number).sort((a, b) => a - b);
    const canonical = ids[0];
    const remove = ids.slice(1);
    totalKept++;
    totalRemoved += remove.length;
    const placeholders = remove.map(() => '?').join(',');

    // How many FK rows will be reassigned for this group?
    const gC = await db.execute({
      sql: `SELECT COUNT(*) AS n FROM graphemes WHERE catalog_sign_id IN (${placeholders})`,
      args: remove,
    });
    const eC = await db.execute({
      sql: `SELECT COUNT(*) AS n FROM catalog_entries WHERE legacy_catalog_sign_id IN (${placeholders})`,
      args: remove,
    });
    const gN = Number(gC.rows[0].n);
    const eN = Number(eC.rows[0].n);
    totalGraphemesReassigned += gN;
    totalEntriesReassigned += eN;

    console.log(`  gc="${g.graphcode}" sub="${g.sub}" keep=${canonical} remove=[${remove.join(',')}] graphemes→${gN} entries→${eN}`);

    if (WRITE) {
      await db.batch(
        [
          {
            sql: `UPDATE graphemes SET catalog_sign_id = ? WHERE catalog_sign_id IN (${placeholders})`,
            args: [canonical, ...remove],
          },
          {
            sql: `UPDATE catalog_entries SET legacy_catalog_sign_id = ? WHERE legacy_catalog_sign_id IN (${placeholders})`,
            args: [canonical, ...remove],
          },
          {
            sql: `DELETE FROM catalog_signs WHERE id IN (${placeholders})`,
            args: remove,
          },
        ],
        'write'
      );
    }
  }

  console.log(`\n  Groups processed: ${totalKept}`);
  console.log(`  Rows to delete:   ${totalRemoved}`);
  console.log(`  Graphemes reassigned: ${totalGraphemesReassigned}`);
  console.log(`  Entries reassigned:   ${totalEntriesReassigned}`);
  console.log(WRITE ? '\nDONE.' : '\nDRY RUN. Re-run with --write to apply.');
}

main().catch(e => { console.error(e); process.exit(1); });
