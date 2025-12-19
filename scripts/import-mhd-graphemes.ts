// scripts/import-mhd-graphemes.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/lib/db.ts';

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

async function main() {
  console.log('🚀 Starting Graphemes import...\n');

  const filePath = path.join(__dirname, '..', 'data', 'mhd-graphemes-all.json');
  console.log(`📂 Reading ${filePath}...`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const rows: GraphemeRow[] = JSON.parse(raw);
  console.log(`✅ Loaded ${rows.length.toLocaleString()} graphemes\n`);

  // Load block ID map
  console.log('📋 Loading block IDs...');
  const blockMap = new Map<string, number>();
  const blocks = await db.execute('SELECT id, mhd_block_id FROM blocks');
  for (const row of blocks.rows) {
    blockMap.set(String(row.mhd_block_id), Number(row.id));
  }
  console.log(`✅ Loaded ${blockMap.size.toLocaleString()} block IDs\n`);

  // Load catalog sign ID map (by graphcode)
  console.log('📋 Loading catalog sign IDs...');
  const catalogMap = new Map<string, number>();
  const catalogSigns = await db.execute('SELECT id, mhd_code_sub FROM catalog_signs WHERE mhd_code_sub IS NOT NULL');
  for (const row of catalogSigns.rows) {
    catalogMap.set(String(row.mhd_code_sub), Number(row.id));
  }
  console.log(`✅ Loaded ${catalogMap.size.toLocaleString()} catalog sign IDs\n`);

  console.log('📋 Checking existing graphemes...');
  const existing = await db.execute('SELECT COUNT(*) as count FROM graphemes');
  const existingCount = Number(existing.rows[0]?.count || 0);
  console.log(`   ${existingCount.toLocaleString()} already exist\n`);

  console.log('📋 Inserting graphemes...');
  const startTime = Date.now();
  let processed = 0;
  let skipped = 0;

  const inserts = [];
  
  for (const row of rows) {
    const artifactCode = row.objabbr || 'UNKNOWN';
    const blockId = `${artifactCode}-${row.blsort}`;
    const dbBlockId = blockMap.get(blockId);

    if (!dbBlockId) {
      skipped++;
      continue;
    }

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
        dbBlockId,
        catalogSignId,
        graphemeCode,
        row.grlogosyll && row.grlogosyll !== '_' ? row.grlogosyll : null,
        row.grhyphen && row.grhyphen !== '_' ? row.grhyphen : null,
        row.grmaya && row.grmaya !== '_' ? row.grmaya : null,
        row.grengl && row.grengl !== '_' ? row.grengl : null,
        artifactCode,
        `${artifactCode} ${row.objstralmpg || ''}`
      ]
    });

    if (inserts.length >= 1000) {
      await db.batch(inserts, 'write');
      processed += inserts.length;
      inserts.length = 0;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = elapsed > 0 ? Math.round(processed / elapsed) : processed;
      const remaining = elapsed > 0 ? Math.round((rows.length - processed - skipped) / rate) : 0;
      console.log(`   Inserted ${processed.toLocaleString()}/${rows.length.toLocaleString()} (${Math.round(processed/rows.length*100)}%) | ${rate}/s | ~${Math.floor(remaining/60)}m ${remaining%60}s remaining`);
    }
  }

  if (inserts.length > 0) {
    await db.batch(inserts, 'write');
    processed += inserts.length;
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ Inserted ${processed.toLocaleString()} graphemes (skipped ${skipped.toLocaleString()}) in ${Math.floor(totalTime/60)}m ${totalTime%60}s\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
