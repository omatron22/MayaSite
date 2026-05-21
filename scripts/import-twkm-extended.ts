// scripts/import-twkm-extended.ts
// Re-fetches the TWKM data.en.json and imports the parts we currently throw
// away: artefacts, places, ALL decipherments (polysemy), per-graph occurrence
// counts + variant flags, catalog_entries comments + descriptions.
// Idempotent. Run with: npx tsx scripts/import-twkm-extended.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

const DATA_URL = 'https://classicmayan.org/portal/sc/client/data/json/data.en.json';

interface RawData {
  artefacts: { id: string; label: string; date: { start: number; end: number }; places: string[] }[];
  catalogs: { id: string; name: string }[];
  concordances: { id: string; catId: string; catNumber: string; graphNo: string; comment: string | null }[];
  decipherments: { id: string; signNo: number; type: string; value: string; confLevelValue: number; confCriteria: string[] }[];
  graphs: {
    graphNo: string; signNo: number; variant: string;
    imgUrl: string; occurrence: number; nicknames: { name: string }[];
    translation: string | null; concordances: string[];
    iconography: string[];
    artefacts?: string[];
    bibliography?: { bibId: string; pages: string }[];
  }[];
  iconography: { id: string; parentId: string; label: string }[];
  signs: { signNo: number; translation: string | null; bibliography: { bibId: string; pages: string }[]; comments: string[]; descriptions: string[] }[];
  places: { id: string; label: string; lat: number; long: number }[];
}

// TWKM type → sign_readings.reading_type
const TYPE_MAP: Record<string, string> = {
  phonogram: 'syllabogram',
  logogram: 'logogram',
  numeric: 'numeral',
  diacritic: 'diacritic',
};

// TWKM variant-suffix categorization. Head variants substitute a head shape;
// full-figure variants use a whole body. The rest are visual sub-variants we
// preserve as `allograph_group` without a stronger semantic flag.
function classifyVariant(suffix: string): {
  isHead: boolean;
  isFullFigure: boolean;
  group: string;
} {
  const s = (suffix || '').toLowerCase();
  if (s === 'hh' || s === 'hc' || s === 'hp') return { isHead: true, isFullFigure: false, group: 'head' };
  if (s === 'fh' || s === 'fc' || s === 'fb') return { isHead: false, isFullFigure: true, group: 'full-figure' };
  if (s === 'st') return { isHead: false, isFullFigure: false, group: 'standard' };
  return { isHead: false, isFullFigure: false, group: s ? `other:${s}` : 'unknown' };
}

async function batchExecute(stmts: { sql: string; args: (string | number | null)[] }[]) {
  const BATCH = 100;
  for (let i = 0; i < stmts.length; i += BATCH) {
    await db.batch(stmts.slice(i, i + BATCH), 'write');
  }
}

async function main() {
  console.log('Fetching TWKM data.en.json...');
  const resp = await fetch(DATA_URL, {
    headers: { 'User-Agent': 'MayaSite Research Bot (academic use)' },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  const raw: RawData = await resp.json();
  console.log(`  signs=${raw.signs.length} graphs=${raw.graphs.length} decipherments=${raw.decipherments.length} artefacts=${raw.artefacts.length} places=${raw.places.length}\n`);

  // 1) Artefacts
  console.log('Importing twkm_artefacts...');
  const artefactStmts = raw.artefacts.map((a) => ({
    sql: `INSERT OR REPLACE INTO twkm_artefacts
          (artefact_id, label, date_start, date_end, places_json, raw_json)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [a.id, a.label, a.date?.start ?? null, a.date?.end ?? null, JSON.stringify(a.places ?? []), JSON.stringify(a)] as (string | number | null)[],
  }));
  await batchExecute(artefactStmts);
  console.log(`  ${artefactStmts.length} artefacts upserted.`);

  // 2) Places
  console.log('Importing twkm_places...');
  const placeStmts = raw.places.map((p) => ({
    sql: `INSERT OR REPLACE INTO twkm_places
          (place_id, label, latitude, longitude, raw_json)
          VALUES (?, ?, ?, ?, ?)`,
    args: [p.id, p.label, p.lat ?? null, p.long ?? null, JSON.stringify(p)] as (string | number | null)[],
  }));
  await batchExecute(placeStmts);
  console.log(`  ${placeStmts.length} places upserted.`);

  // 3) Graphs — update occurrence count + variant flags + JSON metadata
  console.log('Updating graphs with TWKM extended fields...');
  const graphStmts: { sql: string; args: (string | number | null)[] }[] = [];
  for (const g of raw.graphs) {
    const variant = classifyVariant(g.variant);
    graphStmts.push({
      sql: `UPDATE graphs SET
              twkm_occurrence_count = ?,
              twkm_bibliography_json = ?,
              twkm_artefacts_json = ?,
              allograph_group = ?,
              visual_category = ?,
              is_head_variant = ?,
              is_full_figure_variant = ?
            WHERE graph_id = ?`,
      args: [
        g.occurrence ?? 0,
        g.bibliography ? JSON.stringify(g.bibliography) : null,
        g.artefacts ? JSON.stringify(g.artefacts) : null,
        variant.group,
        g.variant || null,
        variant.isHead ? 1 : 0,
        variant.isFullFigure ? 1 : 0,
        g.graphNo,
      ],
    });
  }
  await batchExecute(graphStmts);
  console.log(`  ${graphStmts.length} graphs updated.`);

  // 4) Decipherments → sign_readings (polysemy)
  // Strategy: per signNo, map to existing catalog_signs.id (via TWKM bonn_sign_number),
  // then insert one row per decipherment.
  console.log('Importing all TWKM decipherments into sign_readings (polysemy)...');
  // Build sign-no → catalog_signs.id map
  const signMap = new Map<number, number>();
  const signRows = await db.execute('SELECT id, bonn_sign_number FROM catalog_signs WHERE bonn_sign_number IS NOT NULL');
  signRows.rows.forEach((r) => {
    const bsn = Number(r.bonn_sign_number);
    if (!isNaN(bsn)) signMap.set(bsn, Number(r.id));
  });
  console.log(`  ${signMap.size} catalog_signs have a bonn_sign_number for matching.`);

  let inserted = 0;
  let unmatched = 0;
  const readingStmts: { sql: string; args: (string | number | null)[] }[] = [];
  for (const d of raw.decipherments) {
    const signId = signMap.get(d.signNo);
    if (signId === undefined) { unmatched++; continue; }
    const readingType = TYPE_MAP[d.type] ?? 'unknown';
    readingStmts.push({
      sql: `INSERT OR IGNORE INTO sign_readings
              (reading_id, catalog_sign_id, source_collection_id, reading_value, reading_type, confidence_level, criteria_json, is_primary, notes, source_url)
              VALUES (?, ?, 'twkm', ?, ?, ?, ?, 0, ?, ?)`,
      args: [
        `twkm-${d.id}`,
        signId,
        d.value,
        readingType,
        d.confLevelValue ?? null,
        JSON.stringify(d.confCriteria ?? []),
        `TWKM ${d.type} decipherment (sign #${d.signNo})`,
        'https://classicmayan.org',
      ],
    });
    inserted++;
  }
  await batchExecute(readingStmts);
  console.log(`  ${inserted} sign_readings inserted (${unmatched} unmatched to a catalog_signs row).`);

  // 5) catalog_entries — comments + descriptions per sign
  console.log('Updating catalog_entries with TWKM comments/descriptions...');
  const entryStmts: { sql: string; args: (string | number | null)[] }[] = [];
  for (const s of raw.signs) {
    const entryId = `twkm-${s.signNo}`;
    entryStmts.push({
      sql: `UPDATE catalog_entries SET
              twkm_comments_json = ?,
              twkm_descriptions_json = ?
            WHERE entry_id = ?`,
      args: [
        JSON.stringify(s.comments ?? []),
        JSON.stringify(s.descriptions ?? []),
        entryId,
      ],
    });
  }
  await batchExecute(entryStmts);
  console.log(`  ${entryStmts.length} catalog_entries updated.`);

  // 6) Bump source_collections.last_imported_at
  await db.execute({
    sql: `UPDATE source_collections SET last_imported_at = datetime('now') WHERE collection_id = 'twkm'`,
    args: [],
  });

  // Final summary
  const readingCounts = await db.execute(
    `SELECT source_collection_id, COUNT(*) AS n FROM sign_readings GROUP BY source_collection_id`
  );
  console.log('\nsign_readings by source:');
  readingCounts.rows.forEach((r) => console.log(`  ${r.source_collection_id}: ${r.n}`));

  const polysemicSigns = await db.execute(
    `SELECT COUNT(*) AS n FROM (
       SELECT catalog_sign_id FROM sign_readings
       WHERE catalog_sign_id IS NOT NULL
       GROUP BY catalog_sign_id HAVING COUNT(*) > 1
     )`
  );
  console.log(`\nSigns with >1 reading (polysemy realized): ${polysemicSigns.rows[0].n}`);

  console.log('\nDONE.');
}

main().catch((err) => { console.error(err); process.exit(1); });
