import { db } from '../src/lib/db.ts';

async function main() {
  console.log('\n=== YOUR DATABASE STATS ===\n');
  
  // Check region distribution
  const regions = await db.execute(`
    SELECT region, COUNT(*) as count
    FROM blocks
    WHERE event_long_count IS NOT NULL
      AND event_long_count != '-'
    GROUP BY region
    ORDER BY count DESC
  `);
  
  console.log('Region distribution:');
  regions.rows.forEach(r => {
    console.log(`  ${r.region || 'NULL'}: ${r.count}`);
  });
  
  // Check site coverage
  const sites = await db.execute(`
    SELECT site_name, COUNT(*) as count
    FROM blocks
    WHERE event_long_count IS NOT NULL
      AND event_long_count != '-'
      AND site_name IS NOT NULL
    GROUP BY site_name
    ORDER BY count DESC
    LIMIT 20
  `);
  
  console.log('\nTop 20 sites:');
  sites.rows.forEach(s => {
    console.log(`  ${s.site_name}: ${s.count}`);
  });
  
  // Check for missing region data
  const missingRegion = await db.execute(`
    SELECT COUNT(*) as count
    FROM blocks
    WHERE event_long_count IS NOT NULL
      AND event_long_count != '-'
      AND (region IS NULL OR region = '')
  `);
  
  console.log(`\nBlocks with missing region: ${missingRegion.rows[0].count}`);
  
  // Check image coverage
  const withImages = await db.execute(`
    SELECT COUNT(DISTINCT cs.id) as with_img
    FROM catalog_signs cs
    WHERE cs.primary_image_url IS NOT NULL
  `);
  
  const totalSigns = await db.execute(`
    SELECT COUNT(*) as total FROM catalog_signs
  `);
  
  console.log(`\nSigns with images: ${withImages.rows[0].with_img} / ${totalSigns.rows[0].total}`);
  
  // Sample a few entries to see structure
  console.log('\n=== SAMPLE ENTRY ===\n');
  const sample = await db.execute(`
    SELECT 
      b.event_long_count,
      b.region,
      b.site_name,
      b.artifact_code,
      cs.graphcode,
      cs.primary_image_url
    FROM blocks b
    INNER JOIN graphemes g ON g.block_id = b.id
    INNER JOIN catalog_signs cs ON cs.id = g.catalog_sign_id
    WHERE b.event_long_count IS NOT NULL
      AND b.event_long_count != '-'
      AND cs.primary_image_url IS NOT NULL
    LIMIT 5
  `);
  
  sample.rows.forEach((r, i) => {
    console.log(`Entry ${i + 1}:`);
    console.log(JSON.stringify(r, null, 2));
  });
}

main().catch(console.error);
