// scripts/verify-concordance-phase2.ts
// Verifies Phase 2: TWKM entries, concordance links, iconography.
// Run with: npx tsx scripts/verify-concordance-phase2.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('=== Phase 2 Verification ===\n');
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

  // 1. TWKM entries exist
  const twkmCount = await db.execute(
    `SELECT COUNT(*) as count FROM catalog_entries WHERE catalog = 'TWKM'`
  );
  const twkm = Number(twkmCount.rows[0].count);
  check('TWKM entries created', twkm > 1000, `${twkm} entries`);

  // 2. Multiple catalogs present
  const catalogCount = await db.execute(
    `SELECT catalog, COUNT(*) as count FROM catalog_entries GROUP BY catalog ORDER BY count DESC`
  );
  console.log('\n  Entries by catalog:');
  for (const row of catalogCount.rows) {
    console.log(`    ${row.catalog}: ${row.count}`);
  }
  check('Multiple catalogs', catalogCount.rows.length >= 3,
    `${catalogCount.rows.length} catalogs`);

  // 3. Concordance links exist
  const linkCount = await db.execute(`SELECT COUNT(*) as count FROM concordance_links`);
  const links = Number(linkCount.rows[0].count);
  check('Concordance links created', links > 0, `${links} links`);

  // 4. Link correspondence types
  const corrTypes = await db.execute(`
    SELECT correspondence, COUNT(*) as count
    FROM concordance_links GROUP BY correspondence
  `);
  console.log('\n  Links by correspondence type:');
  for (const row of corrTypes.rows) {
    console.log(`    ${row.correspondence}: ${row.count}`);
  }
  check('Has exact links', corrTypes.rows.some(r => r.correspondence === 'exact'),
    'from Zender matches');

  // 5. MHD ↔ TWKM links
  const mhdTwkmLinks = await db.execute(`
    SELECT COUNT(*) as count FROM concordance_links
    WHERE asserted_by = 'MHD-TWKM-match'
  `);
  const mhdTwkm = Number(mhdTwkmLinks.rows[0].count);
  check('MHD-TWKM links', mhdTwkm > 500, `${mhdTwkm} links`);

  // 6. Graphs exist
  const graphCount = await db.execute(`SELECT COUNT(*) as count FROM graphs`);
  const graphs = Number(graphCount.rows[0].count);
  check('Graphs created', graphs > 1000, `${graphs} graphs`);

  // 7. Graphs have iconographic tags
  const withTags = await db.execute(
    `SELECT COUNT(*) as count FROM graphs WHERE iconographic_tags IS NOT NULL`
  );
  const tagged = Number(withTags.rows[0].count);
  check('Graphs with iconography', tagged > 0, `${tagged}/${graphs}`);

  // 8. All concordance link entries reference valid entries
  const orphanLinks = await db.execute(`
    SELECT COUNT(*) as count FROM concordance_links cl
    WHERE NOT EXISTS (SELECT 1 FROM catalog_entries WHERE entry_id = cl.entry_a)
       OR NOT EXISTS (SELECT 1 FROM catalog_entries WHERE entry_id = cl.entry_b)
  `);
  check('No orphan links', Number(orphanLinks.rows[0].count) === 0,
    `${orphanLinks.rows[0].count} orphans`);

  // 9. All graphs reference valid entries
  const orphanGraphs = await db.execute(`
    SELECT COUNT(*) as count FROM graphs g
    WHERE NOT EXISTS (SELECT 1 FROM catalog_entries WHERE entry_id = g.catalog_entry)
  `);
  check('No orphan graphs', Number(orphanGraphs.rows[0].count) === 0,
    `${orphanGraphs.rows[0].count} orphans`);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
