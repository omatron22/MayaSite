// scripts/fix-graphcode.ts
import { db } from '../src/lib/db.ts';

async function main() {
  console.log('🔧 Fixing graphcode column...\n');

  // Populate graphcode from mhd_code_sub
  console.log('📊 Updating graphcode from mhd_code_sub...');
  const result = await db.execute(`
    UPDATE catalog_signs 
    SET graphcode = mhd_code_sub
    WHERE mhd_code_sub IS NOT NULL
  `);
  
  console.log(`✅ Updated ${result.rowsAffected} rows\n`);

  // Verify the update
  const check = await db.execute(`
    SELECT COUNT(*) as count 
    FROM catalog_signs 
    WHERE graphcode IS NOT NULL
  `);
  
  console.log(`📈 Catalog signs with graphcode: ${check.rows[0].count}/3141`);
  
  // Show sample
  const sample = await db.execute(`
    SELECT id, mhd_code, mhd_code_sub, graphcode, syllabic_value 
    FROM catalog_signs 
    WHERE graphcode IS NOT NULL 
    LIMIT 5
  `);
  
  console.log('\n📋 Sample records:');
  console.log(JSON.stringify(sample.rows, null, 2));
  
  console.log('\n🎉 Done!');
}

main().catch(console.error);
