import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN!,
});

async function verifyData() {
  console.log('📊 Data Verification Report\n');
  
  const signsResult = await db.execute('SELECT COUNT(*) as count FROM catalog_signs');
  const signsCount = (signsResult.rows[0] as any).count;
  console.log(`✅ Catalog Signs: ${signsCount.toLocaleString()}`);
  
  const signsWithImages = await db.execute('SELECT COUNT(*) as count FROM catalog_signs WHERE primary_image_url IS NOT NULL');
  const imagesCount = (signsWithImages.rows[0] as any).count;
  console.log(`   - With images: ${imagesCount.toLocaleString()} (${Math.round(imagesCount/signsCount*100)}%)`);
  
  const blocksResult = await db.execute('SELECT COUNT(*) as count FROM blocks');
  const blocksCount = (blocksResult.rows[0] as any).count;
  console.log(`\n✅ Blocks: ${blocksCount.toLocaleString()}`);
  
  const blocksWithImages = await db.execute('SELECT COUNT(*) as count FROM blocks WHERE image_url IS NOT NULL');
  const blockImagesCount = (blocksWithImages.rows[0] as any).count;
  console.log(`   - With images: ${blockImagesCount.toLocaleString()} (${Math.round(blockImagesCount/blocksCount*100)}%)`);
  
  const graphemesResult = await db.execute('SELECT COUNT(*) as count FROM graphemes');
  const graphemesCount = (graphemesResult.rows[0] as any).count;
  console.log(`\n✅ Graphemes: ${graphemesCount.toLocaleString()}`);
  
  const graphemesLinked = await db.execute('SELECT COUNT(*) as count FROM graphemes WHERE block_id IS NOT NULL');
  const linkedCount = (graphemesLinked.rows[0] as any).count;
  console.log(`   - Linked to blocks: ${linkedCount.toLocaleString()} (${Math.round(linkedCount/graphemesCount*100)}%)`);
  
  const roboflowResult = await db.execute('SELECT COUNT(*) as count FROM roboflow_instances');
  const roboflowCount = (roboflowResult.rows[0] as any).count;
  console.log(`\n✅ Roboflow Instances: ${roboflowCount.toLocaleString()}`);
  
  const roboflowLinked = await db.execute('SELECT COUNT(*) as count FROM roboflow_instances WHERE catalog_sign_id IS NOT NULL');
  const roboflowLinkedCount = (roboflowLinked.rows[0] as any).count;
  console.log(`   - Linked to catalog: ${roboflowLinkedCount.toLocaleString()} (${Math.round(roboflowLinkedCount/roboflowCount*100)}%)`);
  
  const signsWithRoboflow = await db.execute(`
    SELECT COUNT(DISTINCT catalog_sign_id) as count 
    FROM roboflow_instances 
    WHERE catalog_sign_id IS NOT NULL
  `);
  const signsRoboflowCount = (signsWithRoboflow.rows[0] as any).count;
  console.log(`   - Unique signs covered: ${signsRoboflowCount.toLocaleString()}`);
  
  const signsWithGraphemes = await db.execute(`
    SELECT COUNT(DISTINCT catalog_sign_id) as count 
    FROM graphemes 
    WHERE catalog_sign_id IS NOT NULL
  `);
  const signsGraphemesCount = (signsWithGraphemes.rows[0] as any).count;
  console.log(`\n✅ Signs with corpus usage: ${signsGraphemesCount.toLocaleString()}`);
  
  console.log('\n✨ All data sources are connected!\n');
}

verifyData().catch(console.error);
