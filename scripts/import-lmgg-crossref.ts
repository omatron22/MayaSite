// scripts/import-lmgg-crossref.ts
// Merges LMGG concordance cross-references into catalog_signs.
// Updates thompson_code and zender_code where currently missing.
// Run with: npx tsx scripts/import-lmgg-crossref.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LmggEntry {
  mhd_code: string;
  twkm_code: string;
  thompson_numbers: string[];
  cmgg_values: string[];
  pronunciation: string;
}

async function main() {
  console.log('Merging LMGG cross-references into catalog_signs...\n');

  const filePath = path.join(__dirname, '..', 'data', 'lmgg-crossref.json');
  const entries: LmggEntry[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Loaded ${entries.length} LMGG entries\n`);

  // Load current catalog signs indexed by graphcode and mhd_code_sub
  const result = await db.execute(
    'SELECT id, graphcode, mhd_code_sub, thompson_code, zender_code FROM catalog_signs'
  );

  const byGraphcode = new Map<string, { id: number; thompson_code: string | null; zender_code: string | null }>();
  const byMhdCodeSub = new Map<string, { id: number; thompson_code: string | null; zender_code: string | null }>();

  for (const row of result.rows) {
    const entry = {
      id: row.id as number,
      thompson_code: row.thompson_code as string | null,
      zender_code: row.zender_code as string | null,
    };
    if (row.graphcode) byGraphcode.set(String(row.graphcode).toUpperCase(), entry);
    if (row.mhd_code_sub) byMhdCodeSub.set(String(row.mhd_code_sub).toUpperCase(), entry);
  }

  console.log(`Catalog: ${result.rows.length} signs (${byGraphcode.size} with graphcode, ${byMhdCodeSub.size} with mhd_code_sub)\n`);

  let matched = 0;
  let thompsonUpdated = 0;
  let zenderUpdated = 0;
  let noMatch = 0;

  const updates: { sql: string; args: (string | number)[] }[] = [];

  for (const entry of entries) {
    const code = entry.mhd_code.toUpperCase();
    const catalogEntry = byGraphcode.get(code) || byMhdCodeSub.get(code);

    if (!catalogEntry) {
      noMatch++;
      continue;
    }

    matched++;
    const setClauses: string[] = [];
    const args: (string | number)[] = [];

    // Update thompson_code if currently empty and LMGG has data
    if (!catalogEntry.thompson_code && entry.thompson_numbers.length > 0) {
      // Store the primary Thompson number(s), comma-separated
      const thompsonStr = entry.thompson_numbers.slice(0, 5).join(', ');
      setClauses.push('thompson_code = ?');
      args.push(thompsonStr);
      thompsonUpdated++;
    }

    // Update zender_code (Bonn/TWKM) if currently empty and LMGG has a TWKM code
    if (!catalogEntry.zender_code && entry.twkm_code) {
      setClauses.push('zender_code = ?');
      args.push(entry.twkm_code);
      zenderUpdated++;
    }

    if (setClauses.length > 0) {
      args.push(catalogEntry.id);
      updates.push({
        sql: `UPDATE catalog_signs SET ${setClauses.join(', ')} WHERE id = ?`,
        args,
      });
    }

    // Batch execute
    if (updates.length >= 100) {
      await db.batch(updates, 'write');
      updates.length = 0;
    }
  }

  if (updates.length > 0) {
    await db.batch(updates, 'write');
  }

  console.log(`Matched: ${matched}/${entries.length} LMGG entries to catalog signs`);
  console.log(`No match: ${noMatch}`);
  console.log(`Thompson codes added: ${thompsonUpdated}`);
  console.log(`Zender/TWKM codes added: ${zenderUpdated}\n`);

  // Print coverage after merge
  const after = await db.execute(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN thompson_code IS NOT NULL THEN 1 ELSE 0 END) as has_thompson,
      SUM(CASE WHEN zender_code IS NOT NULL THEN 1 ELSE 0 END) as has_zender,
      SUM(CASE WHEN kettunen_code IS NOT NULL THEN 1 ELSE 0 END) as has_kettunen,
      SUM(CASE WHEN gronemeyer_code IS NOT NULL THEN 1 ELSE 0 END) as has_gronemeyer
    FROM catalog_signs
  `);
  const r = after.rows[0] as Record<string, number>;
  console.log('Coverage after merge:');
  console.log(`  Thompson: ${r.has_thompson}/${r.total} (${Math.round(r.has_thompson / r.total * 100)}%)`);
  console.log(`  Zender/Bonn: ${r.has_zender}/${r.total} (${Math.round(r.has_zender / r.total * 100)}%)`);
  console.log(`  Kettunen: ${r.has_kettunen}/${r.total} (${Math.round(r.has_kettunen / r.total * 100)}%)`);
  console.log(`  Gronemeyer: ${r.has_gronemeyer}/${r.total} (${Math.round(r.has_gronemeyer / r.total * 100)}%)`);
}

main().catch(console.error);
