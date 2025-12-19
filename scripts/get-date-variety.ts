import { db } from '../src/lib/db.ts';

async function main() {
  console.log('Getting variety of Long Count dates:\n');
  
  const result = await db.execute(`
    SELECT DISTINCT 
      event_long_count,
      COUNT(*) as count
    FROM blocks 
    WHERE event_long_count IS NOT NULL 
      AND event_long_count != '-'
      AND event_long_count != ''
      AND event_long_count LIKE '%.%.%'
    GROUP BY event_long_count
    ORDER BY event_long_count
    LIMIT 50
  `);
  
  result.rows.forEach((row: any) => {
    console.log(`${row.event_long_count} (${row.count} instances)`);
  });
  
  console.log(`\nTotal unique dates: ${result.rows.length}`);
}

main().catch(console.error);
