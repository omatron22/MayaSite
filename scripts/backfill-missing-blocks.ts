// Creates minimal block records for graphemes that don't have blocks
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('�� Finding missing blocks...\n');
  
  const graphemes = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/mhd-graphemes-all.json'), 'utf8'));
  
  // Get existing blocks
  const existing = await db.execute('SELECT mhd_block_id FROM blocks');
  const existingIds = new Set(existing.rows.map(r => String(r.mhd_block_id)));
  
  // Find unique missing block IDs
  const missingBlocks = new Map();
  for (const g of graphemes) {
    const artifactCode = g.objabbr || 'UNKNOWN';
    const blockId = `${artifactCode}-${g.blsort}`;
    
    if (!existingIds.has(blockId) && !missingBlocks.has(blockId)) {
      missingBlocks.set(blockId, {
        mhd_block_id: blockId,
        artifact_code: artifactCode,
        sort_order: g.blsort,
        surface_page: g.objstralmpg || null,
        orientation_frame: g.objorienfr || null
      });
    }
  }
  
  console.log(`Found ${missingBlocks.size.toLocaleString()} missing blocks\n`);
  
  if (missingBlocks.size === 0) {
    console.log('✅ No missing blocks!\n');
    return;
  }
  
  console.log('📋 Inserting placeholder blocks...');
  const startTime = Date.now();
  let processed = 0;
  
  const inserts = [];
  for (const block of missingBlocks.values()) {
    inserts.push({
      sql: `
        INSERT INTO blocks (
          mhd_block_id, artifact_code, surface_page, orientation_frame, sort_order
        ) VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        block.mhd_block_id,
        block.artifact_code,
        block.surface_page,
        block.orientation_frame,
        block.sort_order
      ]
    });
    
    if (inserts.length >= 500) {
      await db.batch(inserts, 'write');
      processed += inserts.length;
      inserts.length = 0;
      console.log(`   Inserted ${processed.toLocaleString()}/${missingBlocks.size.toLocaleString()}`);
    }
  }
  
  if (inserts.length > 0) {
    await db.batch(inserts, 'write');
    processed += inserts.length;
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ Inserted ${processed.toLocaleString()} placeholder blocks in ${totalTime}s\n`);
}

main().catch(console.error);
