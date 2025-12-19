import { createClient } from '@libsql/client';

const db = createClient({
  url: 'https://mayasite-omatron22.aws-us-west-2.turso.io',
  authToken: process.env.TOKEN || '' // You'll pass this via command line
});

async function inspect() {
  console.log('=== DATABASE INSPECTION ===\n');
  
  try {
    // 1. Table counts
    console.log('📊 TABLE COUNTS:');
    const counts = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM catalog_signs'),
      db.execute('SELECT COUNT(*) as count FROM blocks'),
      db.execute('SELECT COUNT(*) as count FROM graphemes'),
      db.execute('SELECT COUNT(*) as count FROM roboflow_instances'),
    ]);
    console.log(`  catalog_signs: ${counts[0].rows[0].count}`);
    console.log(`  blocks: ${counts[1].rows[0].count}`);
    console.log(`  graphemes: ${counts[2].rows[0].count}`);
    console.log(`  roboflow_instances: ${counts[3].rows[0].count}\n`);

    // 2. Sample catalog signs
    console.log('📋 SAMPLE CATALOG SIGNS (first 2):');
    const catalog = await db.execute('SELECT * FROM catalog_signs LIMIT 2');
    console.log(JSON.stringify(catalog.rows, null, 2));
    console.log('\n');

    // 3. Sample blocks  
    console.log('📦 SAMPLE BLOCKS (first 2):');
    const blocks = await db.execute('SELECT * FROM blocks LIMIT 2');
    console.log(JSON.stringify(blocks.rows, null, 2));
    console.log('\n');

    // 4. Sample graphemes
    console.log('✏️ SAMPLE GRAPHEMES (first 2):');
    const graphemes = await db.execute('SELECT * FROM graphemes LIMIT 2');
    console.log(JSON.stringify(graphemes.rows, null, 2));
    console.log('\n');

    // 5. Schema check
    console.log('��️ CATALOG_SIGNS COLUMNS:');
    const schema = await db.execute('PRAGMA table_info(catalog_signs)');
    console.log(schema.rows.map((r: any) => `  ${r.name} (${r.type})`).join('\n'));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

inspect();
