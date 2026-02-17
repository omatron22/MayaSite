import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // Get ALL unmapped artifact codes grouped by prefix (first 2-4 chars)
  const r = await db.execute(`
    SELECT artifact_code, COUNT(*) as cnt
    FROM blocks 
    WHERE (site_name IS NULL OR site_name = '') 
      AND artifact_code IS NOT NULL AND artifact_code != ''
    GROUP BY artifact_code
    ORDER BY cnt DESC
    LIMIT 100
  `);
  
  console.log('=== TOP UNMAPPED ARTIFACT CODES (full codes) ===');
  for (const row of r.rows) {
    console.log(`  ${row.artifact_code}: ${row.cnt} blocks`);
  }
  
  // Get ALL unique unmapped prefixes (3 chars)
  const r2 = await db.execute(`
    SELECT DISTINCT substr(artifact_code, 1, 3) as prefix, COUNT(*) as cnt
    FROM blocks 
    WHERE (site_name IS NULL OR site_name = '') 
      AND artifact_code IS NOT NULL AND artifact_code != ''
    GROUP BY prefix
    ORDER BY cnt DESC
  `);
  
  console.log('\n=== ALL UNMAPPED 3-CHAR PREFIXES ===');
  for (const row of r2.rows) {
    console.log(`  ${row.prefix}: ${row.cnt} blocks`);
  }

  // Also get some example full artifact codes for each prefix to help identify the site
  console.log('\n=== SAMPLE CODES PER UNMAPPED PREFIX ===');
  for (const row of r2.rows) {
    const samples = await db.execute(`
      SELECT DISTINCT artifact_code FROM blocks 
      WHERE artifact_code LIKE '${row.prefix}%' 
        AND (site_name IS NULL OR site_name = '')
      LIMIT 5
    `);
    const codes = samples.rows.map(s => s.artifact_code).join(', ');
    console.log(`  ${row.prefix} (${row.cnt}): ${codes}`);
  }
  
  // Total unmapped
  const total = await db.execute(`SELECT COUNT(*) as count FROM blocks WHERE (site_name IS NULL OR site_name = '') AND artifact_code IS NOT NULL`);
  console.log(`\nTotal unmapped blocks: ${total.rows[0].count}`);
  
  // Check what already-mapped prefixes exist
  const mapped = await db.execute(`
    SELECT DISTINCT substr(artifact_code, 1, 3) as prefix, site_name, COUNT(*) as cnt
    FROM blocks 
    WHERE site_name IS NOT NULL AND site_name != ''
    GROUP BY prefix, site_name
    ORDER BY cnt DESC
    LIMIT 50
  `);
  console.log('\n=== TOP MAPPED PREFIXES (for reference) ===');
  for (const row of mapped.rows) {
    console.log(`  ${row.prefix} → ${row.site_name}: ${row.cnt} blocks`);
  }
}

main().catch(console.error);
