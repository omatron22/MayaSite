// scripts/init-concordance-schema.ts
// Creates the concordance architecture tables (additive — does not touch existing tables).
// Run with: npx tsx scripts/init-concordance-schema.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('Initializing concordance schema...\n');

  // ── New concordance tables ──
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS catalog_entries (
      entry_id TEXT PRIMARY KEY,
      catalog TEXT NOT NULL,
      catalog_code TEXT NOT NULL,
      parent_entry TEXT REFERENCES catalog_entries(entry_id),
      variant_code TEXT,
      reading_value TEXT,
      reading_type TEXT,
      gloss_english TEXT,
      gloss_mayan TEXT,
      part_of_speech TEXT,
      confidence_level INTEGER,
      function_variant TEXT,
      image_url TEXT,
      source_url TEXT,
      notes TEXT,
      legacy_catalog_sign_id INTEGER REFERENCES catalog_signs(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS concordance_links (
      link_id TEXT PRIMARY KEY,
      entry_a TEXT NOT NULL REFERENCES catalog_entries(entry_id),
      entry_b TEXT NOT NULL REFERENCES catalog_entries(entry_id),
      correspondence TEXT NOT NULL CHECK(correspondence IN ('exact','approximate','partial','disputed')),
      asserted_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS graphs (
      graph_id TEXT PRIMARY KEY,
      catalog_entry TEXT NOT NULL REFERENCES catalog_entries(entry_id),
      variant_suffix TEXT,
      variant_type_label TEXT,
      medium TEXT,
      iconographic_tags TEXT,
      image_url TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS block_sign_slots (
      slot_id TEXT PRIMARY KEY,
      block_id INTEGER NOT NULL REFERENCES blocks(id),
      slot_position INTEGER NOT NULL,
      catalog_entry TEXT REFERENCES catalog_entries(entry_id),
      certainty TEXT CHECK(certainty IN ('certain','uncertain','eroded')),
      position_in_block TEXT,
      graph TEXT REFERENCES graphs(graph_id),
      raw_code TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_concordance_link_pair ON concordance_links(entry_a, entry_b);
    CREATE INDEX IF NOT EXISTS idx_catalog_entries_catalog ON catalog_entries(catalog);
    CREATE INDEX IF NOT EXISTS idx_catalog_entries_code ON catalog_entries(catalog_code);
    CREATE INDEX IF NOT EXISTS idx_catalog_entries_legacy ON catalog_entries(legacy_catalog_sign_id);
    CREATE INDEX IF NOT EXISTS idx_catalog_entries_parent ON catalog_entries(parent_entry);
    CREATE INDEX IF NOT EXISTS idx_concordance_links_a ON concordance_links(entry_a);
    CREATE INDEX IF NOT EXISTS idx_concordance_links_b ON concordance_links(entry_b);
    CREATE INDEX IF NOT EXISTS idx_graphs_entry ON graphs(catalog_entry);
    CREATE INDEX IF NOT EXISTS idx_block_sign_slots_block ON block_sign_slots(block_id);
    CREATE INDEX IF NOT EXISTS idx_block_sign_slots_entry ON block_sign_slots(catalog_entry);
  `);

  console.log('Concordance tables created.\n');

  // ── ALTER existing tables (safe: skips if column exists) ──
  const safeAddColumn = async (table: string, col: string, type: string) => {
    try {
      await db.execute(`SELECT ${col} FROM ${table} LIMIT 1`);
    } catch {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
      console.log(`  Added ${table}.${col}`);
    }
  };

  // blocks: new columns from Wyatt's spec
  await safeAddColumn('blocks', 'event_gregorian', 'TEXT');
  await safeAddColumn('blocks', 'transcription_1', 'TEXT');
  await safeAddColumn('blocks', 'transcription_2', 'TEXT');

  // graphemes: attestation fields
  await safeAddColumn('graphemes', 'graph_id', 'TEXT REFERENCES graphs(graph_id)');
  await safeAddColumn('graphemes', 'assigned_by', 'TEXT');

  console.log('\nConcordance schema ready!');
}

main().catch(console.error);
