import { db } from '../src/lib/db.ts';

async function main() {
  // Check if we have Thompson codes (these map to Bonn)
  const result = await db.execute(`
    SELECT thompson_code, graphcode, COUNT(*) as count
    FROM catalog_signs
    WHERE thompson_code IS NOT NULL
    GROUP BY thompson_code, graphcode
    LIMIT 10
  `);

  console.log('=== SAMPLE THOMPSON/BONN CODES ===');
  result.rows.forEach((row: any) => {
    console.log(`Thompson: ${row.thompson_code} → MHD: ${row.graphcode}`);
  });

  const totalWithThompson = await db.execute(`
    SELECT COUNT(*) as count
    FROM catalog_signs
    WHERE thompson_code IS NOT NULL
  `);

  console.log(`\nTotal signs with Thompson codes: ${totalWithThompson.rows[0].count}`);
}

main().catch(console.error);
