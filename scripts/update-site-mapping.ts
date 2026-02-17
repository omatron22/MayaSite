// scripts/update-site-mapping.ts
// Re-applies site mapping to all blocks using the improved prefix matching.
// Run with: npx tsx scripts/update-site-mapping.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';
import { getSiteFromArtifactCode } from '../src/lib/sites.ts';

async function main() {
  console.log('Updating site mapping for all blocks...\n');

  // Get distinct artifact codes
  const result = await db.execute('SELECT DISTINCT artifact_code FROM blocks');
  const codes = result.rows.map(r => r.artifact_code as string);
  console.log(`Found ${codes.length} distinct artifact codes\n`);

  let mapped = 0;
  let unmapped = 0;
  const updates: { sql: string; args: (string | number | null)[] }[] = [];
  const unmappedCodes = new Map<string, number>();

  for (const code of codes) {
    const site = getSiteFromArtifactCode(code);
    if (site) {
      mapped++;
      updates.push({
        sql: 'UPDATE blocks SET site_name = ?, region = ? WHERE artifact_code = ?',
        args: [site.name, site.region, code],
      });
    } else {
      unmapped++;
      unmappedCodes.set(code, (unmappedCodes.get(code) || 0) + 1);
    }

    if (updates.length >= 50) {
      await db.batch(updates, 'write');
      updates.length = 0;
    }
  }

  if (updates.length > 0) {
    await db.batch(updates, 'write');
  }

  console.log(`Mapped: ${mapped} artifact codes to sites`);
  console.log(`Unmapped: ${unmapped} artifact codes\n`);

  // Show coverage after update
  const stats = await db.execute(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN site_name IS NOT NULL AND site_name != '' THEN 1 ELSE 0 END) as with_site,
      SUM(CASE WHEN region IS NOT NULL AND region != '' THEN 1 ELSE 0 END) as with_region
    FROM blocks
  `);
  const r = stats.rows[0] as Record<string, number>;
  console.log(`Block coverage: ${r.with_site}/${r.total} (${Math.round(r.with_site / r.total * 100)}%) have site`);
  console.log(`Region coverage: ${r.with_region}/${r.total} (${Math.round(r.with_region / r.total * 100)}%) have region\n`);

  // Show remaining unmapped (top 30)
  if (unmappedCodes.size > 0) {
    // Get block counts for unmapped codes
    const unmappedResult = await db.execute(`
      SELECT artifact_code, COUNT(*) as cnt
      FROM blocks
      WHERE site_name IS NULL OR site_name = ''
      GROUP BY artifact_code
      ORDER BY cnt DESC
      LIMIT 30
    `);
    console.log(`Top remaining unmapped artifact codes:`);
    for (const row of unmappedResult.rows) {
      console.log(`  ${(row.artifact_code as string).padEnd(20)} ${String(row.cnt).padStart(6)} blocks`);
    }
  }
}

main().catch(console.error);
