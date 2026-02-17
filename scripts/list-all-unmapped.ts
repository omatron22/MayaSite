import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  const r = await db.execute(`
    SELECT DISTINCT substr(artifact_code, 1, 3) as prefix, COUNT(*) as cnt
    FROM blocks 
    WHERE (site_name IS NULL OR site_name = '') 
      AND artifact_code IS NOT NULL AND artifact_code != ''
    GROUP BY prefix
    ORDER BY cnt DESC
  `);

  console.log('prefix | count | samples');
  console.log('-------|-------|--------');
  for (const row of r.rows) {
    const samples = await db.execute(`
      SELECT DISTINCT artifact_code FROM blocks 
      WHERE artifact_code LIKE '${row.prefix}%' 
        AND (site_name IS NULL OR site_name = '')
      LIMIT 5
    `);
    const codes = samples.rows.map(s => s.artifact_code).join(', ');
    console.log(`${row.prefix} | ${row.cnt} | ${codes}`);
  }
  
  console.log(`\nTotal unmapped prefixes: ${r.rows.length}`);
  console.log(`Total unmapped blocks: ${r.rows.reduce((sum, row) => sum + Number(row.cnt), 0)}`);
}

main().catch(console.error);
