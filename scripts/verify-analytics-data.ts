// scripts/verify-analytics-data.ts
import { db } from '../src/lib/db.ts';

async function main() {
  console.log('🔍 Verifying Analytics Page Data Requirements\n');
  console.log('='.repeat(80) + '\n');

  // 1. Check signs with graphcode
  console.log('📊 Catalog Signs with graphcode:');
  const signCheck = await db.execute(`
    SELECT COUNT(*) as total,
           COUNT(graphcode) as has_graphcode,
           COUNT(primary_image_url) as has_image
    FROM catalog_signs
  `);
  console.log(`  Total: ${signCheck.rows[0].total}`);
  console.log(`  With graphcode: ${signCheck.rows[0].has_graphcode}`);
  console.log(`  With images: ${signCheck.rows[0].has_image}\n`);

  // 2. Check blocks with dates and regions
  console.log('📍 Blocks with geographic/temporal data:');
  const blockCheck = await db.execute(`
    SELECT COUNT(*) as total,
           COUNT(event_calendar) as has_date,
           COUNT(region) as has_region,
           COUNT(site_name) as has_site
    FROM blocks
  `);
  console.log(`  Total blocks: ${blockCheck.rows[0].total}`);
  console.log(`  With dates: ${blockCheck.rows[0].has_date}`);
  console.log(`  With region: ${blockCheck.rows[0].has_region}`);
  console.log(`  With site_name: ${blockCheck.rows[0].has_site}\n`);

  // 3. Check graphemes linked to catalog signs
  console.log('🔗 Graphemes linked to catalog signs:');
  const graphemeCheck = await db.execute(`
    SELECT COUNT(*) as total,
           COUNT(catalog_sign_id) as has_catalog_link
    FROM graphemes
  `);
  console.log(`  Total: ${graphemeCheck.rows[0].total}`);
  console.log(`  Linked to catalog: ${graphemeCheck.rows[0].has_catalog_link}\n`);

  // 4. Test the analytics query
  console.log('🧪 Testing Analytics Query:\n');
  try {
    const testQuery = await db.execute(`
      SELECT 
        cs.id,
        cs.graphcode,
        cs.syllabic_value,
        cs.english_translation,
        cs.primary_image_url,
        COUNT(DISTINCT g.id) as instance_count
      FROM catalog_signs cs
      INNER JOIN graphemes g ON g.catalog_sign_id = cs.id
      INNER JOIN blocks b ON g.block_id = b.id
      WHERE b.event_calendar IS NOT NULL
        AND b.event_calendar != ''
        AND b.event_calendar != '-'
        AND b.region IS NOT NULL
        AND cs.graphcode IS NOT NULL
      GROUP BY cs.id
      ORDER BY instance_count DESC
      LIMIT 10
    `);
    
    console.log(`  ✅ Query successful! Found ${testQuery.rows.length} top signs\n`);
    console.log('  Top 5 signs by usage:');
    testQuery.rows.slice(0, 5).forEach((row: any, i: number) => {
      console.log(`    ${i+1}. ${row.graphcode} (${row.syllabic_value || 'no phonetic'}) - ${row.instance_count} instances`);
    });
  } catch (err: any) {
    console.log(`  ❌ Query failed: ${err.message}\n`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Verification complete!\n');
}

main().catch(console.error);
