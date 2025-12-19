import { db } from '../src/lib/db';

async function main() {
  console.log('🔧 Restructuring schema for complete variant tracking...\n');
  
  // 1. Add variant fields to catalog_signs
  console.log('Adding variant fields to catalog_signs...');
  await db.execute(`
    ALTER TABLE catalog_signs 
    ADD COLUMN variant_code TEXT
  `);
  
  await db.execute(`
    ALTER TABLE catalog_signs 
    ADD COLUMN phonetic_value TEXT
  `);
  
  await db.execute(`
    ALTER TABLE catalog_signs 
    ADD COLUMN base_thompson_number INTEGER
  `);
  
  console.log('✅ catalog_signs updated\n');
  
  // 2. Create index for variant lookups
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_catalog_base_thompson 
    ON catalog_signs(base_thompson_number)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_catalog_variant 
    ON catalog_signs(variant_code)
  `);
  
  console.log('✅ Indexes created\n');
  
  // 3. Document variant code meanings
  await db.execute(`
    CREATE TABLE IF NOT EXISTS variant_code_types (
      code TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      examples TEXT
    )
  `);
  
  const variantTypes = [
    ['st', 'Stylistic variant', '585st bi = Sign 585, stylistic variant, reads "bi"'],
    ['bt', 'Bipartite top - only upper segment rendered', '61bt yu = Sign 61, upper segment, reads "yu"'],
    ['bv', 'Bipartite vertical - vertical segmentation', ''],
    ['bl', 'Bipartite left - only left segment', '229bl a = Sign 229, left segment, reads "a"'],
    ['bh', 'Bipartite horizontal segmentation', '130bh wa = Sign 130, horizontal split'],
    ['br', 'Bipartite right - only right segment', '181br ja = Sign 181, right segment'],
    ['ex', 'Pars pro toto - part stands for whole', '126ex ya = Sign 126, partial representation'],
  ];
  
  for (const [code, desc, example] of variantTypes) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO variant_code_types (code, description, examples) VALUES (?, ?, ?)',
      args: [code, desc, example]
    });
  }
  
  console.log('✅ Variant type documentation added\n');
  console.log('📋 Next steps:');
  console.log('   1. Parse unknown_signs codes into base_number + variant + phonetic');
  console.log('   2. Create new catalog_signs entries with full variant data');
  console.log('   3. Re-import Roboflow instances with proper catalog_sign_id mapping');
}

main().catch(console.error);
