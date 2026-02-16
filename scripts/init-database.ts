// scripts/init-database.ts
// Creates the database schema. Run with: npx tsx scripts/init-database.ts
import 'dotenv/config';
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mhd_block_id TEXT NOT NULL,
      artifact_code TEXT NOT NULL,
      surface_page TEXT,
      orientation_frame TEXT,
      coordinate TEXT,
      block_logosyll TEXT,
      block_hyphenated TEXT,
      block_maya1 TEXT,
      block_maya2 TEXT,
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

    CREATE INDEX IF NOT EXISTS idx_blocks_artifact ON blocks(artifact_code);
    CREATE INDEX IF NOT EXISTS idx_blocks_region ON blocks(region);
    CREATE INDEX IF NOT EXISTS idx_blocks_site ON blocks(site_name);
    CREATE INDEX IF NOT EXISTS idx_graphemes_block ON graphemes(block_id);
    CREATE INDEX IF NOT EXISTS idx_graphemes_catalog ON graphemes(catalog_sign_id);
    CREATE INDEX IF NOT EXISTS idx_roboflow_catalog ON roboflow_instances(catalog_sign_id);
  `);

  console.log('Database schema ready!');
}

main().catch(console.error);
