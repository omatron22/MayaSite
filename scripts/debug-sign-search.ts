import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function debugSearch() {
  // Try searching for ZB1
  console.log('Searching for ZB1:');
  const result1 = await db.execute({
    sql: `SELECT * FROM catalog_signs WHERE graphcode = ? OR syllabic_value = ? OR mhd_code = ?`,
    args: ['ZB1', 'ZB1', 'ZB1']
  });
  console.log('Found:', result1.rows.length, 'results');
  if (result1.rows.length > 0) {
    console.log('Sign ID:', result1.rows[0].id);
    
    // Check graphemes for this sign
    const graphemes = await db.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM graphemes g
        INNER JOIN blocks b ON g.block_id = b.id
        WHERE g.catalog_sign_id = ?
          AND b.event_calendar IS NOT NULL
          AND b.event_calendar != '-'
      `,
      args: [result1.rows[0].id]
    });
    console.log('Graphemes with dates:', graphemes.rows[0].count);
  }
  
  // Show actual graphcode values
  console.log('\nSample graphcodes from top signs:');
  const topSigns = await db.execute(`
    SELECT DISTINCT cs.graphcode
    FROM catalog_signs cs
    INNER JOIN graphemes g ON g.catalog_sign_id = cs.id
    INNER JOIN blocks b ON g.block_id = b.id
    WHERE b.event_calendar IS NOT NULL
    LIMIT 10
  `);
  topSigns.rows.forEach(row => console.log(row.graphcode));
}

debugSearch().catch(console.error);
