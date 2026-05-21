// scripts/init-twkm-extended-schema.ts
// Adds the TWKM-extended schema: artefacts + places tables and additional
// columns on graphs / catalog_entries so we can store the data we currently
// throw away during the data.en.json import.
// Run with: npx tsx scripts/init-twkm-extended-schema.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function tableHasColumn(table: string, col: string): Promise<boolean> {
  const r = await db.execute(`PRAGMA table_info(${table})`);
  return r.rows.some((row) => String(row.name) === col);
}

async function addColIfMissing(table: string, col: string, type: string) {
  if (!(await tableHasColumn(table, col))) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
    console.log(`  + ${table}.${col} ${type}`);
  } else {
    console.log(`  · ${table}.${col} already exists`);
  }
}

async function main() {
  console.log('Creating TWKM extended schema...\n');

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS twkm_artefacts (
      artefact_id TEXT PRIMARY KEY,
      label TEXT,
      date_start INTEGER,
      date_end INTEGER,
      places_json TEXT,
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS twkm_places (
      place_id TEXT PRIMARY KEY,
      label TEXT,
      latitude REAL,
      longitude REAL,
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_twkm_artefacts_label ON twkm_artefacts(label);
    CREATE INDEX IF NOT EXISTS idx_twkm_places_label ON twkm_places(label);
  `);
  console.log('twkm_artefacts + twkm_places tables ready.\n');

  console.log('Adding graphs columns (variant + occurrence + ontology):');
  await addColIfMissing('graphs', 'twkm_occurrence_count', 'INTEGER');
  await addColIfMissing('graphs', 'twkm_bibliography_json', 'TEXT');
  await addColIfMissing('graphs', 'twkm_artefacts_json', 'TEXT');
  await addColIfMissing('graphs', 'allograph_group', 'TEXT');
  await addColIfMissing('graphs', 'visual_category', 'TEXT');
  await addColIfMissing('graphs', 'diagnostic_features_json', 'TEXT');
  await addColIfMissing('graphs', 'is_head_variant', 'INTEGER DEFAULT 0');
  await addColIfMissing('graphs', 'is_full_figure_variant', 'INTEGER DEFAULT 0');
  await addColIfMissing('graphs', 'is_day_sign_variant', 'INTEGER DEFAULT 0');
  await addColIfMissing('graphs', 'related_graphs_json', 'TEXT');

  console.log('\nAdding catalog_entries columns (TWKM narrative metadata):');
  await addColIfMissing('catalog_entries', 'twkm_comments_json', 'TEXT');
  await addColIfMissing('catalog_entries', 'twkm_descriptions_json', 'TEXT');

  console.log('\nDONE.');
}

main().catch((err) => { console.error(err); process.exit(1); });
