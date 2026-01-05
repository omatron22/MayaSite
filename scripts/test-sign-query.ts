import { db } from '../src/lib/db';

async function testQuery() {
  console.log('Testing sign queries...');
  
  // Get first sign
  const result = await db.execute({
    sql: 'SELECT id, graphcode, mhd_code FROM catalog_signs LIMIT 5',
    args: []
  });
  
  console.log('First 5 signs:', result.rows);
  
  if (result.rows.length > 0) {
    const firstId = result.rows[0].id;
    console.log('\nTesting query for ID:', firstId);
    
    const signResult = await db.execute({
      sql: 'SELECT * FROM catalog_signs WHERE id = ?',
      args: [firstId]
    });
    
    console.log('Result:', signResult.rows);
  }
}

testQuery();
