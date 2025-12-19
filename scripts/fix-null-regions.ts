import { db } from '../src/lib/db.ts';

async function main() {
  console.log('Fixing NULL regions...\n');
  
  // Update NULL regions to "Unknown"
  const result = await db.execute(`
    UPDATE blocks
    SET region = 'Unknown'
    WHERE region IS NULL
  `);
  
  console.log(`✅ Updated ${result.rowsAffected} blocks with NULL region to "Unknown"`);
  
  // Verify
  const checkResult = await db.execute(`
    SELECT region, COUNT(*) as count
    FROM blocks
    GROUP BY region
    ORDER BY count DESC
  `);
  
  console.log('\n=== NEW REGION DISTRIBUTION ===');
  checkResult.rows.forEach((row: any) => {
    console.log(`  ${row.region || 'NULL'}: ${row.count}`);
  });
}

main().catch(console.error);
