import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function check() {
  const dates = await db.execute(`
    SELECT 
      mhd_block_id,
      artifact_code,
      event_calendar,
      block_english
    FROM blocks 
    WHERE event_calendar IS NOT NULL AND event_calendar != ''
    ORDER BY RANDOM()
    LIMIT 10
  `);
  
  console.log('Sample blocks with calendar dates:\n');
  dates.rows.forEach(row => {
    console.log(`${row.mhd_block_id} (${row.artifact_code})`);
    console.log(`  Date: ${row.event_calendar}`);
    console.log(`  Text: ${row.block_english}`);
    console.log();
  });
}

check().catch(console.error);
