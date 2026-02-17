// scripts/import-lmgg-full.ts
// Imports all remaining LMGG data into catalog_signs.
// Adds cmgg_code, pronunciation columns and enriches syllabic_value, english_translation, etc.
// Run with: npx tsx scripts/import-lmgg-full.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CrossrefEntry {
  mhd_code: string;
  twkm_code: string;
  thompson_numbers: string[];
  cmgg_values: string[];
  pronunciation: string;
}

interface ConcordanceMhdEntry {
  twkm_code: string;
  twkm_pronunciation: string | null;
  twkm_translation: string | null;
  mhd_codes: string[];
  mhd_readings: Record<string, string>;
  thompson_numbers: string[];
  cmgg_values: string[];
  cmgg_translation: string | null;
  source_table: string;
}

interface ConcordanceData {
  twkm: ConcordanceMhdEntry[];
  mhd: ConcordanceMhdEntry[];
  cmgg: ConcordanceMhdEntry[];
}

interface CatalogRow {
  id: number;
  graphcode: string | null;
  mhd_code_sub: string | null;
  syllabic_value: string | null;
  pronunciation: string | null;
  english_translation: string | null;
  cmgg_code: string | null;
  kettunen_code: string | null;
}

/**
 * Determines if a pronunciation string looks like a syllabic reading.
 * Syllabic readings are lowercase, short, and don't contain semicolons or uppercase.
 */
function isSyllabicReading(pron: string): boolean {
  if (!pron) return false;
  const trimmed = pron.trim();
  if (trimmed !== trimmed.toLowerCase()) return false;
  if (trimmed.includes(';')) return false;
  if (trimmed.includes('no TWKM')) return false;
  if (trimmed.length === 0 || trimmed.length > 10) return false;
  return /^[a-z']+$/.test(trimmed);
}

/**
 * Execute a batch of statements, chunking into groups of `size` to avoid
 * request-size limits on Turso's HTTP API.
 */
async function batchExec(stmts: { sql: string; args: (string | number)[] }[], size = 50) {
  for (let i = 0; i < stmts.length; i += size) {
    const chunk = stmts.slice(i, i + size);
    await db.batch(chunk, 'write');
  }
}

async function main() {
  console.log('=== LMGG Full Import ===\n');

  // -- Step 0: Add new columns if they don't exist -----------------------
  console.log('Adding columns if needed...');
  for (const col of ['cmgg_code', 'pronunciation']) {
    try {
      await db.execute(`ALTER TABLE catalog_signs ADD COLUMN ${col} TEXT`);
      console.log(`  Added column: ${col}`);
    } catch (err: any) {
      if (err.message?.includes('duplicate column') || err.message?.includes('already exists')) {
        console.log(`  Column ${col} already exists, skipping.`);
      } else {
        throw err;
      }
    }
  }
  console.log();

  // -- Load catalog signs ------------------------------------------------
  const result = await db.execute(
    `SELECT id, graphcode, mhd_code_sub, syllabic_value, pronunciation,
            english_translation, cmgg_code, kettunen_code
     FROM catalog_signs`
  );

  const byGraphcode = new Map<string, CatalogRow>();
  const byMhdCodeSub = new Map<string, CatalogRow>();

  for (const row of result.rows) {
    const entry: CatalogRow = {
      id: row.id as number,
      graphcode: row.graphcode as string | null,
      mhd_code_sub: row.mhd_code_sub as string | null,
      syllabic_value: row.syllabic_value as string | null,
      pronunciation: row.pronunciation as string | null,
      english_translation: row.english_translation as string | null,
      cmgg_code: row.cmgg_code as string | null,
      kettunen_code: row.kettunen_code as string | null,
    };
    if (row.graphcode) byGraphcode.set(String(row.graphcode).toUpperCase(), entry);
    if (row.mhd_code_sub) byMhdCodeSub.set(String(row.mhd_code_sub).toUpperCase(), entry);
  }

  const totalSigns = result.rows.length;
  console.log(`Catalog: ${totalSigns} signs (${byGraphcode.size} with graphcode, ${byMhdCodeSub.size} with mhd_code_sub)\n`);

  // -- Snapshot before counts --------------------------------------------
  const beforeCounts = await getCoverage();
  console.log('BEFORE coverage:');
  printCoverage(beforeCounts);
  console.log();

  // -- Step 1: Process lmgg-crossref.json --------------------------------
  console.log('-- Phase 1: lmgg-crossref.json --\n');
  const crossrefPath = path.join(__dirname, '..', 'data', 'lmgg-crossref.json');
  const crossrefEntries: CrossrefEntry[] = JSON.parse(fs.readFileSync(crossrefPath, 'utf-8'));
  console.log(`Loaded ${crossrefEntries.length} crossref entries`);

  let crossrefMatched = 0;
  let crossrefNoMatch = 0;
  let pronUpdated = 0;
  let syllabicUpdated = 0;
  let cmggUpdated = 0;
  let kettunenUpdated = 0;

  const enrichedIds = new Set<number>();
  let pendingUpdates: { sql: string; args: (string | number)[] }[] = [];

  for (const entry of crossrefEntries) {
    const code = entry.mhd_code.toUpperCase();
    const catalogEntry = byGraphcode.get(code) || byMhdCodeSub.get(code);

    if (!catalogEntry) {
      crossrefNoMatch++;
      continue;
    }

    crossrefMatched++;
    const setClauses: string[] = [];
    const args: (string | number)[] = [];

    // Update pronunciation WHERE currently NULL
    if (!catalogEntry.pronunciation && entry.pronunciation) {
      const cleanPron = entry.pronunciation.replace(/no TWKM pron \/ translation/g, '').trim();
      if (cleanPron) {
        setClauses.push('pronunciation = ?');
        args.push(cleanPron);
        catalogEntry.pronunciation = cleanPron;
        pronUpdated++;
      }
    }

    // Update syllabic_value WHERE currently NULL, using pronunciation if it looks syllabic
    if (!catalogEntry.syllabic_value && entry.pronunciation) {
      const cleanPron = entry.pronunciation.replace(/no TWKM pron \/ translation/g, '').trim();
      if (isSyllabicReading(cleanPron)) {
        setClauses.push('syllabic_value = ?');
        args.push(cleanPron);
        catalogEntry.syllabic_value = cleanPron;
        syllabicUpdated++;
      }
    }

    // Update cmgg_code WHERE currently NULL
    if (!catalogEntry.cmgg_code && entry.cmgg_values.length > 0) {
      const cmggStr = entry.cmgg_values.join('; ');
      setClauses.push('cmgg_code = ?');
      args.push(cmggStr);
      catalogEntry.cmgg_code = cmggStr;
      cmggUpdated++;
    }

    // Update kettunen_code WHERE currently NULL if any CMGG value matches a kettunen-style code
    // Kettunen codes are quoted uppercase abbreviations like "HH3B", "QB", etc.
    if (!catalogEntry.kettunen_code && entry.cmgg_values.length > 0) {
      const kettunenStyle = entry.cmgg_values.filter(v =>
        v.startsWith('"') && v.endsWith('"')
      );
      if (kettunenStyle.length > 0) {
        const kettunenStr = kettunenStyle.map(v => v.slice(1, -1)).join('; ');
        setClauses.push('kettunen_code = ?');
        args.push(kettunenStr);
        catalogEntry.kettunen_code = kettunenStr;
        kettunenUpdated++;
      }
    }

    if (setClauses.length > 0) {
      args.push(catalogEntry.id);
      pendingUpdates.push({
        sql: `UPDATE catalog_signs SET ${setClauses.join(', ')} WHERE id = ?`,
        args,
      });
      enrichedIds.add(catalogEntry.id);
    }
  }

  // Flush Phase 1 updates
  if (pendingUpdates.length > 0) {
    console.log(`  Flushing ${pendingUpdates.length} updates...`);
    await batchExec(pendingUpdates);
    pendingUpdates = [];
  }

  console.log(`  Matched: ${crossrefMatched}/${crossrefEntries.length}`);
  console.log(`  No match: ${crossrefNoMatch}`);
  console.log(`  Pronunciation added: ${pronUpdated}`);
  console.log(`  Syllabic values added: ${syllabicUpdated}`);
  console.log(`  CMGG codes added: ${cmggUpdated}`);
  console.log(`  Kettunen codes added: ${kettunenUpdated}`);
  console.log();

  // -- Step 2: Process lmgg-concordance.json (mhd array) -----------------
  console.log('-- Phase 2: lmgg-concordance.json (mhd array) --\n');
  const concordancePath = path.join(__dirname, '..', 'data', 'lmgg-concordance.json');
  const concordanceData: ConcordanceData = JSON.parse(fs.readFileSync(concordancePath, 'utf-8'));
  const mhdEntries = concordanceData.mhd;
  console.log(`Loaded ${mhdEntries.length} MHD concordance entries`);

  let concordanceMatched = 0;
  let concordanceNoMatch = 0;
  let translationUpdated = 0;
  let pronFromConcordance = 0;
  let syllabicFromConcordance = 0;

  for (const entry of mhdEntries) {
    for (const mhdCode of entry.mhd_codes) {
      const code = mhdCode.toUpperCase();
      const catalogEntry = byGraphcode.get(code) || byMhdCodeSub.get(code);

      if (!catalogEntry) {
        concordanceNoMatch++;
        continue;
      }

      concordanceMatched++;
      const setClauses: string[] = [];
      const args: (string | number)[] = [];

      // Update english_translation WHERE currently NULL
      if (!catalogEntry.english_translation && entry.cmgg_translation) {
        setClauses.push('english_translation = ?');
        args.push(entry.cmgg_translation);
        catalogEntry.english_translation = entry.cmgg_translation;
        translationUpdated++;
      }

      // Update pronunciation WHERE currently NULL
      if (!catalogEntry.pronunciation && entry.twkm_pronunciation) {
        const cleanPron = entry.twkm_pronunciation.replace(/no TWKM pron \/ translation/g, '').trim();
        if (cleanPron) {
          setClauses.push('pronunciation = ?');
          args.push(cleanPron);
          catalogEntry.pronunciation = cleanPron;
          pronFromConcordance++;
        }
      }

      // Update syllabic_value WHERE currently NULL from pronunciation
      if (!catalogEntry.syllabic_value && entry.twkm_pronunciation) {
        const cleanPron = entry.twkm_pronunciation.replace(/no TWKM pron \/ translation/g, '').trim();
        if (isSyllabicReading(cleanPron)) {
          setClauses.push('syllabic_value = ?');
          args.push(cleanPron);
          catalogEntry.syllabic_value = cleanPron;
          syllabicFromConcordance++;
        }
      }

      if (setClauses.length > 0) {
        args.push(catalogEntry.id);
        pendingUpdates.push({
          sql: `UPDATE catalog_signs SET ${setClauses.join(', ')} WHERE id = ?`,
          args,
        });
        enrichedIds.add(catalogEntry.id);
      }
    }
  }

  // Flush Phase 2 updates
  if (pendingUpdates.length > 0) {
    console.log(`  Flushing ${pendingUpdates.length} updates...`);
    await batchExec(pendingUpdates);
    pendingUpdates = [];
  }

  console.log(`  Matched: ${concordanceMatched} code-sign pairs`);
  console.log(`  No match: ${concordanceNoMatch}`);
  console.log(`  Translations added: ${translationUpdated}`);
  console.log(`  Pronunciations added: ${pronFromConcordance}`);
  console.log(`  Syllabic values added: ${syllabicFromConcordance}`);
  console.log();

  // -- Final Report ------------------------------------------------------
  console.log('=== FINAL REPORT ===\n');
  console.log(`Total catalog signs enriched: ${enrichedIds.size}\n`);

  const afterCounts = await getCoverage();
  console.log('AFTER coverage:');
  printCoverage(afterCounts);
  console.log();

  // Before/After comparison
  console.log('BEFORE vs AFTER:');
  const fields = ['syllabic_value', 'pronunciation', 'english_translation', 'cmgg_code', 'kettunen_code'] as const;
  for (const field of fields) {
    const before = beforeCounts[field];
    const after = afterCounts[field];
    const diff = after - before;
    const total = afterCounts.total;
    console.log(
      `  ${field.padEnd(22)} ${String(before).padStart(5)} -> ${String(after).padStart(5)}  (+${diff})  ${Math.round(after / total * 100)}%`
    );
  }
  console.log();
  console.log('Done.');
}

interface CoverageResult {
  total: number;
  syllabic_value: number;
  pronunciation: number;
  english_translation: number;
  cmgg_code: number;
  kettunen_code: number;
}

async function getCoverage(): Promise<CoverageResult> {
  const r = await db.execute(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN syllabic_value IS NOT NULL AND syllabic_value != '' THEN 1 ELSE 0 END) as has_syllabic,
      SUM(CASE WHEN pronunciation IS NOT NULL AND pronunciation != '' THEN 1 ELSE 0 END) as has_pronunciation,
      SUM(CASE WHEN english_translation IS NOT NULL AND english_translation != '' THEN 1 ELSE 0 END) as has_translation,
      SUM(CASE WHEN cmgg_code IS NOT NULL AND cmgg_code != '' THEN 1 ELSE 0 END) as has_cmgg,
      SUM(CASE WHEN kettunen_code IS NOT NULL AND kettunen_code != '' THEN 1 ELSE 0 END) as has_kettunen
    FROM catalog_signs
  `);
  const row = r.rows[0] as Record<string, number>;
  return {
    total: row.total,
    syllabic_value: row.has_syllabic,
    pronunciation: row.has_pronunciation,
    english_translation: row.has_translation,
    cmgg_code: row.has_cmgg,
    kettunen_code: row.has_kettunen,
  };
}

function printCoverage(c: CoverageResult) {
  const pct = (n: number) => Math.round(n / c.total * 100);
  console.log(`  Total signs:          ${c.total}`);
  console.log(`  syllabic_value:       ${c.syllabic_value} (${pct(c.syllabic_value)}%)`);
  console.log(`  pronunciation:        ${c.pronunciation} (${pct(c.pronunciation)}%)`);
  console.log(`  english_translation:  ${c.english_translation} (${pct(c.english_translation)}%)`);
  console.log(`  cmgg_code:            ${c.cmgg_code} (${pct(c.cmgg_code)}%)`);
  console.log(`  kettunen_code:        ${c.kettunen_code} (${pct(c.kettunen_code)}%)`);
}

main().catch(console.error);
