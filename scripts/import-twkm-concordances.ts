// scripts/import-twkm-concordances.ts
// Creates concordance_links from classicmayan-raw.json concordance data (7,699 rows).
// Also creates catalog_entries for external catalogs (Thompson, Grube, etc.) as needed.
// Creates MHD ↔ TWKM links using existing bonn_sign_number matches.
// Run with: npx tsx scripts/import-twkm-concordances.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawConcordance {
  id: string;
  catId: string;
  catNumber: string;
  graphNo: string;
  catComment: string | null;
  bibText: string;
  description: string;
  comment: string;
  images: string[];
}

interface RawCatalog {
  id: string;
  name: string;
}

// Map classicmayan catalog IDs to our catalog codes
const CATALOG_MAP: Record<string, string> = {
  '1': 'Thompson',
  '2': 'Grube',
  '3': 'RingleSmithStark',
  '4': 'RodriguezOchoa',
  '5': 'Zimmermann',
  '6': 'MacriVail',
  '7': 'Knorozov',
  '8': 'RendonSpescha',
  '9': 'Gates',
  '10': 'Evreinov',
  '11': 'Tokovinine',
};

async function main() {
  console.log('Importing TWKM concordance links...\n');

  // Check for existing links
  const existingLinks = await db.execute(
    `SELECT COUNT(*) as count FROM concordance_links WHERE asserted_by = 'classicmayan.org'`
  );
  if (Number(existingLinks.rows[0].count) > 0) {
    console.log(`Already have ${existingLinks.rows[0].count} classicmayan.org links. Skipping.`);
    console.log('To re-run, first: DELETE FROM concordance_links WHERE asserted_by = \'classicmayan.org\'');
    return;
  }

  // Load raw data
  const rawPath = path.join(__dirname, '..', 'data', 'classicmayan-raw.json');
  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
  const concordances: RawConcordance[] = raw.concordances;
  const catalogs: RawCatalog[] = raw.catalogs;
  console.log(`Loaded ${concordances.length} concordance rows from ${catalogs.length} catalogs.\n`);

  // Load existing TWKM entries for sign_number → entry_id lookup
  const twkmEntries = await db.execute(
    `SELECT entry_id, catalog_code FROM catalog_entries WHERE catalog = 'TWKM'`
  );
  // graphNo starts with sign number, so we need sign_number → entry_id
  // graph_code format: {signNo}{variant}, e.g. "1bl" = sign 1, variant "bl"
  // We need to extract signNo from graphNo
  console.log(`Found ${twkmEntries.rows.length} TWKM entries.\n`);

  // Build signNo → TWKM entry_id map
  const twkmBySignNo = new Map<number, string>();
  for (const row of twkmEntries.rows) {
    const code = String(row.catalog_code);
    const signNo = parseInt(code);
    if (!isNaN(signNo)) {
      twkmBySignNo.set(signNo, String(row.entry_id));
    }
  }

  // Track external catalog entries we've created (to avoid duplicates)
  const createdEntries = new Set<string>();

  // Load existing catalog entries to check
  const existingEntries = await db.execute(
    `SELECT entry_id FROM catalog_entries`
  );
  for (const row of existingEntries.rows) {
    createdEntries.add(String(row.entry_id));
  }

  const BATCH_SIZE = 100;
  let entryInserts: { sql: string; args: (string | number | null)[] }[] = [];
  let linkInserts: { sql: string; args: (string | number | null)[] }[] = [];
  let entriesCreated = 0;
  let linksCreated = 0;
  let skippedNoTwkm = 0;

  // Track link pairs to avoid duplicates
  const linkPairs = new Set<string>();

  for (const conc of concordances) {
    const catalogCode = CATALOG_MAP[conc.catId];
    if (!catalogCode) continue;

    // Extract sign number from graphNo (e.g. "1bl" → 1, "796st" → 796)
    const signNoMatch = conc.graphNo.match(/^(\d+)/);
    if (!signNoMatch) continue;
    const signNo = parseInt(signNoMatch[1]);

    const twkmEntryId = twkmBySignNo.get(signNo);
    if (!twkmEntryId) {
      skippedNoTwkm++;
      continue;
    }

    // Create external catalog entry if needed
    const extEntryId = `${catalogCode.toLowerCase()}-${conc.catNumber}`;
    if (!createdEntries.has(extEntryId)) {
      entryInserts.push({
        sql: `INSERT INTO catalog_entries
              (entry_id, catalog, catalog_code, source_url)
              VALUES (?, ?, ?, 'https://classicmayan.org')`,
        args: [extEntryId, catalogCode, conc.catNumber],
      });
      createdEntries.add(extEntryId);
      entriesCreated++;
    }

    // Create TWKM ↔ external catalog link
    const pairKey = [twkmEntryId, extEntryId].sort().join('|');
    if (!linkPairs.has(pairKey)) {
      const linkId = `cl-${twkmEntryId}-${extEntryId}`;
      linkInserts.push({
        sql: `INSERT INTO concordance_links
              (link_id, entry_a, entry_b, correspondence, asserted_by, notes)
              VALUES (?, ?, ?, 'approximate', 'classicmayan.org', ?)`,
        args: [
          linkId,
          twkmEntryId,
          extEntryId,
          conc.comment || null,
        ],
      });
      linkPairs.add(pairKey);
      linksCreated++;
    }

    // Batch flush — entries must be flushed before links (FK constraint)
    if (entryInserts.length >= BATCH_SIZE) {
      await db.batch(entryInserts, 'write');
      entryInserts = [];
      if (linkInserts.length > 0) {
        await db.batch(linkInserts, 'write');
        linkInserts = [];
      }
    }
  }

  // Flush remaining — entries first, then links
  if (entryInserts.length > 0) await db.batch(entryInserts, 'write');
  if (linkInserts.length > 0) await db.batch(linkInserts, 'write');

  console.log(`\n=== External Catalog Concordances ===`);
  console.log(`External entries created: ${entriesCreated}`);
  console.log(`Concordance links created: ${linksCreated}`);
  console.log(`Skipped (no TWKM match): ${skippedNoTwkm}`);

  // Now create MHD ↔ TWKM links from bonn_sign_number matches
  console.log(`\nCreating MHD ↔ TWKM links from bonn_sign_number matches...`);

  const mhdWithBonn = await db.execute(`
    SELECT ce.entry_id as mhd_entry_id, cs.bonn_sign_number, cs.zender_code
    FROM catalog_entries ce
    JOIN catalog_signs cs ON ce.legacy_catalog_sign_id = cs.id
    WHERE ce.catalog = 'MHD' AND cs.bonn_sign_number IS NOT NULL
  `);

  let mhdTwkmLinks: { sql: string; args: (string | number | null)[] }[] = [];
  let mhdTwkmCount = 0;

  for (const row of mhdWithBonn.rows) {
    const bonnNo = Number(row.bonn_sign_number);
    const twkmEntryId = twkmBySignNo.get(bonnNo);
    if (!twkmEntryId) continue;

    const mhdEntryId = String(row.mhd_entry_id);
    const pairKey = [mhdEntryId, twkmEntryId].sort().join('|');
    if (linkPairs.has(pairKey)) continue;

    // Zender-matched = exact, Thompson-fallback = approximate
    const zenderCode = row.zender_code ? String(row.zender_code).trim() : '';
    const bonnPadded = String(bonnNo).padStart(4, '0');
    const correspondence = zenderCode === bonnPadded ? 'exact' : 'approximate';

    const linkId = `cl-${mhdEntryId}-${twkmEntryId}`;
    mhdTwkmLinks.push({
      sql: `INSERT INTO concordance_links
            (link_id, entry_a, entry_b, correspondence, asserted_by, notes)
            VALUES (?, ?, ?, ?, 'MHD-TWKM-match', NULL)`,
      args: [linkId, mhdEntryId, twkmEntryId, correspondence],
    });
    linkPairs.add(pairKey);
    mhdTwkmCount++;

    if (mhdTwkmLinks.length >= BATCH_SIZE) {
      await db.batch(mhdTwkmLinks, 'write');
      mhdTwkmLinks = [];
    }
  }

  if (mhdTwkmLinks.length > 0) await db.batch(mhdTwkmLinks, 'write');

  console.log(`MHD ↔ TWKM links created: ${mhdTwkmCount}`);

  // Final summary
  const summary = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM catalog_entries) as total_entries,
      (SELECT COUNT(DISTINCT catalog) FROM catalog_entries) as catalogs,
      (SELECT COUNT(*) FROM concordance_links) as total_links
  `);
  const s = summary.rows[0] as Record<string, number>;
  console.log(`\n=== Final State ===`);
  console.log(`Total catalog entries: ${s.total_entries} across ${s.catalogs} catalogs`);
  console.log(`Total concordance links: ${s.total_links}`);
}

main().catch(console.error);
