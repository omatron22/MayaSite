import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function count(sql: string) {
  const r = await db.execute(sql);
  return Number(r.rows[0]?.count ?? r.rows[0]?.[Object.keys(r.rows[0])[0]] ?? 0);
}

async function query(sql: string) {
  const r = await db.execute(sql);
  return r.rows;
}

async function safeCount(sql: string): Promise<number | null> {
  try {
    return await count(sql);
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== TABLE COUNTS ===');
  const tables = ['catalog_signs', 'blocks', 'graphemes', 'roboflow_instances', 'kerr_vessels', 'cmhi_images'];
  for (const t of tables) {
    try {
      const c = await count(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`  ${t}: ${c}`);
    } catch { console.log(`  ${t}: TABLE NOT FOUND`); }
  }

  // Show actual schema for each table
  console.log('\n=== TABLE SCHEMAS ===');
  for (const t of tables) {
    try {
      const cols = await query(`PRAGMA table_info(${t})`);
      console.log(`  ${t}: ${cols.map(c => c.name).join(', ')}`);
    } catch { /* skip */ }
  }

  console.log('\n=== CATALOG SIGNS FIELD COVERAGE (of 2765) ===');
  const signFields = [
    'mhd_code', 'graphcode', 'mhd_code_sub', 'mhd_code_2003',
    'thompson_code', 'thompson_variant', 'zender_code', 'kettunen_code', 'gronemeyer_code',
    'syllabic_value', 'logographic_value', 'logographic_cvc',
    'english_translation', 'word_class', 'sign_technique', 'distribution',
    'picture_description', 'primary_image_url'
  ];
  for (const f of signFields) {
    const total = await safeCount(`SELECT COUNT(*) as count FROM catalog_signs WHERE ${f} IS NOT NULL AND ${f} != ''`);
    if (total === null) {
      console.log(`  ${f}: COLUMN NOT FOUND`);
    } else {
      const pct = ((total / 2765) * 100).toFixed(1);
      console.log(`  ${f}: ${total}/2765 (${pct}%)`);
    }
  }

  console.log('\n=== BLOCKS FIELD COVERAGE ===');
  const totalBlocks = await count(`SELECT COUNT(*) as count FROM blocks`);
  const blockFields = [
    'block_id', 'artifact_code', 'transcription_1', 'block_english',
    'event_calendar', 'event_long_count', 'surface_page',
    'block_img', 'region', 'site_name'
  ];
  for (const f of blockFields) {
    const total = await safeCount(`SELECT COUNT(*) as count FROM blocks WHERE ${f} IS NOT NULL AND ${f} != ''`);
    if (total === null) {
      console.log(`  ${f}: COLUMN NOT FOUND`);
    } else {
      const pct = ((total / totalBlocks) * 100).toFixed(1);
      console.log(`  ${f}: ${total}/${totalBlocks} (${pct}%)`);
    }
  }

  console.log('\n=== GRAPHEMES FIELD COVERAGE ===');
  const totalGraphemes = await count(`SELECT COUNT(*) as count FROM graphemes`);
  const graphemeFields = [
    'block_id', 'catalog_sign_id', 'grapheme_code',
    'grapheme_logosyll', 'grapheme_hyphenated',
    'grapheme_maya', 'grapheme_english'
  ];
  for (const f of graphemeFields) {
    const total = await safeCount(`SELECT COUNT(*) as count FROM graphemes WHERE ${f} IS NOT NULL AND ${f} != ''`);
    if (total === null) {
      console.log(`  ${f}: COLUMN NOT FOUND`);
    } else {
      const pct = ((total / totalGraphemes) * 100).toFixed(1);
      console.log(`  ${f}: ${total}/${totalGraphemes} (${pct}%)`);
    }
  }

  console.log('\n=== SITE MAPPING GAPS ===');
  const unmapped = await count(`SELECT COUNT(*) as count FROM blocks WHERE (site_name IS NULL OR site_name = '') AND artifact_code IS NOT NULL AND artifact_code != ''`);
  console.log(`  Blocks with artifact_code but no site_name: ${unmapped}`);
  
  const unmappedCodes = await query(`SELECT DISTINCT substr(artifact_code, 1, 3) as prefix, COUNT(*) as count FROM blocks WHERE (site_name IS NULL OR site_name = '') AND artifact_code IS NOT NULL AND artifact_code != '' GROUP BY prefix ORDER BY count DESC LIMIT 30`);
  console.log('  Top unmapped prefixes:');
  for (const r of unmappedCodes) {
    console.log(`    ${r.prefix}: ${r.count} blocks`);
  }

  console.log('\n=== CROSS-REFERENCE COVERAGE ===');
  const anyCode = await count(`SELECT COUNT(*) as count FROM catalog_signs WHERE (thompson_code IS NOT NULL AND thompson_code != '') OR (zender_code IS NOT NULL AND zender_code != '') OR (kettunen_code IS NOT NULL AND kettunen_code != '') OR (gronemeyer_code IS NOT NULL AND gronemeyer_code != '')`);
  console.log(`  Signs with any cross-ref code: ${anyCode}/2765`);
  
  const noCrossRef = await count(`SELECT COUNT(*) as count FROM catalog_signs WHERE (thompson_code IS NULL OR thompson_code = '') AND (zender_code IS NULL OR zender_code = '') AND (kettunen_code IS NULL OR kettunen_code = '') AND (gronemeyer_code IS NULL OR gronemeyer_code = '')`);
  console.log(`  Signs with NO cross-ref code: ${noCrossRef}/2765`);

  console.log('\n=== IMAGE COVERAGE ===');
  const signsWithImg = await safeCount(`SELECT COUNT(*) as count FROM catalog_signs WHERE primary_image_url IS NOT NULL AND primary_image_url != ''`);
  console.log(`  Catalog signs with image: ${signsWithImg ?? 'COLUMN NOT FOUND'}/2765`);
  
  const blocksWithImg = await safeCount(`SELECT COUNT(*) as count FROM blocks WHERE block_img IS NOT NULL AND block_img != ''`);
  console.log(`  Blocks with image: ${blocksWithImg ?? 'COLUMN NOT FOUND'}/${totalBlocks}`);

  console.log('\n=== GRAPHEME-TO-CATALOG LINKAGE ===');
  const linked = await count(`SELECT COUNT(*) as count FROM graphemes WHERE catalog_sign_id IS NOT NULL`);
  console.log(`  Graphemes linked to catalog: ${linked}/${totalGraphemes} (${((linked/totalGraphemes)*100).toFixed(1)}%)`);
  
  const distinctGraphCodes = await count(`SELECT COUNT(DISTINCT grapheme_code) as count FROM graphemes`);
  console.log(`  Distinct grapheme codes: ${distinctGraphCodes}`);
  
  const linkedCodes = await count(`SELECT COUNT(DISTINCT grapheme_code) as count FROM graphemes WHERE catalog_sign_id IS NOT NULL`);
  const unlinkedCodes = await count(`SELECT COUNT(DISTINCT grapheme_code) as count FROM graphemes WHERE catalog_sign_id IS NULL`);
  console.log(`  Distinct codes linked: ${linkedCodes}`);
  console.log(`  Distinct codes unlinked: ${unlinkedCodes}`);

  console.log('\n=== DATES/TEMPORAL COVERAGE ===');
  const withCalendar = await safeCount(`SELECT COUNT(*) as count FROM blocks WHERE event_calendar IS NOT NULL AND event_calendar != ''`);
  const withLongCount = await safeCount(`SELECT COUNT(*) as count FROM blocks WHERE event_long_count IS NOT NULL AND event_long_count != ''`);
  console.log(`  Blocks with calendar date: ${withCalendar ?? 'COLUMN NOT FOUND'}/${totalBlocks}`);
  console.log(`  Blocks with long count: ${withLongCount ?? 'COLUMN NOT FOUND'}/${totalBlocks}`);

  console.log('\n=== TRANSLATION COVERAGE ===');
  const blocksTrans = await safeCount(`SELECT COUNT(*) as count FROM blocks WHERE block_english IS NOT NULL AND block_english != ''`);
  const blocksMaya = await safeCount(`SELECT COUNT(*) as count FROM blocks WHERE transcription_1 IS NOT NULL AND transcription_1 != ''`);
  console.log(`  Blocks with English translation: ${blocksTrans ?? 'COLUMN NOT FOUND'}/${totalBlocks}`);
  console.log(`  Blocks with transcription_1: ${blocksMaya ?? 'COLUMN NOT FOUND'}/${totalBlocks}`);
  
  const graphTrans = await safeCount(`SELECT COUNT(*) as count FROM graphemes WHERE grapheme_english IS NOT NULL AND grapheme_english != ''`);
  const graphMaya = await safeCount(`SELECT COUNT(*) as count FROM graphemes WHERE grapheme_maya IS NOT NULL AND grapheme_maya != ''`);
  console.log(`  Graphemes with English: ${graphTrans ?? 'COLUMN NOT FOUND'}/${totalGraphemes}`);
  console.log(`  Graphemes with Maya: ${graphMaya ?? 'COLUMN NOT FOUND'}/${totalGraphemes}`);

  console.log('\n=== ROBOFLOW COVERAGE ===');
  try {
    const totalRF = await count(`SELECT COUNT(*) as count FROM roboflow_instances`);
    const rfWithBbox = await safeCount(`SELECT COUNT(*) as count FROM roboflow_instances WHERE bbox_x IS NOT NULL`);
    const rfWithImg = await safeCount(`SELECT COUNT(*) as count FROM roboflow_instances WHERE image_url IS NOT NULL AND image_url != ''`);
    const distinctRFClasses = await safeCount(`SELECT COUNT(DISTINCT class_label) as count FROM roboflow_instances`);
    console.log(`  Total instances: ${totalRF}`);
    console.log(`  With bounding box: ${rfWithBbox ?? 'COLUMN NOT FOUND'}`);
    console.log(`  With image URL: ${rfWithImg ?? 'COLUMN NOT FOUND'}`);
    console.log(`  Distinct class labels: ${distinctRFClasses ?? 'COLUMN NOT FOUND'}`);
    
    const rfLinked = await safeCount(`SELECT COUNT(*) as count FROM roboflow_instances WHERE catalog_sign_id IS NOT NULL`);
    console.log(`  Linked to catalog sign: ${rfLinked ?? 'COLUMN NOT FOUND'}/${totalRF}`);
  } catch { console.log('  TABLE NOT FOUND'); }

  console.log('\n=== KERR VESSELS ===');
  try {
    const totalK = await count(`SELECT COUNT(*) as count FROM kerr_vessels`);
    console.log(`  Total vessels: ${totalK}`);
    
    // Show actual columns
    const kerrCols = await query(`PRAGMA table_info(kerr_vessels)`);
    console.log(`  Columns: ${kerrCols.map(c => c.name).join(', ')}`);
    
    // Try common field names
    for (const f of ['description', 'image_url', 'still_url', 'kerr_number', 'vessel_type', 'provenience', 'site_name']) {
      const v = await safeCount(`SELECT COUNT(*) as count FROM kerr_vessels WHERE ${f} IS NOT NULL AND ${f} != ''`);
      if (v !== null) {
        console.log(`  ${f}: ${v}/${totalK} (${((v/totalK)*100).toFixed(1)}%)`);
      }
    }
  } catch { console.log('  TABLE NOT FOUND'); }

  console.log('\n=== CMHI IMAGES ===');
  try {
    const totalC = await count(`SELECT COUNT(*) as count FROM cmhi_images`);
    console.log(`  Total images: ${totalC}`);
    
    // Show actual columns
    const cmhiCols = await query(`PRAGMA table_info(cmhi_images)`);
    console.log(`  Columns: ${cmhiCols.map(c => c.name).join(', ')}`);
    
    const cDrawings = await safeCount(`SELECT COUNT(*) as count FROM cmhi_images WHERE image_type = 'drawing'`);
    const cPhotos = await safeCount(`SELECT COUNT(*) as count FROM cmhi_images WHERE image_type = 'photo'`);
    const cOther = await safeCount(`SELECT COUNT(*) as count FROM cmhi_images WHERE image_type NOT IN ('drawing', 'photo')`);
    const cSites = await safeCount(`SELECT COUNT(DISTINCT site_code) as count FROM cmhi_images`);
    if (cDrawings !== null) console.log(`  Drawings: ${cDrawings}`);
    if (cPhotos !== null) console.log(`  Photos: ${cPhotos}`);
    if (cOther !== null) console.log(`  Other types: ${cOther}`);
    if (cSites !== null) console.log(`  Sites covered: ${cSites}`);
    
    // Try other common field names for coverage
    for (const f of ['image_url', 'artifact_code', 'monument_name', 'site_code', 'site_name', 'image_type']) {
      const v = await safeCount(`SELECT COUNT(*) as count FROM cmhi_images WHERE ${f} IS NOT NULL AND ${f} != ''`);
      if (v !== null) {
        console.log(`  ${f}: ${v}/${totalC} (${((v/totalC)*100).toFixed(1)}%)`);
      }
    }
  } catch { console.log('  TABLE NOT FOUND'); }

  console.log('\n=== LMGG DATA ON DISK (not in DB) ===');
  const fs = await import('fs');
  try {
    const lmggFiles = fs.readdirSync('/Users/omaresp/Desktop/Projects/MayaSite/data').filter((f: string) => f.includes('lmgg'));
    console.log(`  LMGG files found: ${lmggFiles.join(', ') || 'none'}`);
    for (const file of lmggFiles) {
      const data = JSON.parse(fs.readFileSync(`/Users/omaresp/Desktop/Projects/MayaSite/data/${file}`, 'utf-8'));
      if (Array.isArray(data)) {
        console.log(`  ${file}: ${data.length} entries`);
        if (data.length > 0) {
          console.log(`    Fields: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    }
  } catch (e) { console.log(`  Error: ${e}`); }

  console.log('\n=== DATA FILES ON DISK ===');
  const fs2 = await import('fs');
  try {
    const dataFiles = fs2.readdirSync('/Users/omaresp/Desktop/Projects/MayaSite/data');
    for (const file of dataFiles) {
      const stat = fs2.statSync(`/Users/omaresp/Desktop/Projects/MayaSite/data/${file}`);
      console.log(`  ${file}: ${(stat.size / 1024).toFixed(1)} KB`);
    }
  } catch (e) { console.log(`  Error reading data directory: ${e}`); }
}

main().catch(console.error);
