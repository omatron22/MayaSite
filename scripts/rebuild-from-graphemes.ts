import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const db = createClient({
  url: (process.env.TURSO_DATABASE_URL || '').replace('libsql://', 'https://').trim(),
  authToken: (process.env.TURSO_AUTH_TOKEN || '').trim()
});

async function rebuild() {
  console.log('🔥 REBUILDING FROM GRAPHEMES (COMPLETE SOURCE)...\n');
  
  // Drop and recreate
  console.log('1️⃣  Dropping old tables...');
  await db.execute('DROP TABLE IF EXISTS graphemes');
  await db.execute('DROP TABLE IF EXISTS blocks');
  console.log('✅ Dropped\n');
  
  console.log('2️⃣  Creating fresh tables...');
  await db.execute(`
    CREATE TABLE blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mhd_block_id TEXT NOT NULL UNIQUE,
      artifact_code TEXT NOT NULL,
      surface_page TEXT,
      orientation_frame TEXT,
      coordinate TEXT,
      block_logosyll TEXT,
      block_hyphenated TEXT,
      block_maya1 TEXT,
      block_maya2 TEXT,
      block_english TEXT,
      block_graphcodes TEXT,
      event_calendar TEXT,
      event_long_count TEXT,
      event_260_day TEXT,
      event_365_day TEXT,
      person_code TEXT,
      notes TEXT,
      semantic_context TEXT,
      sort_order INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.execute(`
    CREATE TABLE graphemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_id INTEGER NOT NULL,
      catalog_sign_id INTEGER,
      grapheme_code TEXT NOT NULL,
      grapheme_logosyll TEXT,
      grapheme_hyphenated TEXT,
      grapheme_maya TEXT,
      grapheme_english TEXT,
      artifact_code TEXT,
      FOREIGN KEY (block_id) REFERENCES blocks(id),
      FOREIGN KEY (catalog_sign_id) REFERENCES catalog_signs(id)
    )
  `);
  
  await db.execute('CREATE INDEX idx_blocks_artifact ON blocks(artifact_code)');
  await db.execute('CREATE INDEX idx_blocks_sort ON blocks(sort_order)');
  await db.execute('CREATE INDEX idx_graphemes_code ON graphemes(grapheme_code)');
  await db.execute('CREATE INDEX idx_graphemes_block ON graphemes(block_id)');
  await db.execute('CREATE INDEX idx_graphemes_catalog ON graphemes(catalog_sign_id)');
  await db.execute('CREATE INDEX idx_graphemes_artifact ON graphemes(artifact_code)');
  console.log('✅ Tables created\n');
  
  // Load graphemes (which contains ALL block data)
  console.log('3️⃣  Loading graphemes JSON (complete dataset)...');
  const graphemesPath = join(__dirname, '..', 'data', 'mhd-graphemes-all.json');
  const graphemesData = JSON.parse(fs.readFileSync(graphemesPath, 'utf8'));
  console.log(`   Loaded ${graphemesData.length.toLocaleString()} grapheme entries\n`);
  
  // Extract unique blocks from graphemes
  console.log('4️⃣  Extracting unique blocks from graphemes...');
  const blocksMap = new Map();
  
  for (const g of graphemesData) {
    const blockId = `${g.objabbr || 'UNK'}-${g.blsort}`;
    
    if (!blocksMap.has(blockId)) {
      blocksMap.set(blockId, {
        mhd_block_id: blockId,
        artifact_code: g.objabbr || 'UNKNOWN',
        surface_page: g.objstralmpg || null,
        orientation_frame: g.objorienfr || null,
        coordinate: g.blcoord || null,
        block_logosyll: g.bllogosyll || null,
        block_hyphenated: g.blhyphen || null,
        block_maya1: g.blmaya1 || null,
        block_maya2: g.blmaya2 || null,
        block_english: g.blengl || null,
        block_graphcodes: g.blgraphcodes || null,
        event_calendar: g.blevcal || null,
        event_long_count: g.blevlc || null,
        event_260_day: g.blev260 || null,
        event_365_day: g.blev365 || null,
        person_code: g.pncode || null,
        notes: g.blnotes || null,
        semantic_context: g.blsem || null,
        sort_order: g.blsort
      });
    }
  }
  
  console.log(`   Found ${blocksMap.size.toLocaleString()} unique blocks\n`);
  
  // Import blocks
  console.log('5️⃣  Importing blocks...');
  let imported = 0;
  const batch = [];
  
  for (const block of blocksMap.values()) {
    batch.push({
      sql: `
        INSERT INTO blocks (
          mhd_block_id, artifact_code, surface_page, orientation_frame,
          coordinate, block_logosyll, block_hyphenated, block_maya1, block_maya2,
          block_english, block_graphcodes, event_calendar, event_long_count,
          event_260_day, event_365_day, person_code, notes, semantic_context,
          sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        block.mhd_block_id,
        block.artifact_code,
        block.surface_page,
        block.orientation_frame,
        block.coordinate,
        block.block_logosyll,
        block.block_hyphenated,
        block.block_maya1,
        block.block_maya2,
        block.block_english,
        block.block_graphcodes,
        block.event_calendar,
        block.event_long_count,
        block.event_260_day,
        block.event_365_day,
        block.person_code,
        block.notes,
        block.semantic_context,
        block.sort_order
      ]
    });
    
    if (batch.length >= 500) {
      await db.batch(batch, 'write');
      imported += batch.length;
      batch.length = 0;
      console.log(`   Imported ${imported.toLocaleString()}/${blocksMap.size.toLocaleString()}`);
    }
  }
  
  if (batch.length > 0) {
    await db.batch(batch, 'write');
    imported += batch.length;
  }
  
  console.log(`✅ Imported ${imported.toLocaleString()} blocks\n`);
  
  // Get block IDs for linking
  console.log('6️⃣  Loading block IDs for grapheme linking...');
  const blocksResult = await db.execute('SELECT id, mhd_block_id FROM blocks');
  const blockIdMap = new Map();
  for (const b of blocksResult.rows) {
    blockIdMap.set(String(b.mhd_block_id), Number(b.id));
  }
  console.log(`   Loaded ${blockIdMap.size.toLocaleString()} block IDs\n`);
  
  // Import ALL graphemes
  console.log('7️⃣  Importing all graphemes...');
  let graphemesImported = 0;
  const graphemeBatch = [];
  
  for (const g of graphemesData) {
    const blockId = `${g.objabbr || 'UNK'}-${g.blsort}`;
    const dbBlockId = blockIdMap.get(blockId);
    
    if (!dbBlockId) {
      console.warn(`   ⚠️  Block not found: ${blockId}`);
      continue;
    }
    
    graphemeBatch.push({
      sql: `
        INSERT INTO graphemes (
          block_id, grapheme_code, grapheme_logosyll, grapheme_hyphenated,
          grapheme_maya, grapheme_english, artifact_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        dbBlockId,
        g.grgraphcode || 'UNKNOWN',
        g.grlogosyll || null,
        g.grhyphen || null,
        g.grmaya || null,
        g.grengl || null,
        g.objabbr || 'UNKNOWN'
      ]
    });
    
    if (graphemeBatch.length >= 500) {
      await db.batch(graphemeBatch, 'write');
      graphemesImported += graphemeBatch.length;
      graphemeBatch.length = 0;
      console.log(`   Imported ${graphemesImported.toLocaleString()}/${graphemesData.length.toLocaleString()} graphemes`);
    }
  }
  
  if (graphemeBatch.length > 0) {
    await db.batch(graphemeBatch, 'write');
    graphemesImported += graphemeBatch.length;
  }
  
  console.log(`✅ Imported ${graphemesImported.toLocaleString()} graphemes\n`);
  
  // Link to catalog
  console.log('8️⃣  Linking graphemes to catalog signs...');
  const catalogResult = await db.execute('SELECT id, graphcode FROM catalog_signs WHERE graphcode IS NOT NULL');
  const catalogMap = new Map();
  for (const c of catalogResult.rows) {
    catalogMap.set(String(c.graphcode), Number(c.id));
  }
  
  console.log(`   Found ${catalogMap.size.toLocaleString()} catalog signs with graphcodes`);
  
  let linked = 0;
  const linkBatch = [];
  
  for (const [graphcode, catalogId] of catalogMap.entries()) {
    linkBatch.push({
      sql: 'UPDATE graphemes SET catalog_sign_id = ? WHERE grapheme_code = ? AND catalog_sign_id IS NULL',
      args: [catalogId, graphcode]
    });
    
    if (linkBatch.length >= 100) {
      await db.batch(linkBatch, 'write');
      linked += linkBatch.length;
      linkBatch.length = 0;
    }
  }
  
  if (linkBatch.length > 0) {
    await db.batch(linkBatch, 'write');
  }
  
  console.log(`✅ Processed linking\n`);
  
  // Final stats
  console.log('📊 FINAL STATISTICS:\n');
  const stats = await db.execute(`
    SELECT 
      (SELECT COUNT(*) FROM blocks) as total_blocks,
      (SELECT COUNT(*) FROM graphemes) as total_graphemes,
      (SELECT COUNT(*) FROM graphemes WHERE catalog_sign_id IS NOT NULL) as linked_graphemes,
      (SELECT COUNT(DISTINCT artifact_code) FROM blocks) as unique_artifacts,
      (SELECT COUNT(*) FROM blocks WHERE block_english IS NOT NULL) as blocks_with_english,
      (SELECT COUNT(*) FROM blocks WHERE event_calendar IS NOT NULL) as blocks_with_dates
  `);
  
  const s = stats.rows[0];
  const linkPct = Math.round(Number(s.linked_graphemes)/Number(s.total_graphemes)*100);
  
  console.log(`   Blocks: ${Number(s.total_blocks).toLocaleString()}`);
  console.log(`   Graphemes: ${Number(s.total_graphemes).toLocaleString()}`);
  console.log(`   Linked to catalog: ${Number(s.linked_graphemes).toLocaleString()} (${linkPct}%)`);
  console.log(`   Unique artifacts: ${s.unique_artifacts}`);
  console.log(`   Blocks with English: ${Number(s.blocks_with_english).toLocaleString()}`);
  console.log(`   Blocks with dates: ${Number(s.blocks_with_dates).toLocaleString()}`);
  
  console.log('\n🎉 PERFECT DATABASE REBUILD COMPLETE!\n');
}

rebuild().catch(console.error);
