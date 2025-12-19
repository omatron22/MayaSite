import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function analyze() {
  // Get top artifact codes from blocks
  const blockArtifacts = await db.execute(`
    SELECT artifact_code, COUNT(*) as count
    FROM blocks
    WHERE artifact_code IS NOT NULL AND artifact_code != ''
    GROUP BY artifact_code
    ORDER BY count DESC
    LIMIT 50
  `);
  
  console.log('\nTop 50 Artifact Codes (from blocks):');
  console.log('====================================');
  blockArtifacts.rows.forEach(row => {
    console.log(`${String(row.artifact_code).padEnd(15)} ${row.count}`);
  });
  
  const total = await db.execute(`
    SELECT COUNT(DISTINCT artifact_code) as count
    FROM blocks
    WHERE artifact_code IS NOT NULL AND artifact_code != ''
  `);
  console.log(`\nTotal unique artifact codes: ${total.rows[0].count}`);
  
  // Check if we have any location data already
  const sample = await db.execute(`
    SELECT artifact_code, block_maya1, event_calendar
    FROM blocks
    WHERE artifact_code IS NOT NULL
    LIMIT 5
  `);
  
  console.log('\nSample blocks with artifacts:');
  sample.rows.forEach(row => {
    console.log(`${row.artifact_code}: ${row.block_maya1?.toString().substring(0, 40) || 'no text'}... (${row.event_calendar || 'no date'})`);
  });
}

analyze().catch(console.error);
