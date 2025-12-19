import { db } from '../src/lib/db.ts';

async function main() {
  console.log('Checking date fields in blocks table:\n');
  
  // Check event_long_count
  const lc = await db.execute(`
    SELECT event_long_count 
    FROM blocks 
    WHERE event_long_count IS NOT NULL 
      AND event_long_count != '-'
      AND event_long_count != ''
    LIMIT 20
  `);
  console.log('=== event_long_count samples ===');
  lc.rows.forEach((row: any, i: number) => {
    console.log(`${i+1}. ${row.event_long_count}`);
  });
  
  // Check event_260_day
  console.log('\n=== event_260_day samples ===');
  const e260 = await db.execute(`
    SELECT event_260_day 
    FROM blocks 
    WHERE event_260_day IS NOT NULL 
      AND event_260_day != ''
    LIMIT 20
  `);
  e260.rows.forEach((row: any, i: number) => {
    console.log(`${i+1}. ${row.event_260_day}`);
  });
  
  // Check event_365_day
  console.log('\n=== event_365_day samples ===');
  const e365 = await db.execute(`
    SELECT event_365_day 
    FROM blocks 
    WHERE event_365_day IS NOT NULL 
      AND event_365_day != ''
    LIMIT 20
  `);
  e365.rows.forEach((row: any, i: number) => {
    console.log(`${i+1}. ${row.event_365_day}`);
  });
  
  // Check which blocks have actual numeric dates
  console.log('\n=== Blocks with Long Count dates ===');
  const withDates = await db.execute(`
    SELECT 
      artifact_code,
      event_calendar,
      event_long_count,
      event_260_day,
      event_365_day,
      region,
      site_name
    FROM blocks 
    WHERE event_long_count LIKE '%.%.%'
    LIMIT 10
  `);
  console.log(JSON.stringify(withDates.rows, null, 2));
}

main().catch(console.error);
