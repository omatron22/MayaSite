import { db } from '../src/lib/db.ts';

async function check() {
  try {
    const count = await db.execute('SELECT COUNT(*) as count FROM roboflow_instances');
    console.log('✅ Roboflow instances:', count.rows[0].count);
    
    const sample = await db.execute('SELECT * FROM roboflow_instances LIMIT 1');
    console.log('\n📋 Sample record:');
    console.log(sample.rows[0]);
    
    const columns = await db.execute(`
      SELECT name FROM pragma_table_info('roboflow_instances')
    `);
    console.log('\n🔧 Table columns:');
    columns.rows.forEach((row: any) => console.log('  -', row.name));
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

check().catch(console.error);
