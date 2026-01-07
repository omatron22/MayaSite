import { db } from '../src/lib/db';

async function checkCatalogSignsSchema() {
  const result = await db.execute(`
    PRAGMA table_info(catalog_signs);
  `);
  
  console.log('Catalog_signs table columns:');
  result.rows.forEach((row: any) => {
    console.log(`  ${row.name}: ${row.type}`);
  });
}

checkCatalogSignsSchema().catch(console.error);
