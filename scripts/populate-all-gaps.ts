// scripts/populate-all-gaps.ts
// Populates all empty columns with available source data.
// Idempotent — safe to re-run (checks for NULL before updating).
// Run with: npx tsx scripts/populate-all-gaps.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

function loadJSON(name: string) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
}

// ── Long Count → Gregorian conversion ──
function longCountToGregorian(lc: string): string | null {
  const parts = lc.split('.').map(Number);
  if (parts.length !== 5 || parts.some(isNaN)) return null;
  const [baktun, katun, tun, uinal, kin] = parts;
  if (baktun > 20 || katun > 19 || tun > 19 || uinal > 17 || kin > 19) return null;
  const totalDays = baktun * 144000 + katun * 7200 + tun * 360 + uinal * 20 + kin;
  const jdn = totalDays + 584283; // GMT correlation constant
  // JDN → Gregorian (Meeus algorithm)
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Image URL extraction (same as import-mhd-blocks.ts) ──
function extractImageUrl(img: unknown): string | null {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (typeof img === 'object') {
    const obj = img as { OrgPubLink?: string; ThumbPubLink?: string };
    return obj.OrgPubLink || obj.ThumbPubLink || null;
  }
  return null;
}

async function main() {
  console.log('Populating all data gaps...\n');

  // ═══════════════════════════════════════════════════
  // Phase 1: event_gregorian from Long Count dates
  // ═══════════════════════════════════════════════════
  console.log('Phase 1: Computing event_gregorian from Long Count dates...');
  const lcRows = await db.execute(`
    SELECT id, event_long_count FROM blocks
    WHERE event_long_count IS NOT NULL AND event_long_count != '-' AND event_long_count != ''
    AND event_gregorian IS NULL
  `);
  let gregUpdated = 0;
  const gregBatch: { sql: string; args: unknown[] }[] = [];
  for (const row of lcRows.rows) {
    const lc = String(row.event_long_count).trim();
    if (!/^\d+\.\d+\.\d+\.\d+\.\d+$/.test(lc)) continue;
    const greg = longCountToGregorian(lc);
    if (!greg) continue;
    gregBatch.push({ sql: `UPDATE blocks SET event_gregorian = ? WHERE id = ?`, args: [greg, row.id] });
    if (gregBatch.length >= 500) {
      await db.batch(gregBatch, 'write');
      gregUpdated += gregBatch.length;
      gregBatch.length = 0;
      process.stdout.write(`  ${gregUpdated.toLocaleString()} blocks updated\r`);
    }
  }
  if (gregBatch.length > 0) {
    await db.batch(gregBatch, 'write');
    gregUpdated += gregBatch.length;
  }
  console.log(`  ${gregUpdated.toLocaleString()} blocks got Gregorian dates`);

  // ═══════════════════════════════════════════════════
  // Phase 2: graphemes.assigned_by = 'MHD'
  // ═══════════════════════════════════════════════════
  console.log('\nPhase 2: Setting graphemes.assigned_by...');
  const assignResult = await db.execute(`UPDATE graphemes SET assigned_by = 'MHD' WHERE assigned_by IS NULL`);
  console.log(`  ${assignResult.rowsAffected} graphemes updated`);

  // ═══════════════════════════════════════════════════
  // Phase 3: graphemes.graph_id via catalog_entries → graphs
  // ═══════════════════════════════════════════════════
  console.log('\nPhase 3: Linking graphemes.graph_id...');
  // Build lookup: legacy_catalog_sign_id → first graph_id
  const graphLookup = await db.execute(`
    SELECT ce.legacy_catalog_sign_id, g.graph_id
    FROM catalog_entries ce
    JOIN graphs g ON g.catalog_entry = ce.entry_id
    WHERE ce.legacy_catalog_sign_id IS NOT NULL
    GROUP BY ce.legacy_catalog_sign_id
  `);
  const signIdToGraph = new Map<number, string>();
  for (const row of graphLookup.rows) {
    signIdToGraph.set(Number(row.legacy_catalog_sign_id), String(row.graph_id));
  }
  console.log(`  ${signIdToGraph.size} catalog signs have graph mappings`);

  // Batch update graphemes
  const graphemeRows = await db.execute(`
    SELECT id, catalog_sign_id FROM graphemes
    WHERE graph_id IS NULL AND catalog_sign_id IS NOT NULL
  `);
  let graphLinked = 0;
  const graphBatch: { sql: string; args: unknown[] }[] = [];
  for (const row of graphemeRows.rows) {
    const gId = signIdToGraph.get(Number(row.catalog_sign_id));
    if (!gId) continue;
    graphBatch.push({ sql: `UPDATE graphemes SET graph_id = ? WHERE id = ?`, args: [gId, row.id] });
    if (graphBatch.length >= 500) {
      await db.batch(graphBatch, 'write');
      graphLinked += graphBatch.length;
      graphBatch.length = 0;
      process.stdout.write(`  ${graphLinked.toLocaleString()} graphemes linked\r`);
    }
  }
  if (graphBatch.length > 0) {
    await db.batch(graphBatch, 'write');
    graphLinked += graphBatch.length;
  }
  console.log(`  ${graphLinked.toLocaleString()} graphemes linked to graphs`);

  // ═══════════════════════════════════════════════════
  // Phase 4: graphs.medium from Bonn materials/artefacts
  // ═══════════════════════════════════════════════════
  console.log('\nPhase 4: Populating graphs.medium from Bonn data...');
  const raw = loadJSON('classicmayan-raw.json');

  // Build material URI → label
  const materialMap = new Map<string, string>();
  for (const m of raw.materials) {
    materialMap.set(m.id, m.label);
  }

  // Build artefact ID → Set<material labels>
  const artefactMaterials = new Map<string, Set<string>>();
  for (const a of raw.artefacts) {
    const mats = new Set<string>();
    for (const mUri of (a.materials || [])) {
      const label = materialMap.get(mUri);
      if (label) mats.add(label);
    }
    if (mats.size > 0) artefactMaterials.set(a.id, mats);
  }

  // Build artefact ID → date range
  const artefactDates = new Map<string, { start: number; end: number }>();
  for (const a of raw.artefacts) {
    if (a.date && a.date.start != null) {
      artefactDates.set(a.id, { start: a.date.start, end: a.date.end ?? a.date.start });
    }
  }

  // For each graph, resolve artefacts → materials
  const graphMediums = new Map<string, string>();
  const graphSignDates = new Map<number, { earliest: number; latest: number }>();

  for (const g of raw.graphs) {
    if (!g.artefacts || g.artefacts.length === 0) continue;
    const graphId = `twkm-graph-${g.graphNo}`;

    // Medium: collect all materials from all artefacts
    const allMats = new Set<string>();
    for (const aId of g.artefacts) {
      const mats = artefactMaterials.get(aId);
      if (mats) mats.forEach(m => allMats.add(m));
    }
    if (allMats.size > 0) {
      graphMediums.set(graphId, [...allMats].sort().join(', '));
    }

    // Attestation dates: collect from artefacts, track per sign
    const signNo = Number(g.graphNo.replace(/[a-z]+$/, ''));
    if (!isNaN(signNo)) {
      for (const aId of g.artefacts) {
        const dates = artefactDates.get(aId);
        if (!dates) continue;
        const existing = graphSignDates.get(signNo) || { earliest: Infinity, latest: -Infinity };
        existing.earliest = Math.min(existing.earliest, dates.start);
        existing.latest = Math.max(existing.latest, dates.end);
        graphSignDates.set(signNo, existing);
      }
    }
  }

  const mediumBatch: { sql: string; args: unknown[] }[] = [];
  for (const [graphId, medium] of graphMediums) {
    mediumBatch.push({ sql: `UPDATE graphs SET medium = ? WHERE graph_id = ? AND medium IS NULL`, args: [medium, graphId] });
  }
  if (mediumBatch.length > 0) {
    for (let i = 0; i < mediumBatch.length; i += 500) {
      await db.batch(mediumBatch.slice(i, i + 500), 'write');
    }
  }
  console.log(`  ${mediumBatch.length} graphs got medium values`);

  // ═══════════════════════════════════════════════════
  // Phase 5: graphs.occurrence_count + translation, catalog_entries attestation dates
  // ═══════════════════════════════════════════════════
  console.log('\nPhase 5: Populating graphs.occurrence_count, translation, attestation dates...');

  // Graph translations from raw
  const graphTranslations = new Map<string, string>();
  for (const g of raw.graphs) {
    if (g.translation) {
      graphTranslations.set(`twkm-graph-${g.graphNo}`, g.translation);
    }
  }

  // Graph occurrence counts from signs.json
  const signs = loadJSON('classicmayan-signs.json');
  const graphOccurrences = new Map<string, number>();
  for (const sign of signs) {
    for (const g of (sign.graphs || [])) {
      if (g.occurrence_count != null) {
        graphOccurrences.set(`twkm-graph-${g.graph_code}`, g.occurrence_count);
      }
    }
  }

  const gUpdateBatch: { sql: string; args: unknown[] }[] = [];
  const allGraphIds = new Set([...graphTranslations.keys(), ...graphOccurrences.keys()]);
  for (const gId of allGraphIds) {
    const trans = graphTranslations.get(gId) || null;
    const occ = graphOccurrences.get(gId) ?? null;
    gUpdateBatch.push({
      sql: `UPDATE graphs SET
        occurrence_count = COALESCE(occurrence_count, ?),
        translation = COALESCE(translation, ?)
      WHERE graph_id = ?`,
      args: [occ, trans, gId]
    });
  }
  for (let i = 0; i < gUpdateBatch.length; i += 500) {
    await db.batch(gUpdateBatch.slice(i, i + 500), 'write');
  }
  console.log(`  ${graphOccurrences.size} graphs got occurrence counts`);
  console.log(`  ${graphTranslations.size} graphs got translations`);

  // Attestation dates on catalog_entries
  const dateBatch: { sql: string; args: unknown[] }[] = [];
  for (const [signNo, dates] of graphSignDates) {
    if (dates.earliest === Infinity) continue;
    dateBatch.push({
      sql: `UPDATE catalog_entries SET
        earliest_attestation = COALESCE(earliest_attestation, ?),
        latest_attestation = COALESCE(latest_attestation, ?)
      WHERE entry_id = ?`,
      args: [dates.earliest, dates.latest, `twkm-${signNo}`]
    });
  }
  if (dateBatch.length > 0) {
    for (let i = 0; i < dateBatch.length; i += 500) {
      await db.batch(dateBatch.slice(i, i + 500), 'write');
    }
  }
  console.log(`  ${dateBatch.length} catalog entries got attestation dates`);

  // ═══════════════════════════════════════════════════
  // Phase 6: blocks — frame_image_url, substitution, evidence
  // ═══════════════════════════════════════════════════
  console.log('\nPhase 6: Populating blocks frame_image_url, substitution, evidence...');
  const blocksData = loadJSON('mhd-blocks-all.json');

  // Build mhd_block_id → source row lookup for fields we need
  type SourceBlock = {
    objabbr: string; blsort: number;
    imgfr?: unknown; substitution?: string; evidence?: string;
  };
  const sourceByBlockId = new Map<string, SourceBlock>();
  for (const row of blocksData as SourceBlock[]) {
    const blockId = `${row.objabbr || 'UNK'}-${row.blsort}`;
    if (row.imgfr || row.substitution || row.evidence) {
      sourceByBlockId.set(blockId, row);
    }
  }
  console.log(`  ${sourceByBlockId.size} source blocks have data to import`);

  // Get DB block IDs that need updating
  const dbBlocks = await db.execute(`
    SELECT id, mhd_block_id FROM blocks
    WHERE frame_image_url IS NULL OR substitution IS NULL OR evidence IS NULL
  `);

  let blockUpdated = 0;
  const blockBatch: { sql: string; args: unknown[] }[] = [];
  for (const row of dbBlocks.rows) {
    const src = sourceByBlockId.get(String(row.mhd_block_id));
    if (!src) continue;

    const frameUrl = extractImageUrl(src.imgfr);
    const sub = src.substitution || null;
    const ev = src.evidence || null;
    if (!frameUrl && !sub && !ev) continue;

    blockBatch.push({
      sql: `UPDATE blocks SET
        frame_image_url = COALESCE(frame_image_url, ?),
        substitution = COALESCE(substitution, ?),
        evidence = COALESCE(evidence, ?)
      WHERE id = ?`,
      args: [frameUrl, sub, ev, row.id]
    });

    if (blockBatch.length >= 500) {
      await db.batch(blockBatch, 'write');
      blockUpdated += blockBatch.length;
      blockBatch.length = 0;
      process.stdout.write(`  ${blockUpdated.toLocaleString()} blocks updated\r`);
    }
  }
  if (blockBatch.length > 0) {
    await db.batch(blockBatch, 'write');
    blockUpdated += blockBatch.length;
  }
  console.log(`  ${blockUpdated.toLocaleString()} blocks updated with frame images/substitution/evidence`);

  // ═══════════════════════════════════════════════════
  // Phase 7: catalog_entries.decipherment_criteria from Bonn
  // ═══════════════════════════════════════════════════
  console.log('\nPhase 7: Populating decipherment_criteria...');
  const critBatch: { sql: string; args: unknown[] }[] = [];
  for (const dc of raw.decipherments) {
    if (!dc.confCriteria || dc.confCriteria.length === 0) continue;
    critBatch.push({
      sql: `UPDATE catalog_entries SET decipherment_criteria = ? WHERE entry_id = ? AND decipherment_criteria IS NULL`,
      args: [JSON.stringify(dc.confCriteria), `twkm-${dc.signNo}`]
    });
  }
  for (let i = 0; i < critBatch.length; i += 500) {
    await db.batch(critBatch.slice(i, i + 500), 'write');
  }
  console.log(`  ${critBatch.length} entries got decipherment criteria`);

  // ═══════════════════════════════════════════════════
  // Phase 8: LMGG translations + MHD readings
  // ═══════════════════════════════════════════════════
  console.log('\nPhase 8: LMGG twkm_translation and mhd_readings...');
  const lmgg = loadJSON('lmgg-concordance.json');

  // TWKM translations
  const twkmTransBatch: { sql: string; args: unknown[] }[] = [];
  for (const entry of (lmgg.twkm || [])) {
    if (!entry.twkm_translation) continue;
    twkmTransBatch.push({
      sql: `UPDATE catalog_entries SET gloss_english = ? WHERE catalog = 'TWKM' AND catalog_code = ? AND (gloss_english IS NULL OR gloss_english = '')`,
      args: [entry.twkm_translation, entry.twkm_code]
    });
  }
  for (let i = 0; i < twkmTransBatch.length; i += 500) {
    await db.batch(twkmTransBatch.slice(i, i + 500), 'write');
  }
  console.log(`  ${twkmTransBatch.length} TWKM entries checked for translation enrichment`);

  // MHD readings enrichment
  const mhdReadingsBatch: { sql: string; args: unknown[] }[] = [];
  for (const entry of (lmgg.twkm || [])) {
    if (!entry.mhd_readings || Object.keys(entry.mhd_readings).length === 0) continue;
    for (const [mhdCode, reading] of Object.entries(entry.mhd_readings)) {
      if (!reading) continue;
      // Try to match on catalog_code (which is mhd_code_sub from catalog_signs)
      mhdReadingsBatch.push({
        sql: `UPDATE catalog_entries SET reading_value = ? WHERE catalog = 'MHD' AND catalog_code = ? AND (reading_value IS NULL OR reading_value = '')`,
        args: [reading as string, mhdCode]
      });
    }
  }
  for (let i = 0; i < mhdReadingsBatch.length; i += 500) {
    await db.batch(mhdReadingsBatch.slice(i, i + 500), 'write');
  }
  console.log(`  ${mhdReadingsBatch.length} MHD entries checked for reading enrichment`);

  // ═══════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════
  console.log('\n═══ All gaps populated! ═══');
  console.log('Run verification queries to confirm:');
  console.log('  SELECT COUNT(*) FROM blocks WHERE event_gregorian IS NOT NULL;');
  console.log('  SELECT COUNT(*) FROM graphemes WHERE assigned_by IS NOT NULL;');
  console.log('  SELECT COUNT(*) FROM graphemes WHERE graph_id IS NOT NULL;');
  console.log('  SELECT COUNT(*) FROM graphs WHERE medium IS NOT NULL;');
  console.log('  SELECT COUNT(*) FROM graphs WHERE occurrence_count IS NOT NULL;');
  console.log('  SELECT COUNT(*) FROM blocks WHERE frame_image_url IS NOT NULL;');
  console.log('  SELECT COUNT(*) FROM catalog_entries WHERE decipherment_criteria IS NOT NULL;');
  console.log('  SELECT COUNT(*) FROM catalog_entries WHERE earliest_attestation IS NOT NULL;');
}

main().catch(console.error);
