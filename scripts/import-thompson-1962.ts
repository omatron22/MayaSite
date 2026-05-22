// scripts/import-thompson-1962.ts
// Parses the Thompson 1962 "Catalog of Maya Hieroglyphs" full-text OCR
// (downloaded from Internet Archive's DjVu text export) and hydrates the
// existing catalog_entries WHERE catalog='Thompson' rows with the data we
// currently lack: glyph name, example count, Gates/Zimmermann crossrefs.
//
// Source: data/thompson-1962.txt (downloaded separately, IA permissioned).
// Authoritative copy: https://www.famsi.org/mayawriting/thompson/ThompsonGlyphCatalog.pdf
// Run with: npx tsx scripts/import-thompson-1962.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEXT_PATH = path.join(__dirname, '..', 'data', 'thompson-1962.txt');
const FAMSI_PDF_URL = 'https://www.famsi.org/mayawriting/thompson/ThompsonGlyphCatalog.pdf';

interface ThompsonRecord {
  tnum: string;
  name: string | null;
  exampleCount: number | null;
  gatesGlyph: string | null;
  zimmermannGlyphs: string[];
  rawHeader: string;
  rawDetail: string | null;
}

function parseHeader(headerLine: string): { tnum: string; name: string | null } | null {
  // "GLYPH 17 (Yax) M.S." or "GLYPH 7 M.S." or "GLYPH 850"
  const m = headerLine.match(/^GLYPH\s+(\d+)\s*(?:\(([^)]*)\))?/);
  if (!m) return null;
  return { tnum: m[1], name: m[2] ? m[2].trim() : null };
}

function parseDetail(detailBlock: string): {
  exampleCount: number | null;
  gatesGlyph: string | null;
  zimmermannGlyphs: string[];
} {
  // Look for "(NN Examples; Gates' Glyph NN; Zimmermann's Glyphs NN NN)"
  // OCR garbles apostrophes so use loose match.
  const exampleMatch = detailBlock.match(/\(\s*(\d+)\s*Examples?/i);
  const gatesMatch = detailBlock.match(/Gates['’ʼ`]?s?\s+Glyphs?\s+(\d+[a-zA-Z]?)/i);
  const zimMatch = detailBlock.match(/Zimmermann['’ʼ`]?s?\s+Glyphs?\s+([\d\s]+)/i);
  return {
    exampleCount: exampleMatch ? Number(exampleMatch[1]) : null,
    gatesGlyph: gatesMatch ? gatesMatch[1] : null,
    zimmermannGlyphs: zimMatch
      ? zimMatch[1].trim().split(/\s+/).filter((s) => /^\d+$/.test(s))
      : [],
  };
}

function extractRecords(text: string): ThompsonRecord[] {
  const lines = text.split('\n');
  const records: ThompsonRecord[] = [];

  // Find all GLYPH headers and grab the ~30 lines following each as the detail block
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('GLYPH ')) continue;
    const header = parseHeader(line);
    if (!header) continue;

    // Look for detail in the next ~25 lines until we hit the next GLYPH header
    const detailLines: string[] = [];
    for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
      const nextLine = lines[j].trim();
      if (nextLine.startsWith('GLYPH ')) break;
      detailLines.push(nextLine);
    }
    const detailBlock = detailLines.join(' ');
    const detail = parseDetail(detailBlock);

    records.push({
      tnum: header.tnum,
      name: header.name,
      exampleCount: detail.exampleCount,
      gatesGlyph: detail.gatesGlyph,
      zimmermannGlyphs: detail.zimmermannGlyphs,
      rawHeader: line,
      rawDetail: detailBlock.slice(0, 800),
    });
  }

  // Dedupe by tnum (keep first occurrence)
  const seen = new Set<string>();
  return records.filter((r) => {
    if (seen.has(r.tnum)) return false;
    seen.add(r.tnum);
    return true;
  });
}

async function batchExecute(stmts: { sql: string; args: (string | number | null)[] }[]) {
  const BATCH = 100;
  for (let i = 0; i < stmts.length; i += BATCH) {
    await db.batch(stmts.slice(i, i + BATCH), 'write');
  }
}

async function main() {
  if (!fs.existsSync(TEXT_PATH)) {
    console.error(`Missing ${TEXT_PATH}. Download with:`);
    console.error(`  mkdir -p data && curl -L -A "MayaSite Research Bot" -o data/thompson-1962.txt "https://archive.org/download/catalog-of-maya-hieroglyphs-thompson-1962/Catalog%20of%20Maya%20Hieroglyphs%20-Thompson%201962_djvu.txt"`);
    process.exit(1);
  }
  const text = fs.readFileSync(TEXT_PATH, 'utf-8');
  console.log(`Loaded Thompson OCR text (${(text.length / 1024).toFixed(1)} KB).\n`);

  const records = extractRecords(text);
  console.log(`Extracted ${records.length} unique Thompson glyph records.\n`);

  // Sanity-check coverage
  const withName = records.filter((r) => r.name).length;
  const withCount = records.filter((r) => r.exampleCount).length;
  const withGates = records.filter((r) => r.gatesGlyph).length;
  console.log(`  with names: ${withName}`);
  console.log(`  with example count: ${withCount}`);
  console.log(`  with Gates crossref: ${withGates}\n`);

  // Ensure source_collection
  await db.execute({
    sql: `INSERT OR IGNORE INTO source_collections
            (collection_id, title, provider, source_url, rights_note, response_format)
          VALUES ('thompson-1962', 'Thompson 1962 - A Catalog of Maya Hieroglyphs',
                  'J.E.S. Thompson / University of Oklahoma Press; hosted by FAMSI with permission',
                  ?,
                  'Copyright Univ. of Oklahoma Press 1962. Out of print; FAMSI hosts permissioned PDF for scholarly study. Cite the original book.',
                  'OCR text via Internet Archive (DjVu export)')`,
    args: [FAMSI_PDF_URL],
  });

  // Hydrate existing Thompson catalog_entries
  // Existing entry IDs look like 'thompson-N' (per inspect script).
  // For each parsed record: update reading_value (name), notes (Gates/Zim/examples),
  // source_url, decipherment_criteria, gloss_english.
  console.log('Hydrating Thompson catalog_entries...');

  // Build a map: existing tnum → entry_id
  const existing = await db.execute(`SELECT entry_id, catalog_code FROM catalog_entries WHERE catalog = 'Thompson'`);
  const tnumToEntryId = new Map<string, string>();
  existing.rows.forEach((r) => {
    tnumToEntryId.set(String(r.catalog_code).replace(/^T/i, '').trim(), String(r.entry_id));
  });
  console.log(`  ${tnumToEntryId.size} existing Thompson entries to hydrate.`);

  const updateStmts: { sql: string; args: (string | number | null)[] }[] = [];
  let hydrated = 0;
  let newEntries = 0;
  for (const r of records) {
    const notesParts: string[] = [];
    if (r.exampleCount != null) notesParts.push(`${r.exampleCount} examples`);
    if (r.gatesGlyph) notesParts.push(`Gates Glyph ${r.gatesGlyph}`);
    if (r.zimmermannGlyphs.length > 0) notesParts.push(`Zimmermann Glyphs ${r.zimmermannGlyphs.join(', ')}`);
    const notes = notesParts.length > 0 ? notesParts.join('; ') : null;

    const entryId = tnumToEntryId.get(r.tnum);
    if (entryId) {
      updateStmts.push({
        sql: `UPDATE catalog_entries SET
                reading_value = COALESCE(reading_value, ?),
                notes = COALESCE(notes, ?),
                source_url = COALESCE(source_url, ?)
              WHERE entry_id = ?`,
        args: [r.name, notes, FAMSI_PDF_URL, entryId],
      });
      hydrated++;
    } else {
      // T-number from Thompson catalog not in catalog_entries yet — insert new
      const newId = `thompson-1962-${r.tnum}`;
      updateStmts.push({
        sql: `INSERT OR IGNORE INTO catalog_entries
                (entry_id, catalog, catalog_code, reading_value, notes, source_url)
              VALUES (?, 'Thompson', ?, ?, ?, ?)`,
        args: [newId, r.tnum, r.name, notes, FAMSI_PDF_URL],
      });
      newEntries++;
    }
  }
  await batchExecute(updateStmts);
  console.log(`  ${hydrated} existing entries hydrated.`);
  console.log(`  ${newEntries} net-new Thompson entries inserted.`);

  await db.execute(`UPDATE source_collections SET last_imported_at = datetime('now') WHERE collection_id = 'thompson-1962'`);

  // Quick verification
  const nowNamed = await db.execute(
    `SELECT COUNT(*) AS n FROM catalog_entries WHERE catalog = 'Thompson' AND reading_value IS NOT NULL AND reading_value != ''`
  );
  const nowNoted = await db.execute(
    `SELECT COUNT(*) AS n FROM catalog_entries WHERE catalog = 'Thompson' AND notes IS NOT NULL AND notes != ''`
  );
  console.log(`\nThompson entries with reading_value: ${nowNamed.rows[0].n}`);
  console.log(`Thompson entries with notes: ${nowNoted.rows[0].n}`);

  console.log('\nDONE.');
}

main().catch((err) => { console.error(err); process.exit(1); });
