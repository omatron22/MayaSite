import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function extractSites() {
  const artifacts = await db.execute(`
    SELECT DISTINCT artifact_code, COUNT(*) as count
    FROM blocks
    WHERE artifact_code IS NOT NULL AND artifact_code != '' AND artifact_code != '_'
    GROUP BY artifact_code
    ORDER BY count DESC
  `);
  
  // Extract site prefixes (first 3-4 letters before numbers or monument types)
  const siteCounts = new Map<string, number>();
  
  artifacts.rows.forEach(row => {
    const code = String(row.artifact_code);
    // Extract site prefix (letters before St, HS, Pan, T, Mur, Alt, etc.)
    const match = code.match(/^([A-Z]+)/);
    if (match) {
      const site = match[1];
      siteCounts.set(site, (siteCounts.get(site) || 0) + Number(row.count));
    }
  });
  
  // Sort by count
  const sorted = Array.from(siteCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);
  
  console.log('\nTop 100 Archaeological Sites (by block count):');
  console.log('=============================================');
  sorted.forEach(([site, count], i) => {
    console.log(`${String(i + 1).padStart(3)}. ${site.padEnd(10)} ${count.toLocaleString().padStart(8)} blocks`);
  });
  
  console.log(`\n\nTotal unique sites: ${siteCounts.size}`);
  
  // Output as JSON for easy copying
  console.log('\n\nSite codes as array (for mapping):');
  console.log(JSON.stringify(sorted.slice(0, 50).map(([site]) => site), null, 2));
}

extractSites().catch(console.error);
