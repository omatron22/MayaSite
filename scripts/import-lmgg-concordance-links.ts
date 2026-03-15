// scripts/import-lmgg-concordance-links.ts
// Ingests mayaglyphs.org (LMGG) concordance data into the new concordance tables.
// Creates CMGG catalog_entries and concordance_links for MHD↔TWKM↔Thompson↔CMGG.
// The LMGG data provides the ≈ distinction implicitly: same TWKM code = exact,
// different TWKM codes sharing Thompson = approximate.
// Run with: npx tsx scripts/import-lmgg-concordance-links.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LmggConcordanceEntry {
  twkm_code: string | null;
  twkm_pronunciation: string | null;
  twkm_translation: string | null;
  mhd_codes: string[];
  mhd_readings: Record<string, string>;
  thompson_numbers: string[];
  cmgg_values: string[];
  cmgg_translation: string | null;
  source_table: 'twkm' | 'mhd' | 'cmgg';
}

async function main() {
  console.log('Importing LMGG concordance links (mayaglyphs.org)...\n');

  // Check existing
  const existingLinks = await db.execute(
    `SELECT COUNT(*) as count FROM concordance_links WHERE asserted_by = 'mayaglyphs.org'`
  );
  if (Number(existingLinks.rows[0].count) > 0) {
    console.log(`Already have ${existingLinks.rows[0].count} mayaglyphs.org links. Skipping.`);
    console.log('To re-run: DELETE FROM concordance_links WHERE asserted_by = \'mayaglyphs.org\'');
    return;
  }

  const filePath = path.join(__dirname, '..', 'data', 'lmgg-concordance.json');
  const data: { twkm: LmggConcordanceEntry[]; mhd: LmggConcordanceEntry[]; cmgg: LmggConcordanceEntry[] } =
    JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const allEntries = [...data.twkm, ...data.mhd, ...data.cmgg];
  console.log(`Loaded ${allEntries.length} LMGG entries (${data.twkm.length} twkm, ${data.mhd.length} mhd, ${data.cmgg.length} cmgg)\n`);

  // Load existing catalog_entries for lookups
  const existingResult = await db.execute(`SELECT entry_id, catalog, catalog_code FROM catalog_entries`);
  const existingEntries = new Set<string>();
  const entryByCode = new Map<string, string>(); // "catalog:code" → entry_id
  for (const row of existingResult.rows) {
    existingEntries.add(String(row.entry_id));
    entryByCode.set(`${row.catalog}:${row.catalog_code}`, String(row.entry_id));
  }

  // Build MHD graphcode/mhd_code_sub → entry_id lookup
  const mhdLookup = await db.execute(`
    SELECT ce.entry_id, cs.graphcode, cs.mhd_code_sub, cs.mhd_code
    FROM catalog_entries ce
    JOIN catalog_signs cs ON ce.legacy_catalog_sign_id = cs.id
    WHERE ce.catalog = 'MHD'
  `);
  const mhdCodeToEntry = new Map<string, string>();
  for (const row of mhdLookup.rows) {
    if (row.graphcode) mhdCodeToEntry.set(String(row.graphcode).toUpperCase(), String(row.entry_id));
    if (row.mhd_code_sub) mhdCodeToEntry.set(String(row.mhd_code_sub).toUpperCase(), String(row.entry_id));
    if (row.mhd_code) mhdCodeToEntry.set(String(row.mhd_code).toUpperCase(), String(row.entry_id));
  }

  // Build TWKM code → entry_id lookup
  const twkmCodeToEntry = new Map<string, string>();
  for (const [key, entryId] of entryByCode.entries()) {
    if (key.startsWith('TWKM:')) {
      twkmCodeToEntry.set(key.replace('TWKM:', ''), entryId);
    }
  }

  console.log(`Existing entries: ${existingEntries.size}`);
  console.log(`MHD lookup: ${mhdCodeToEntry.size}, TWKM lookup: ${twkmCodeToEntry.size}\n`);

  const BATCH_SIZE = 100;
  let entryInserts: { sql: string; args: (string | number | null)[] }[] = [];
  let linkInserts: { sql: string; args: (string | number | null)[] }[] = [];
  let cmggEntriesCreated = 0;
  let linksCreated = 0;
  const linkPairs = new Set<string>();

  // Load existing link pairs to avoid duplicates
  const existingPairs = await db.execute(`SELECT entry_a, entry_b FROM concordance_links`);
  for (const row of existingPairs.rows) {
    const pair = [String(row.entry_a), String(row.entry_b)].sort().join('|');
    linkPairs.add(pair);
  }

  function getOrCreateEntry(catalog: string, code: string, reading?: string | null): string | null {
    // Try existing lookup
    const existing = entryByCode.get(`${catalog}:${code}`);
    if (existing) return existing;

    const entryId = `${catalog.toLowerCase()}-${code}`;
    if (existingEntries.has(entryId)) return entryId;

    // Create new entry
    entryInserts.push({
      sql: `INSERT INTO catalog_entries (entry_id, catalog, catalog_code, reading_value, source_url)
            VALUES (?, ?, ?, ?, 'https://mayaglyphs.org')`,
      args: [entryId, catalog, code, reading || null],
    });
    existingEntries.add(entryId);
    entryByCode.set(`${catalog}:${code}`, entryId);
    return entryId;
  }

  function createLink(entryA: string, entryB: string, correspondence: string) {
    const pair = [entryA, entryB].sort().join('|');
    if (linkPairs.has(pair)) return;
    linkPairs.add(pair);

    const linkId = `lmgg-${entryA}-${entryB}`.substring(0, 200);
    linkInserts.push({
      sql: `INSERT INTO concordance_links (link_id, entry_a, entry_b, correspondence, asserted_by)
            VALUES (?, ?, ?, ?, 'mayaglyphs.org')`,
      args: [linkId, entryA, entryB, correspondence],
    });
    linksCreated++;
  }

  for (const entry of allEntries) {
    // Resolve TWKM entry
    let twkmEntryId: string | null = null;
    if (entry.twkm_code) {
      twkmEntryId = twkmCodeToEntry.get(entry.twkm_code) || null;
      if (!twkmEntryId) {
        twkmEntryId = getOrCreateEntry('TWKM', entry.twkm_code, entry.twkm_pronunciation);
        if (twkmEntryId) twkmCodeToEntry.set(entry.twkm_code, twkmEntryId);
      }
    }

    // Resolve MHD entries and link to TWKM
    for (const mhdCode of entry.mhd_codes) {
      const mhdEntryId = mhdCodeToEntry.get(mhdCode.toUpperCase());
      if (mhdEntryId && twkmEntryId) {
        createLink(mhdEntryId, twkmEntryId, 'exact');
      }
    }

    // Create CMGG entries and link to TWKM/MHD
    for (const cmggVal of entry.cmgg_values) {
      const cmggEntryId = getOrCreateEntry('CMGG', cmggVal, cmggVal);
      if (!cmggEntryId) continue;
      cmggEntriesCreated++;

      if (twkmEntryId) {
        createLink(twkmEntryId, cmggEntryId, 'approximate');
      }
      for (const mhdCode of entry.mhd_codes) {
        const mhdEntryId = mhdCodeToEntry.get(mhdCode.toUpperCase());
        if (mhdEntryId) {
          createLink(mhdEntryId, cmggEntryId, 'approximate');
        }
      }
    }

    // Create Thompson entries and link to TWKM/MHD
    for (const tNum of entry.thompson_numbers) {
      // Thompson entries may already exist from classicmayan import
      const tCode = tNum.replace(/^T/, '');
      let thompEntryId = entryByCode.get(`Thompson:${tCode}`) || entryByCode.get(`Thompson:${tNum}`);
      if (!thompEntryId) {
        // Check with lowercase catalog prefix
        thompEntryId = existingEntries.has(`thompson-${tCode}`) ? `thompson-${tCode}` : null;
      }
      if (!thompEntryId) {
        thompEntryId = getOrCreateEntry('Thompson', tCode);
      }
      if (!thompEntryId) continue;

      if (twkmEntryId) {
        createLink(twkmEntryId, thompEntryId, 'approximate');
      }
      for (const mhdCode of entry.mhd_codes) {
        const mhdEntryId = mhdCodeToEntry.get(mhdCode.toUpperCase());
        if (mhdEntryId) {
          createLink(mhdEntryId, thompEntryId, 'approximate');
        }
      }
    }

    // Flush batches — entries must be flushed before links (FK constraint)
    if (entryInserts.length >= BATCH_SIZE) {
      await db.batch(entryInserts, 'write');
      entryInserts = [];
      if (linkInserts.length > 0) {
        await db.batch(linkInserts, 'write');
        linkInserts = [];
      }
    }
  }

  // Final flush — entries first, then links
  if (entryInserts.length > 0) await db.batch(entryInserts, 'write');
  if (linkInserts.length > 0) await db.batch(linkInserts, 'write');

  console.log(`\n=== LMGG Import Complete ===`);
  console.log(`CMGG entries created: ${cmggEntriesCreated}`);
  console.log(`Concordance links created: ${linksCreated}`);

  // Verify
  const verify = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM catalog_entries WHERE catalog = 'CMGG') as cmgg_entries,
      (SELECT COUNT(*) FROM concordance_links WHERE asserted_by = 'mayaglyphs.org') as lmgg_links,
      (SELECT COUNT(DISTINCT catalog) FROM catalog_entries) as total_catalogs,
      (SELECT COUNT(*) FROM catalog_entries) as total_entries,
      (SELECT COUNT(*) FROM concordance_links) as total_links
  `);
  const v = verify.rows[0] as Record<string, number>;
  console.log(`\nState: ${v.total_entries} entries across ${v.total_catalogs} catalogs, ${v.total_links} total links`);
  console.log(`  CMGG entries: ${v.cmgg_entries}`);
  console.log(`  LMGG links: ${v.lmgg_links}`);
}

main().catch(console.error);
