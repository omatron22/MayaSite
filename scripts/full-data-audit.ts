import { db } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function auditAllData() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 COMPLETE DATA AUDIT - Maya Database');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. DATABASE TABLES
  console.log('📊 DATABASE TABLES IN TURSO:\n');
  
  const tables = await db.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    args: []
  });
  
  for (const table of tables.rows) {
    const tableName = table.name as string;
    
    // Get row count
    const count = await db.execute({
      sql: `SELECT COUNT(*) as count FROM ${tableName}`,
      args: []
    });
    
    // Get schema
    const schema = await db.execute({
      sql: `PRAGMA table_info(${tableName})`,
      args: []
    });
    
    console.log(`\n📋 ${tableName.toUpperCase()}`);
    console.log(`   Rows: ${count.rows[0].count}`);
    console.log(`   Columns (${schema.rows.length}):`);
    schema.rows.forEach((col: any) => {
      console.log(`     - ${col.name} (${col.type})`);
    });
  }

  // 2. LOCAL DATA FILES
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📁 LOCAL DATA FILES:\n');
  
  const dataDir = path.join(process.cwd(), 'data');
  
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);
    
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile() && file.endsWith('.json')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        const itemCount = Array.isArray(data) ? data.length : Object.keys(data).length;
        const sizeKB = (stats.size / 1024).toFixed(2);
        
        console.log(`\n📄 ${file}`);
        console.log(`   Size: ${sizeKB} KB`);
        console.log(`   Items: ${itemCount}`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`   Sample keys:`, Object.keys(data[0]).slice(0, 8).join(', '));
        }
      } else if (stats.isDirectory()) {
        const subFiles = fs.readdirSync(filePath);
        console.log(`\n📂 ${file}/`);
        console.log(`   Contains ${subFiles.length} items`);
      }
    }
  }

  // 3. ANALYZE KEY RELATIONSHIPS
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('🔗 DATA RELATIONSHIPS:\n');

  // Signs with instances
  const signsWithInstances = await db.execute({
    sql: `
      SELECT COUNT(DISTINCT catalog_sign_id) as count 
      FROM graphemes 
      WHERE catalog_sign_id IS NOT NULL
    `,
    args: []
  });

  console.log(`📊 Signs with corpus instances: ${signsWithInstances.rows[0].count}`);

  // Signs with ML data
  const signsWithML = await db.execute({
    sql: `SELECT COUNT(DISTINCT catalog_sign_id) as count FROM roboflow_instances`,
    args: []
  });

  console.log(`🤖 Signs with ML training data: ${signsWithML.rows[0].count}`);

  // Blocks with images
  const blocksWithImages = await db.execute({
    sql: `
      SELECT 
        COUNT(*) as total,
        COUNT(image_url) as with_url,
        COUNT(block_image1_url) as with_img1,
        COUNT(block_image2_url) as with_img2
      FROM blocks
    `,
    args: []
  });

  console.log(`\n🖼️  Block Images:`);
  console.log(`   Total blocks: ${blocksWithImages.rows[0].total}`);
  console.log(`   With image_url: ${blocksWithImages.rows[0].with_url}`);
  console.log(`   With block_image1_url: ${blocksWithImages.rows[0].with_img1}`);
  console.log(`   With block_image2_url: ${blocksWithImages.rows[0].with_img2}`);

  // Geographic data
  const geoData = await db.execute({
    sql: `
      SELECT 
        COUNT(DISTINCT region) as regions,
        COUNT(DISTINCT site_name) as sites,
        COUNT(DISTINCT artifact_code) as artifacts
      FROM blocks
      WHERE region IS NOT NULL
    `,
    args: []
  });

  console.log(`\n🗺️  Geographic Coverage:`);
  console.log(`   Regions: ${geoData.rows[0].regions}`);
  console.log(`   Sites: ${geoData.rows[0].sites}`);
  console.log(`   Artifacts: ${geoData.rows[0].artifacts}`);

  // Date coverage
  const dateData = await db.execute({
    sql: `
      SELECT 
        COUNT(DISTINCT event_calendar) as dated_events,
        MIN(event_calendar) as earliest,
        MAX(event_calendar) as latest
      FROM blocks
      WHERE event_calendar IS NOT NULL AND event_calendar != ''
    `,
    args: []
  });

  console.log(`\n📅 Temporal Coverage:`);
  console.log(`   Dated events: ${dateData.rows[0].dated_events}`);
  console.log(`   Earliest: ${dateData.rows[0].earliest}`);
  console.log(`   Latest: ${dateData.rows[0].latest}`);

  // 4. DATA QUALITY METRICS
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('✅ DATA QUALITY METRICS:\n');

  const catalogQuality = await db.execute({
    sql: `
      SELECT 
        COUNT(*) as total,
        COUNT(primary_image_url) as with_image,
        COUNT(english_translation) as with_translation,
        COUNT(syllabic_value) as with_syllabic,
        COUNT(thompson_code) as with_thompson
      FROM catalog_signs
    `,
    args: []
  });

  const row = catalogQuality.rows[0];
  console.log(`📋 Catalog Signs Completeness:`);
  console.log(`   Total: ${row.total}`);
  console.log(`   With images: ${row.with_image} (${((row.with_image as number / row.total as number) * 100).toFixed(1)}%)`);
  console.log(`   With translations: ${row.with_translation} (${((row.with_translation as number / row.total as number) * 100).toFixed(1)}%)`);
  console.log(`   With syllabic values: ${row.with_syllabic} (${((row.with_syllabic as number / row.total as number) * 100).toFixed(1)}%)`);
  console.log(`   With Thompson codes: ${row.with_thompson} (${((row.with_thompson as number / row.total as number) * 100).toFixed(1)}%)`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✨ AUDIT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════\n');
}

auditAllData().catch(console.error);
