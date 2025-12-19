import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function analyze() {
  // Get unique date types
  const dateTypes = await db.execute(`
    SELECT DISTINCT event_calendar, COUNT(*) as count
    FROM blocks
    WHERE event_calendar IS NOT NULL AND event_calendar != '' AND event_calendar != '-'
    GROUP BY event_calendar
    ORDER BY count DESC
    LIMIT 30
  `);
  
  console.log('Sample date types and frequencies:\n');
  dateTypes.rows.forEach(row => {
    console.log(`${row.count.toString().padStart(6)}x  "${row.event_calendar}"`);
  });
  
  // Check for any parseable dates
  const withLongCount = await db.execute(`
    SELECT COUNT(*) as count
    FROM blocks
    WHERE event_long_count IS NOT NULL AND event_long_count != '-'
  `);
  
  console.log('\n\nBlocks with Long Count dates:', withLongCount.rows[0].count);
  
  // Sample long count dates
  const lcSample = await db.execute(`
    SELECT event_long_count, event_calendar, block_english
    FROM blocks
    WHERE event_long_count IS NOT NULL AND event_long_count != '-'
    LIMIT 10
  `);
  
  console.log('\nSample Long Count dates:');
  lcSample.rows.forEach(row => {
    console.log(`  ${row.event_long_count} - ${row.event_calendar}`);
  });
}

analyze().catch(console.error);
