// scripts/investigate-hygiene-findings.ts
// Sample the 3 main findings from the hygiene audit so we know whether they
// are bugs or intentional. Run with: npx tsx scripts/investigate-hygiene-findings.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('\n=== HYGIENE FINDING DEEP-DIVE ===\n');

  console.log('1) 595 signs without graphcode. Sample 5:');
  const noGraphcode = await db.execute(
    `SELECT id, mhd_code, mhd_code_sub, syllabic_value, logographic_value, english_translation, word_class
     FROM catalog_signs WHERE graphcode IS NULL OR graphcode = '' LIMIT 5`
  );
  noGraphcode.rows.forEach((r) => {
    console.log(`   id=${r.id} mhd=${r.mhd_code}${r.mhd_code_sub ? '.' + r.mhd_code_sub : ''} syll=${r.syllabic_value} logo=${r.logographic_value} en=${r.english_translation}`);
  });

  console.log('\n   Are graphcode-less signs concentrated in any specific mhd_code range?');
  const ranges = await db.execute(
    `SELECT SUBSTR(mhd_code, 1, 2) AS prefix, COUNT(*) AS n
     FROM catalog_signs WHERE graphcode IS NULL OR graphcode = ''
     GROUP BY prefix ORDER BY n DESC LIMIT 8`
  );
  ranges.rows.forEach((r) => console.log(`     prefix "${r.prefix}": ${r.n}`));

  console.log('\n2) 626 graphcodes shared by multiple signs. Sample 5 groups:');
  const dupes = await db.execute(
    `SELECT graphcode, COUNT(*) AS n, GROUP_CONCAT(id) AS ids, GROUP_CONCAT(COALESCE(mhd_code_sub, '_')) AS subs
     FROM catalog_signs WHERE graphcode IS NOT NULL AND graphcode != ''
     GROUP BY graphcode HAVING COUNT(*) > 1
     ORDER BY n DESC LIMIT 5`
  );
  dupes.rows.forEach((r) => {
    console.log(`   graphcode="${r.graphcode}" count=${r.n} ids=[${r.ids}] subs=[${r.subs}]`);
  });

  console.log('\n   Are duplicate graphcodes distinguished by mhd_code_sub or are they true dupes?');
  const trueDupes = await db.execute(
    `SELECT COUNT(*) AS true_dupes FROM (
       SELECT graphcode FROM catalog_signs
       WHERE graphcode IS NOT NULL AND graphcode != ''
       GROUP BY graphcode, COALESCE(mhd_code_sub, '') HAVING COUNT(*) > 1
     )`
  );
  console.log(`   True duplicates (same graphcode + same mhd_code_sub): ${trueDupes.rows[0].true_dupes}`);

  console.log('\n3) 53,678 blocks have Long Count but no Gregorian. Sample 3:');
  const noGreg = await db.execute(
    `SELECT id, mhd_block_id, artifact_code, event_long_count, event_calendar, event_260_day, event_365_day
     FROM blocks
     WHERE event_long_count IS NOT NULL AND event_long_count NOT IN ('', '_', '-')
     AND (event_gregorian IS NULL OR event_gregorian IN ('', '_', '-'))
     LIMIT 3`
  );
  noGreg.rows.forEach((r) => {
    console.log(`   id=${r.id} mhd=${r.mhd_block_id} long_count="${r.event_long_count}" calendar="${r.event_calendar}"`);
  });

  console.log('\n   Are the Long Count values well-formed (X.X.X.X.X)?');
  const malformed = await db.execute(
    `SELECT COUNT(*) AS bad FROM blocks
     WHERE event_long_count IS NOT NULL AND event_long_count NOT IN ('', '_', '-')
     AND event_long_count NOT GLOB '*.*.*.*.*'`
  );
  console.log(`   Malformed (not matching X.X.X.X.X): ${malformed.rows[0].bad}`);

  console.log('\nDONE.\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
