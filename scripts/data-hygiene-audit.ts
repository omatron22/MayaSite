// scripts/data-hygiene-audit.ts
// Read-only hygiene audit of the prod DB. Reports counts only (no rows
// dumped). Run with: npx tsx scripts/data-hygiene-audit.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

type Row = Record<string, unknown>;
async function q(label: string, sql: string) {
  const r = await db.execute(sql);
  const row = r.rows[0] as Row | undefined;
  const count = row ? Number(Object.values(row)[0]) : 0;
  const flag = count > 0 ? '⚠' : '✓';
  console.log(`  ${flag} ${count.toLocaleString().padStart(8)}  ${label}`);
  return count;
}

async function main() {
  console.log('\n=== DATA HYGIENE AUDIT ===\n');

  console.log('TABLE SIZES (sanity check):');
  await q('catalog_signs',           `SELECT COUNT(*) FROM catalog_signs`);
  await q('blocks',                  `SELECT COUNT(*) FROM blocks`);
  await q('graphemes',               `SELECT COUNT(*) FROM graphemes`);
  await q('roboflow_instances',      `SELECT COUNT(*) FROM roboflow_instances`);
  await q('kerr_vessels',            `SELECT COUNT(*) FROM kerr_vessels`);
  await q('cmhi_images',             `SELECT COUNT(*) FROM cmhi_images`);

  console.log('\nMISSING REQUIRED FIELDS:');
  await q('signs with NULL/empty graphcode',  `SELECT COUNT(*) FROM catalog_signs WHERE graphcode IS NULL OR graphcode = ''`);
  await q('signs with NULL/empty mhd_code',   `SELECT COUNT(*) FROM catalog_signs WHERE mhd_code IS NULL OR mhd_code = ''`);
  await q('blocks with NULL/empty artifact',  `SELECT COUNT(*) FROM blocks WHERE artifact_code IS NULL OR artifact_code = ''`);
  await q('blocks with NULL/empty site_name', `SELECT COUNT(*) FROM blocks WHERE site_name IS NULL OR site_name = ''`);
  await q('blocks with NULL region',          `SELECT COUNT(*) FROM blocks WHERE region IS NULL OR region = ''`);
  await q('kerr w/o image_url',               `SELECT COUNT(*) FROM kerr_vessels WHERE image_url IS NULL OR image_url = ''`);
  await q('cmhi w/o image_url',               `SELECT COUNT(*) FROM cmhi_images WHERE image_url IS NULL OR image_url = ''`);

  console.log('\nDUPLICATES:');
  await q('signs sharing same graphcode',
    `SELECT COUNT(*) FROM (
       SELECT graphcode FROM catalog_signs
       WHERE graphcode IS NOT NULL AND graphcode != ''
       GROUP BY graphcode HAVING COUNT(*) > 1
     )`);
  await q('signs sharing same mhd_code (incl null sub)',
    `SELECT COUNT(*) FROM (
       SELECT mhd_code FROM catalog_signs
       WHERE mhd_code IS NOT NULL AND mhd_code != ''
       GROUP BY mhd_code, COALESCE(mhd_code_sub, '') HAVING COUNT(*) > 1
     )`);
  await q('blocks sharing mhd_block_id',
    `SELECT COUNT(*) FROM (
       SELECT mhd_block_id FROM blocks
       WHERE mhd_block_id IS NOT NULL AND mhd_block_id != ''
       GROUP BY mhd_block_id HAVING COUNT(*) > 1
     )`);
  await q('kerr vessels sharing k_number',
    `SELECT COUNT(*) FROM (
       SELECT k_number FROM kerr_vessels
       WHERE k_number IS NOT NULL AND k_number != ''
       GROUP BY k_number HAVING COUNT(*) > 1
     )`);

  console.log('\nORPHANS:');
  await q('graphemes pointing to missing block_id',
    `SELECT COUNT(*) FROM graphemes g
     WHERE g.block_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.id = g.block_id)`);

  console.log('\nSUSPICIOUS STRINGS (typo / encoding probes):');
  await q('regions with raw "?" character',  `SELECT COUNT(*) FROM blocks WHERE region LIKE '%?%'`);
  await q('site_names with leading/trailing space',
    `SELECT COUNT(*) FROM blocks WHERE site_name != TRIM(site_name)`);
  await q('blocks with non-ASCII region (could be encoding issue)',
    `SELECT COUNT(*) FROM blocks WHERE region GLOB '*[^a-zA-Z0-9 _-]*'`);
  await q('captions w/ literal "undefined" or "null"',
    `SELECT COUNT(*) FROM cmhi_images
     WHERE site_name LIKE '%undefined%' OR site_name LIKE '%null%'`);

  console.log('\nDATE / CALENDAR CONSISTENCY:');
  await q('blocks with long_count but no gregorian',
    `SELECT COUNT(*) FROM blocks
     WHERE event_long_count IS NOT NULL AND event_long_count NOT IN ('', '_', '-')
     AND (event_gregorian IS NULL OR event_gregorian IN ('', '_', '-'))`);
  await q('blocks with gregorian but no long_count',
    `SELECT COUNT(*) FROM blocks
     WHERE event_gregorian IS NOT NULL AND event_gregorian NOT IN ('', '_', '-')
     AND (event_long_count IS NULL OR event_long_count IN ('', '_', '-'))`);

  console.log('\nREGION INVENTORY (after Usumacinta migration):');
  const regions = await db.execute(
    `SELECT region, COUNT(*) as n FROM blocks
     WHERE region IS NOT NULL AND region != ''
     GROUP BY region ORDER BY n DESC`
  );
  regions.rows.forEach((r) => {
    const region = String(r.region);
    const n = Number(r.n).toLocaleString().padStart(8);
    console.log(`    ${n}  ${region}`);
  });

  console.log('\nDONE.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
