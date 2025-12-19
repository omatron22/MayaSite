import { db } from '../src/lib/db.ts';

async function main() {
  const result = await db.execute(`
    SELECT DISTINCT event_calendar 
    FROM blocks 
    WHERE event_calendar IS NOT NULL 
      AND event_calendar != '-'
      AND event_calendar != ''
    LIMIT 50
  `);
  
  console.log('Sample date formats in your database:\n');
  result.rows.forEach((row: any, i: number) => {
    console.log(`${i+1}. ${row.event_calendar}`);
  });
}

main().catch(console.error);
