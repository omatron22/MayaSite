import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function checkData() {
  // Total graphemes with dates
  const total = await db.execute(`
    SELECT COUNT(*) as count
    FROM graphemes g
    INNER JOIN blocks b ON g.block_id = b.id
    WHERE b.event_long_count IS NOT NULL
      AND b.region IS NOT NULL
  `);
  
  console.log(`Total graphemes with dates: ${total.rows[0].count}\n`);
  
  // Sample data
  const sample = await db.execute(`
    SELECT 
      g.grapheme_code,
      b.event_long_count,
      b.region,
      b.site_name
    FROM graphemes g
    INNER JOIN blocks b ON g.block_id = b.id
    WHERE b.event_long_count IS NOT NULL
      AND b.region IS NOT NULL
    LIMIT 10
  `);
  
  console.log('Sample data:');
  sample.rows.forEach(row => {
    console.log(`${row.grapheme_code} | ${row.event_long_count} | ${row.region} | ${row.site_name}`);
  });
}

checkData().catch(console.error);
