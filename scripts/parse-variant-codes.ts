import { db } from '../src/lib/db';

async function main() {
  console.log('🔍 Parsing variant codes from unknown_signs...\n');
  
  const unknownSigns = await db.execute(`
    SELECT roboflow_code, occurrences 
    FROM unknown_signs 
    ORDER BY occurrences DESC
  `);
  
  let parsed = 0;
  let created = 0;
  
  for (const row of unknownSigns.rows) {
    const code = String(row.roboflow_code);
    
    // Parse pattern: "61bt yu" or "585st bi" or "229bl a"
    const match = code.match(/^(\d+)(st|bt|bv|bl|bh|br|ex)\s+(.+)$/i);
    
    if (!match) {
      console.log(`⚠️  Could not parse: ${code}`);
      continue;
    }
    
    const [, baseNumber, variantCode, phoneticValue] = match;
    parsed++;
    
    // Check if this variant already exists in catalog
    const existing = await db.execute({
      sql: `
        SELECT id FROM catalog_signs 
        WHERE base_thompson_number = ? 
        AND variant_code = ? 
        AND phonetic_value = ?
      `,
      args: [parseInt(baseNumber), variantCode.toLowerCase(), phoneticValue.trim()]
    });
    
    if (existing.rows.length === 0) {
      // Create new catalog entry
      await db.execute({
        sql: `
          INSERT INTO catalog_signs 
          (mhd_code, base_thompson_number, variant_code, phonetic_value, syllabic_value)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          code, // Use full code as mhd_code for now
          parseInt(baseNumber),
          variantCode.toLowerCase(),
          phoneticValue.trim(),
          phoneticValue.trim() // Duplicate to syllabic_value
        ]
      });
      created++;
      console.log(`✅ Created: ${code} (base: ${baseNumber}, variant: ${variantCode}, phonetic: ${phoneticValue})`);
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   Parsed: ${parsed}`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${unknownSigns.rows.length - parsed}`);
}

main().catch(console.error);
