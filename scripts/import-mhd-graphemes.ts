// scripts/import-mhd-graphemes.ts
// Imports MHD grapheme data with CORRECT block assignment using blsort ranges.
// A grapheme belongs to the block with the highest blsort <= grapheme's blsort.
// Run with: npx tsx scripts/import-mhd-graphemes.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type GraphemeRow = {
  objabbr: string;
  objstralmpg: string;
  blsort: number;
  objorienfr: string;
  grlogosyll: string;
  grhyphen: string;
  grmaya: string;
  grengl: string;
  grgraphcode: string;
};

interface BlockEntry {
  dbId: number;
  sortOrder: number;
}

// Binary search: find block with highest sortOrder <= target
function findParentBlock(blocks: BlockEntry[], targetSort: number): number | null {
  let lo = 0;
  let hi = blocks.length - 1;
  let result: number | null = null;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (blocks[mid].sortOrder <= targetSort) {
      result = blocks[mid].dbId;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return result;
}

async function main() {
  console.log('Starting Graphemes import...\n');

  const filePath = path.join(__dirname, '..', 'data', 'mhd-graphemes-all.json');
  console.log(`Reading ${filePath}...`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const rows: GraphemeRow[] = JSON.parse(raw);
  console.log(`Loaded ${rows.length.toLocaleString()} graphemes\n`);

  // Load all blocks grouped by artifact code, sorted by sort_order
  console.log('Loading blocks from database...');
  const blockRows = await db.execute('SELECT id, artifact_code, sort_order FROM blocks ORDER BY artifact_code, sort_order');

  const blocksByArtifact = new Map<string, BlockEntry[]>();
  for (const row of blockRows.rows) {
    const code = row.artifact_code as string;
    if (!blocksByArtifact.has(code)) blocksByArtifact.set(code, []);
    blocksByArtifact.get(code)!.push({
      dbId: row.id as number,
      sortOrder: row.sort_order as number,
    });
  }
  console.log(`Loaded ${blockRows.rows.length.toLocaleString()} blocks across ${blocksByArtifact.size.toLocaleString()} artifacts\n`);

  // Load catalog sign map (by graphcode/mhd_code_sub)
  console.log('Loading catalog sign IDs...');
  const catalogMap = new Map<string, number>();
  const catalogSigns = await db.execute(
    'SELECT id, mhd_code_sub, graphcode FROM catalog_signs'
  );
  for (const row of catalogSigns.rows) {
    if (row.mhd_code_sub) catalogMap.set(String(row.mhd_code_sub), Number(row.id));
    if (row.graphcode) catalogMap.set(String(row.graphcode), Number(row.id));
  }
  console.log(`Loaded ${catalogMap.size.toLocaleString()} catalog sign mappings\n`);

  // Check existing count
  console.log('Checking existing graphemes...');
  const existing = await db.execute('SELECT COUNT(*) as count FROM graphemes');
  const existingCount = Number(existing.rows[0]?.count || 0);
  if (existingCount > 0) {
    console.log(`  ${existingCount.toLocaleString()} already exist. Clearing table for clean reimport...`);
    await db.execute('DELETE FROM graphemes');
    console.log('  Cleared.\n');
  }

  console.log('Inserting graphemes...');
  const startTime = Date.now();
  let processed = 0;
  let matched = 0;
  let skipped = 0;

  const inserts = [];

  for (const row of rows) {
    const artifactCode = row.objabbr || 'UNKNOWN';
    const artifactBlocks = blocksByArtifact.get(artifactCode);

    if (!artifactBlocks || artifactBlocks.length === 0) {
      skipped++;
      continue;
    }

    const parentBlockId = findParentBlock(artifactBlocks, row.blsort);
    if (!parentBlockId) {
      skipped++;
      continue;
    }

    matched++;

    const graphemeCode = row.grgraphcode || 'UNKNOWN';
    const catalogSignId = catalogMap.get(graphemeCode) || null;

    inserts.push({
      sql: `
        INSERT INTO graphemes (
          block_id, catalog_sign_id, grapheme_code,
          grapheme_logosyll, grapheme_hyphenated, grapheme_maya, grapheme_english,
          artifact_code, location_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        parentBlockId,
        catalogSignId,
        graphemeCode,
        row.grlogosyll && row.grlogosyll !== '_' ? row.grlogosyll : null,
        row.grhyphen && row.grhyphen !== '_' ? row.grhyphen : null,
        row.grmaya && row.grmaya !== '_' ? row.grmaya : null,
        row.grengl && row.grengl !== '_' ? row.grengl : null,
        artifactCode,
        `${artifactCode} ${row.objstralmpg || ''}`.trim(),
      ]
    });

    if (inserts.length >= 1000) {
      await db.batch(inserts, 'write');
      processed += inserts.length;
      inserts.length = 0;

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = elapsed > 0 ? Math.round(processed / elapsed) : processed;
      console.log(`  Inserted ${processed.toLocaleString()}/${rows.length.toLocaleString()} (${Math.round(processed / rows.length * 100)}%) | ${rate}/s`);
    }
  }

  if (inserts.length > 0) {
    await db.batch(inserts, 'write');
    processed += inserts.length;
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nInserted ${processed.toLocaleString()} graphemes in ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);
  console.log(`  Matched to blocks: ${matched.toLocaleString()} (${Math.round(matched / rows.length * 100)}%)`);
  console.log(`  Skipped (no parent block): ${skipped.toLocaleString()}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
