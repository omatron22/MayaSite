import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function check() {
  // Check graphemes table structure
  const cols = await db.execute(`PRAGMA table_info(graphemes)`);
  console.log('Graphemes columns:');
  cols.rows.forEach(col => console.log(` - ${col.name}`));
  
  // Check how many graphemes have catalog_sign_id
  const linked = await db.execute(`
    SELECT COUNT(*) as count 
    FROM graphemes 
    WHERE catalog_sign_id IS NOT NULL
  `);
  console.log('\nGraphemes with catalog_sign_id:', linked.rows[0].count);
  
  // Get a sample grapheme with its catalog sign
  const sample = await db.execute(`
    SELECT 
      g.id,
      g.grapheme_code,
      g.catalog_sign_id,
      cs.graphcode,
      cs.primary_image_url
    FROM graphemes g
    LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
    WHERE g.catalog_sign_id IS NOT NULL
    LIMIT 3
  `);
  
  console.log('\nSample graphemes with catalog signs:');
  console.log(JSON.stringify(sample.rows, null, 2));
}

check().catch(console.error);
