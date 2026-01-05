import { db } from '../src/lib/db';

async function checkImages() {
  console.log('🖼️  IMAGE INVENTORY\n');
  
  // Catalog images
  const catalogImages = await db.execute({
    sql: `SELECT primary_image_url FROM catalog_signs WHERE primary_image_url IS NOT NULL LIMIT 5`,
    args: []
  });
  
  console.log('📋 Sample Catalog Images:');
  catalogImages.rows.forEach((row: any, i: number) => {
    console.log(`   ${i+1}. ${row.primary_image_url}`);
  });
  
  // Roboflow images
  const roboflowImages = await db.execute({
    sql: `SELECT image_url, dataset_split FROM roboflow_instances LIMIT 5`,
    args: []
  });
  
  console.log('\n🤖 Sample Roboflow Images:');
  roboflowImages.rows.forEach((row: any, i: number) => {
    console.log(`   ${i+1}. [${row.dataset_split}] ${row.image_url}`);
  });
  
  // Block images
  const blockImages = await db.execute({
    sql: `
      SELECT image_url, block_image1_url, artifact_code 
      FROM blocks 
      WHERE image_url IS NOT NULL OR block_image1_url IS NOT NULL 
      LIMIT 5
    `,
    args: []
  });
  
  console.log('\n📜 Sample Block Images:');
  blockImages.rows.forEach((row: any, i: number) => {
    console.log(`   ${i+1}. [${row.artifact_code}] ${row.image_url || row.block_image1_url}`);
  });
}

checkImages();
