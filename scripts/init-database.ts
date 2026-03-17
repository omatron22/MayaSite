// scripts/init-database.ts
// Creates the database schema. Run with: npx tsx scripts/init-database.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('Initializing database schema...\n');

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS catalog_signs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      graphcode TEXT,
      mhd_code TEXT NOT NULL,
      mhd_code_sub TEXT,
      mhd_code_2003 TEXT,
      thompson_code TEXT,
      thompson_variant TEXT,
      zender_code TEXT,
      kettunen_code TEXT,
      kettunen_1999 TEXT,
      gronemeyer_code TEXT,
      logographic_value TEXT,
      logographic_cvc TEXT,
      syllabic_value TEXT,
      english_translation TEXT,
      word_class TEXT,
      calendrical_name TEXT,
      picture_description TEXT,
      volume TEXT,
      technique TEXT,
      distribution TEXT,
      primary_image_url TEXT,
      notes TEXT,
      cmgg_code TEXT,
      pronunciation TEXT,
      bonn_sign_number INTEGER,
      bonn_confidence INTEGER,
      bonn_image_url TEXT,
      variant_code TEXT,
      phonetic_value TEXT,
      base_thompson_number INTEGER,
      former_mhd_code TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mhd_block_id TEXT NOT NULL,
      artifact_code TEXT NOT NULL,
      surface_page TEXT,
      orientation_frame TEXT,
      coordinate TEXT,
      transcription_logosyll TEXT,
      transcription_hyphen TEXT,
      transcription_1 TEXT,
      transcription_2 TEXT,
      block_english TEXT,
      block_graphcodes TEXT,
      event_calendar TEXT,
      event_long_count TEXT,
      event_260_day TEXT,
      event_365_day TEXT,
      region TEXT,
      site_name TEXT,
      person_code TEXT,
      scribe TEXT,
      material TEXT,
      technique TEXT,
      artifact_type TEXT,
      object_description TEXT,
      semantic_context TEXT,
      notes TEXT,
      block_image1_url TEXT,
      block_image2_url TEXT,
      image_notes TEXT,
      image_url TEXT,
      site_code TEXT,
      latitude REAL,
      longitude REAL,
      sort_order INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS graphemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_id INTEGER NOT NULL REFERENCES blocks(id),
      catalog_sign_id INTEGER REFERENCES catalog_signs(id),
      grapheme_code TEXT NOT NULL,
      grapheme_logosyll TEXT,
      grapheme_hyphenated TEXT,
      grapheme_maya TEXT,
      grapheme_english TEXT,
      artifact_code TEXT,
      location_summary TEXT
    );

    CREATE TABLE IF NOT EXISTS roboflow_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catalog_sign_id INTEGER REFERENCES catalog_signs(id),
      image_url TEXT NOT NULL,
      bbox_x REAL,
      bbox_y REAL,
      bbox_width REAL,
      bbox_height REAL,
      segmentation_mask TEXT,
      confidence REAL,
      dataset_split TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_catalog_mhd_code ON catalog_signs(mhd_code);
    CREATE INDEX IF NOT EXISTS idx_catalog_graphcode ON catalog_signs(graphcode);
    CREATE INDEX IF NOT EXISTS idx_blocks_artifact ON blocks(artifact_code);
    CREATE INDEX IF NOT EXISTS idx_blocks_region ON blocks(region);
    CREATE INDEX IF NOT EXISTS idx_blocks_site ON blocks(site_name);
    CREATE INDEX IF NOT EXISTS idx_blocks_sort ON blocks(artifact_code, sort_order);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_mhd_id ON blocks(mhd_block_id);
    CREATE INDEX IF NOT EXISTS idx_graphemes_block ON graphemes(block_id);
    CREATE INDEX IF NOT EXISTS idx_graphemes_catalog ON graphemes(catalog_sign_id);
    CREATE INDEX IF NOT EXISTS idx_graphemes_code ON graphemes(grapheme_code);
    CREATE INDEX IF NOT EXISTS idx_roboflow_catalog ON roboflow_instances(catalog_sign_id);

    CREATE TABLE IF NOT EXISTS kerr_vessels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      k_number TEXT NOT NULL UNIQUE,
      k_num INTEGER NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      still_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cmhi_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_name TEXT NOT NULL,
      site_code TEXT NOT NULL,
      image_url TEXT NOT NULL,
      filename TEXT NOT NULL,
      image_type TEXT NOT NULL,
      monument_type TEXT,
      monument_number TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_kerr_knum ON kerr_vessels(k_num);
    CREATE INDEX IF NOT EXISTS idx_cmhi_site ON cmhi_images(site_code);
    CREATE INDEX IF NOT EXISTS idx_cmhi_type ON cmhi_images(image_type);
  `);

  console.log('Database schema ready!');
}

main().catch(console.error);
