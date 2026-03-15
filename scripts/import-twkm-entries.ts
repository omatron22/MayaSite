// scripts/import-twkm-entries.ts
// Creates catalog_entries with catalog='TWKM' from classicmayan-signs.json (1,075 signs).
// Also creates graphs rows for each visual variant.
// Run with: npx tsx scripts/import-twkm-entries.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BonnSign {
  sign_number: number;
  translation: string | null;
  graphs: {
    graph_code: string;
    variant: string;
    image_url: string;
    thumb_url: string;
    occurrence_count: number;
    nicknames: string[];
  }[];
  decipherments: {
    type: string;
    value: string;
    confidence: number;
    criteria: string[];
  }[];
  thompson_codes: string[];
  concordances: {
    catalog_name: string;
    catalog_id: string;
    number: string;
    graph_code: string;
    comment: string;
  }[];
  comments: string[];
  descriptions: string[];
}

async function main() {
  console.log('Importing TWKM entries from classicmayan-signs.json...\n');

  // Check for existing TWKM entries
  const existing = await db.execute(
    `SELECT COUNT(*) as count FROM catalog_entries WHERE catalog = 'TWKM'`
  );
  if (Number(existing.rows[0].count) > 0) {
    console.log(`Already have ${existing.rows[0].count} TWKM entries. Skipping.`);
    console.log('To re-run, first: DELETE FROM catalog_entries WHERE catalog = \'TWKM\'');
    return;
  }

  const filePath = path.join(__dirname, '..', 'data', 'classicmayan-signs.json');
  const signs: BonnSign[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Loaded ${signs.length} Bonn/TWKM signs.\n`);

  const BATCH_SIZE = 100;
  let entryInserts: { sql: string; args: (string | number | null)[] }[] = [];
  let graphInserts: { sql: string; args: (string | number | null)[] }[] = [];
  let entriesCreated = 0;
  let graphsCreated = 0;

  for (const sign of signs) {
    const entryId = `twkm-${sign.sign_number}`;
    const catalogCode = String(sign.sign_number).padStart(4, '0');

    // Best decipherment for reading_value + reading_type
    // Map TWKM types to spec enum: phonogram→syllabogram, logogram→logogram, numeric→numeral, diacritic→diacritic
    const TYPE_MAP: Record<string, string> = {
      phonogram: 'syllabogram',
      logogram: 'logogram',
      numeric: 'numeral',
      diacritic: 'diacritic',
    };
    const phonograms = sign.decipherments
      .filter(d => d.type === 'phonogram')
      .sort((a, b) => a.confidence - b.confidence);
    const logograms = sign.decipherments
      .filter(d => d.type === 'logogram')
      .sort((a, b) => a.confidence - b.confidence);
    const numerics = sign.decipherments
      .filter(d => d.type === 'numeric')
      .sort((a, b) => a.confidence - b.confidence);
    const diacritics = sign.decipherments
      .filter(d => d.type === 'diacritic')
      .sort((a, b) => a.confidence - b.confidence);

    let readingValue: string | null = null;
    let readingType: string | null = null;
    // Priority: phonogram > logogram > numeric > diacritic
    if (phonograms.length > 0) {
      readingValue = phonograms[0].value;
      readingType = 'syllabogram';
    } else if (logograms.length > 0) {
      readingValue = logograms[0].value;
      readingType = 'logogram';
    } else if (numerics.length > 0) {
      readingValue = numerics[0].value;
      readingType = 'numeral';
    } else if (diacritics.length > 0) {
      readingValue = diacritics[0].value;
      readingType = 'diacritic';
    }

    // Best confidence
    const bestConfidence = sign.decipherments.length > 0
      ? Math.min(...sign.decipherments.map(d => d.confidence))
      : null;

    // Primary image from first graph
    const primaryImage = sign.graphs.length > 0 ? sign.graphs[0].image_url : null;

    entryInserts.push({
      sql: `INSERT INTO catalog_entries
            (entry_id, catalog, catalog_code, reading_value, reading_type,
             gloss_english, confidence_level, image_url, source_url)
            VALUES (?, 'TWKM', ?, ?, ?, ?, ?, ?, 'https://classicmayan.org')`,
      args: [
        entryId,
        catalogCode,
        readingValue,
        readingType,
        sign.translation,
        bestConfidence,
        primaryImage,
      ],
    });
    entriesCreated++;

    // TWKM variant suffix → human-readable label (Prager & Gronemeyer 2018)
    const VARIANT_LABELS: Record<string, string> = {
      st: 'standard', bt: 'bottom', tt: 'top',
      fh: 'full human', hc: 'head creature', hh: 'head human',
      fc: 'full creature', ex: 'pars pro toto', m: 'multiple',
      bl: 'body left', br: 'body right', bh: 'body high',
      vt: 'variant top', vs: 'variant standard',
    };

    // Create graph rows for each variant
    for (const g of sign.graphs) {
      const graphId = `twkm-graph-${g.graph_code}`;
      const variantLabel = VARIANT_LABELS[g.variant] || g.variant;
      graphInserts.push({
        sql: `INSERT INTO graphs
              (graph_id, catalog_entry, variant_suffix, variant_type_label, image_url, notes)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          graphId,
          entryId,
          g.variant,
          variantLabel,
          g.image_url,
          g.nicknames.length > 0 ? g.nicknames.join(', ') : null,
        ],
      });
      graphsCreated++;
    }

    // Batch flush — entries must be flushed before graphs (FK constraint)
    if (entryInserts.length >= BATCH_SIZE) {
      await db.batch(entryInserts, 'write');
      entryInserts = [];
      if (graphInserts.length > 0) {
        await db.batch(graphInserts, 'write');
        graphInserts = [];
      }
    }
  }

  // Final flush — entries first, then graphs
  if (entryInserts.length > 0) await db.batch(entryInserts, 'write');
  if (graphInserts.length > 0) await db.batch(graphInserts, 'write');

  console.log(`\n=== TWKM Import Complete ===`);
  console.log(`Entries created: ${entriesCreated}`);
  console.log(`Graphs created: ${graphsCreated}`);

  // Verify
  const verify = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM catalog_entries WHERE catalog = 'TWKM') as entries,
      (SELECT COUNT(*) FROM graphs WHERE catalog_entry LIKE 'twkm-%') as graphs
  `);
  const v = verify.rows[0] as Record<string, number>;
  console.log(`\nVerification: ${v.entries} TWKM entries, ${v.graphs} graphs`);
}

main().catch(console.error);
