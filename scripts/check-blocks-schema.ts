import { db } from '../src/lib/db';

async function checkBlocksSchema() {
  const result = await db.execute(`
    PRAGMA table_info(blocks);
  `);
  
  console.log('Blocks table columns:');
  result.rows.forEach((row: any) => {
    console.log(`  ${row.name}: ${row.type}`);
  });
}

checkBlocksSchema().catch(console.error);
