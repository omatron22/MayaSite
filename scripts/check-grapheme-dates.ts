import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function checkDates() {
  // Check how many graphemes have dates via blocks
  const withDates = await db.execute(`
    SELECT COUNT(*) as count
    FROM graphemes g
    INNER JOIN blocks b ON g.block_id = b.id
    WHERE b.event_calendar IS NOT NULL AND b.event_calendar != ''
  `);
  
  console.log(`Graphemes with dates: ${Number(withDates.rows[0].count).toLocaleString()}`);
  
  // Sample graphemes with dates and regions
  const sample = await db.execute(`
    SELECT 
      g.grapheme_code,
      b.event_calendar,
      b.region,
      b.site_name,
      b.artifact_code,
      cs.mhd_code_sub,
      cs.primary_image_url
    FROM graphemes g
    INNER JOIN blocks b ON g.block_id = b.id
    LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
    WHERE b.event_calendar IS NOT NULL 
      AND b.event_calendar != ''
      AND cs.primary_image_url IS NOT NULL
    LIMIT 20
  `);
  
  console.log('\nSample graphemes with dates + images:');
  console.log('=====================================');
  sample.rows.forEach(row => {
    console.log(`${row.mhd_code_sub || row.grapheme_code} | ${row.event_calendar} | ${row.region || 'Unknown'} | ${row.site_name || row.artifact_code}`);
  });
}

checkDates().catch(console.error);
