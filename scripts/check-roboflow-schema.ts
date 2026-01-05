import { db } from '../src/lib/db';

async function checkSchema() {
  console.log('Checking roboflow_instances schema...\n');
  
  const result = await db.execute({
    sql: "PRAGMA table_info(roboflow_instances)",
    args: []
  });
  
  console.log('Columns:', result.rows);
  
  // Try to get sample data
  const sample = await db.execute({
    sql: "SELECT * FROM roboflow_instances LIMIT 1",
    args: []
  });
  
  console.log('\nSample row:', sample.rows[0]);
  console.log('\nAll column names:', sample.columns);
}

checkSchema();
