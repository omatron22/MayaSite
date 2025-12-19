import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
config({ path: join(__dirname, '..', '.env.local') });

import { db } from '../src/lib/db.ts';

async function inspect() {
  console.log('=== DATABASE INSPECTION ===\n');
  
  // Verify connection
  console.log('🔌 Testing connection...');
  const dbUrl = process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL;
  console.log(`  URL: ${dbUrl?.substring(0, 30)}...`);
  console.log('');
  
  // 1. Table counts
  console.log('📊 TABLE COUNTS:');
  const counts = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM catalog_signs'),
    db.execute('SELECT COUNT(*) as count FROM blocks'),
    db.execute('SELECT COUNT(*) as count FROM graphemes'),
    db.execute('SELECT COUNT(*) as count FROM roboflow_instances'),
  ]);
  console.log(`  catalog_signs: ${counts[0].rows[0].count}`);
  console.log(`  blocks: ${counts[1].rows[0].count}`);
  console.log(`  graphemes: ${counts[2].rows[0].count}`);
  console.log(`  roboflow_instances: ${counts[3].rows[0].count}\n`);

  // 2. Sample catalog signs
  console.log('📋 SAMPLE CATALOG SIGNS (first 3):');
  const catalog = await db.execute('SELECT * FROM catalog_signs LIMIT 3');
  console.log(JSON.stringify(catalog.rows, null, 2));
  console.log('\n');

  // 3. Sample blocks
  console.log('📦 SAMPLE BLOCKS (first 3):');
  const blocks = await db.execute('SELECT * FROM blocks LIMIT 3');
  console.log(JSON.stringify(blocks.rows, null, 2));
  console.log('\n');

  // 4. Sample graphemes
  console.log('✏️ SAMPLE GRAPHEMES (first 3):');
  const graphemes = await db.execute('SELECT * FROM graphemes LIMIT 3');
  console.log(JSON.stringify(graphemes.rows, null, 2));
  console.log('\n');

  // 5. Check for images
  console.log('🖼️ IMAGE COVERAGE:');
  const imageStats = await db.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(primary_image_url) as has_image,
      ROUND(COUNT(primary_image_url) * 100.0 / COUNT(*), 2) as pct
    FROM catalog_signs
  `);
  console.log(`  Catalog signs with images: ${imageStats.rows[0].has_image}/${imageStats.rows[0].total} (${imageStats.rows[0].pct}%)\n`);

  const blockImageStats = await db.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(block_image1_url) as has_image1,
      COUNT(block_image2_url) as has_image2
    FROM blocks
  `);
  console.log(`  Blocks with image1: ${blockImageStats.rows[0].has_image1}/${blockImageStats.rows[0].total}`);
  console.log(`  Blocks with image2: ${blockImageStats.rows[0].has_image2}/${blockImageStats.rows[0].total}\n`);

  // 6. Check schema columns
  console.log('🏗️ CATALOG_SIGNS COLUMNS:');
  const schema = await db.execute('PRAGMA table_info(catalog_signs)');
  console.log(schema.rows.map((r: any) => `  ${r.name} (${r.type})`).join('\n'));
  console.log('\n');

  // 7. Site origin coverage
  console.log('📍 LOCATION DATA:');
  const locationStats = await db.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(site_origin) as has_site,
      COUNT(region_origin) as has_region
    FROM blocks
  `);
  console.log(`  Blocks with site_origin: ${locationStats.rows[0].has_site}/${locationStats.rows[0].total}`);
  console.log(`  Blocks with region_origin: ${locationStats.rows[0].has_region}/${locationStats.rows[0].total}\n`);

  // 8. Check for specific fields that search.tsx uses
  console.log('🔍 SEARCH PAGE FIELD AVAILABILITY:');
  const testQuery = await db.execute(`
    SELECT 
      mhd_code,
      thompson_code,
      syllabic_value,
      english_translation,
      primary_image_url
    FROM catalog_signs 
    WHERE mhd_code IS NOT NULL
    LIMIT 1
  `);
  console.log('  Sample record for search fields:');
  console.log(JSON.stringify(testQuery.rows[0], null, 2));
}

inspect().catch(console.error);
