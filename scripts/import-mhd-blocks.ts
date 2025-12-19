// scripts/import-mhd-blocks.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type BlockRow = {
  objabbr: string;
  objstralmpg: string;
  blsort: number;
  bltag: string;
  objorienfr: string;
  blcoord: string;
  bllogosyll: string;
  blhyphen: string;
  blmaya1: string;
  blmaya2: string;
  blengl: string;
  blgraphcodes: string;
  blevcal: string;
  blevlc: string;
  blev260: string;
  blev365: string;
  pncode: string;
  blnotes: string;
  blsem: string;
  blsurfpgfr: string;
  imgfr: string | null;
  blimage1: string | null;
  blimage2: string | null;
  blimagenotes: string | null;
};

async function main() {
  console.log('🚀 Starting Blocks import...\n');

  const filePath = path.join(__dirname, '..', 'data', 'mhd-blocks-all.json');
  console.log(`📂 Reading ${filePath}...`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const rows: BlockRow[] = JSON.parse(raw);
  console.log(`✅ Loaded ${rows.length.toLocaleString()} blocks\n`);

  console.log('📋 Checking existing blocks...');
  const existing = await db.execute('SELECT mhd_block_id FROM blocks');
  const existingIds = new Set(existing.rows.map(r => String(r.mhd_block_id)));
  const newRows = rows.filter(r => {
    const blockId = `${r.objabbr || 'UNK'}-${r.blsort}`;
    return !existingIds.has(blockId);
  });
  console.log(`   ${existingIds.size.toLocaleString()} already exist, ${newRows.length.toLocaleString()} to create\n`);

  if (newRows.length === 0) {
    console.log('✅ All blocks already imported!\n');
    return;
  }

  console.log('📋 Inserting blocks...');
  const startTime = Date.now();
  let processed = 0;

  const inserts = [];
  
  for (const row of newRows) {
    const artifactCode = row.objabbr || 'UNKNOWN';
    const blockId = `${artifactCode}-${row.blsort}`;
    
    inserts.push({
      sql: `
        INSERT INTO blocks (
          mhd_block_id, artifact_code, surface_page, orientation_frame, coordinate,
          block_logosyll, block_hyphenated, block_maya1, block_maya2, block_english,
          block_graphcodes, event_calendar, event_long_count, event_260_day, event_365_day,
          person_code, scribe, semantic_context, notes,
          block_image1_url, block_image2_url, image_notes, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        blockId,
        artifactCode,
        row.objstralmpg || null,
        row.objorienfr || null,
        row.blcoord || null,
        row.bllogosyll && row.bllogosyll !== '_' ? row.bllogosyll : null,
        row.blhyphen && row.blhyphen !== '_' ? row.blhyphen : null,
        row.blmaya1 && row.blmaya1 !== '_' ? row.blmaya1 : null,
        row.blmaya2 && row.blmaya2 !== '_' ? row.blmaya2 : null,
        row.blengl && row.blengl !== '_' ? row.blengl : null,
        row.blgraphcodes || null,
        row.blevcal || null,
        row.blevlc || null,
        row.blev260 || null,
        row.blev365 || null,
        row.pncode || null,
        null,  // scribe - extract from blnotes if needed
        row.blsem || null,
        row.blnotes || null,
        row.blimage1 || null,
        row.blimage2 || null,
        row.blimagenotes || null,
        row.blsort
      ]
    });

    if (inserts.length >= 500) {
      await db.batch(inserts, 'write');
      processed += inserts.length;
      inserts.length = 0;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = elapsed > 0 ? Math.round(processed / elapsed) : processed;
      const remaining = elapsed > 0 ? Math.round((newRows.length - processed) / rate) : 0;
      console.log(`   Inserted ${processed.toLocaleString()}/${newRows.length.toLocaleString()} (${Math.round(processed/newRows.length*100)}%) | ${rate}/s | ~${Math.floor(remaining/60)}m ${remaining%60}s remaining`);
    }
  }

  if (inserts.length > 0) {
    await db.batch(inserts, 'write');
    processed += inserts.length;
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ Inserted ${processed.toLocaleString()} blocks in ${Math.floor(totalTime/60)}m ${totalTime%60}s\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
