import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function checkSignsWithDates() {
  // Find signs that have graphemes with dates
  const signsWithDates = await db.execute(`
    SELECT 
      cs.id,
      cs.graphcode,
      cs.syllabic_value,
      cs.english_translation,
      COUNT(DISTINCT g.id) as dated_instances
    FROM catalog_signs cs
    INNER JOIN graphemes g ON g.catalog_sign_id = cs.id
    INNER JOIN blocks b ON g.block_id = b.id
    WHERE b.event_calendar IS NOT NULL
      AND b.region IS NOT NULL
    GROUP BY cs.id, cs.graphcode, cs.syllabic_value, cs.english_translation
    ORDER BY dated_instances DESC
    LIMIT 20
  `);
  
  console.log('Top 20 signs with dated instances:\n');
  signsWithDates.rows.forEach((row, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${String(row.graphcode).padEnd(12)} ${String(row.syllabic_value || '').padEnd(8)} ${String(row.dated_instances).padStart(6)} instances - "${row.english_translation || ''}"`);
  });
}

checkSignsWithDates().catch(console.error);
