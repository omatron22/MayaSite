import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function checkPatterns() {
  // Sample unmapped artifact codes
  const sample = await db.execute(`
    SELECT DISTINCT artifact_code
    FROM blocks
    WHERE region IS NULL
      AND artifact_code IS NOT NULL
      AND artifact_code != ''
    LIMIT 200
  `);
  
  console.log('Sample unmapped artifact codes:\n');
  sample.rows.slice(0, 50).forEach((row, i) => {
    console.log(`${String(i + 1).padStart(3)}. ${row.artifact_code}`);
  });
  
  // Check what percentage are just "UNKNOWN"
  const unknown = await db.execute(`
    SELECT COUNT(*) as count
    FROM blocks
    WHERE artifact_code = 'UNKNOWN'
  `);
  
  const total = await db.execute(`
    SELECT COUNT(*) as count
    FROM blocks
    WHERE region IS NULL
  `);
  
  console.log(`\n\nArtifact code = "UNKNOWN": ${Number(unknown.rows[0].count).toLocaleString()}`);
  console.log(`Total unmapped: ${Number(total.rows[0].count).toLocaleString()}`);
  console.log(`Percentage that are UNKNOWN: ${(Number(unknown.rows[0].count) / Number(total.rows[0].count) * 100).toFixed(1)}%`);
}

checkPatterns().catch(console.error);
