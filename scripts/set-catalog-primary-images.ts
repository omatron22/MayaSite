import { db } from '../src/lib/db';

async function main() {
  console.log('🖼️  Setting primary images from Roboflow instances...\n');
  
  // Set primary image to first Roboflow instance for each sign
  const result = await db.execute(`
    UPDATE catalog_signs
    SET primary_image_url = (
      SELECT ri.image_url
      FROM roboflow_instances ri
      WHERE ri.catalog_sign_id = catalog_signs.id
      LIMIT 1
    )
    WHERE primary_image_url IS NULL
    AND EXISTS (
      SELECT 1 FROM roboflow_instances ri2
      WHERE ri2.catalog_sign_id = catalog_signs.id
    )
  `);
  
  console.log(`✅ Updated ${result.rowsAffected} catalog signs with primary images\n`);
  
  // Final stats
  const stats = await db.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(primary_image_url) as with_images,
      COUNT(*) - COUNT(primary_image_url) as without_images
    FROM catalog_signs
  `);
  
  console.log('📊 Final Coverage:');
  console.log(`   Total signs: ${stats.rows[0].total}`);
  console.log(`   With images: ${stats.rows[0].with_images}`);
  console.log(`   Without images: ${stats.rows[0].without_images}`);
  console.log(`   Coverage: ${Math.round(stats.rows[0].with_images / stats.rows[0].total * 100)}%`);
}

main().catch(console.error);
