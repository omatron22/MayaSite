import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function identifyUnmapped() {
  const unmapped = await db.execute(`
    SELECT 
      SUBSTR(artifact_code, 1, 
        CASE 
          WHEN INSTR(artifact_code, 'St') > 0 THEN INSTR(artifact_code, 'St') - 1
          WHEN INSTR(artifact_code, 'HS') > 0 THEN INSTR(artifact_code, 'HS') - 1
          WHEN INSTR(artifact_code, 'Pan') > 0 THEN INSTR(artifact_code, 'Pan') - 1
          WHEN INSTR(artifact_code, 'Alt') > 0 THEN INSTR(artifact_code, 'Alt') - 1
          WHEN INSTR(artifact_code, 'T') > 0 AND LENGTH(artifact_code) > 3 THEN INSTR(artifact_code, 'T') - 1
          ELSE LENGTH(artifact_code)
        END
      ) as site_code,
      COUNT(*) as count,
      GROUP_CONCAT(DISTINCT artifact_code) as examples
    FROM blocks
    WHERE region IS NULL 
      AND artifact_code IS NOT NULL 
      AND artifact_code != ''
      AND artifact_code != '_'
    GROUP BY site_code
    ORDER BY count DESC
    LIMIT 100
  `);
  
  console.log('Top 100 unmapped sites:\n');
  unmapped.rows.forEach((row, i) => {
    const examples = String(row.examples).split(',').slice(0, 3).join(', ');
    console.log(`${String(i + 1).padStart(3)}. ${String(row.site_code).padEnd(12)} ${String(row.count).padStart(6)} blocks - Examples: ${examples}`);
  });
}

identifyUnmapped().catch(console.error);
