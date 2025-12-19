import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function findZB1() {
  // Search for ZB1 in different ways
  console.log('\n1. Exact match on graphcode:');
  const exact = await db.execute({
    sql: 'SELECT id, graphcode, mhd_code, syllabic_value FROM catalog_signs WHERE graphcode = ?',
    args: ['ZB1']
  });
  console.log(exact.rows);

  console.log('\n2. LIKE match on graphcode:');
  const like = await db.execute({
    sql: 'SELECT id, graphcode, mhd_code, syllabic_value FROM catalog_signs WHERE graphcode LIKE ?',
    args: ['%ZB1%']
  });
  console.log(like.rows);

  console.log('\n3. Check if ZB1 exists in graphemes:');
  const inGraphemes = await db.execute(`
    SELECT DISTINCT cs.id, cs.graphcode, COUNT(g.id) as count
    FROM catalog_signs cs
    INNER JOIN graphemes g ON g.catalog_sign_id = cs.id
    WHERE cs.graphcode LIKE '%ZB1%'
    GROUP BY cs.id
    LIMIT 5
  `);
  console.log(inGraphemes.rows);

  console.log('\n4. Top signs with "ZB" in them:');
  const zbSigns = await db.execute(`
    SELECT 
      cs.id,
      cs.graphcode,
      cs.syllabic_value,
      COUNT(DISTINCT g.id) as dated_count
    FROM catalog_signs cs
    INNER JOIN graphemes g ON g.catalog_sign_id = cs.id
    INNER JOIN blocks b ON g.block_id = b.id
    WHERE cs.graphcode LIKE 'ZB%'
      AND b.event_calendar IS NOT NULL
      AND b.event_calendar != '-'
    GROUP BY cs.id
    ORDER BY dated_count DESC
    LIMIT 10
  `);
  console.log(zbSigns.rows);
}

findZB1().catch(console.error);
