import { db } from '../src/lib/db.ts';

async function main() {
  // Count all signs with images and dates
  const allSigns = await db.execute(`
    SELECT COUNT(DISTINCT cs.id) as sign_count
    FROM catalog_signs cs
    INNER JOIN graphemes g ON g.catalog_sign_id = cs.id
    INNER JOIN blocks b ON g.block_id = b.id
    WHERE b.event_long_count IS NOT NULL
      AND b.event_long_count != '-'
      AND cs.primary_image_url IS NOT NULL
  `);

  const allInstances = await db.execute(`
    SELECT COUNT(*) as instance_count
    FROM graphemes g
    INNER JOIN blocks b ON g.block_id = b.id
    INNER JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
    WHERE b.event_long_count IS NOT NULL
      AND b.event_long_count != '-'
      AND cs.primary_image_url IS NOT NULL
  `);

  console.log('\n=== DATABASE TOTALS ===');
  console.log(`Total unique signs with dates & images: ${allSigns.rows[0].sign_count}`);
  console.log(`Total sign instances with dates & images: ${allInstances.rows[0].instance_count}`);
  
  // Currently showing
  console.log('\n=== CURRENTLY SHOWING ===');
  console.log('Timeline views: ~2,000 instances (from top 30 signs)');
  console.log('Mosaic view: ~100 glyphs');
  console.log('\n⚠️  You\'re showing only a small fraction of your data!');
}

main().catch(console.error);
