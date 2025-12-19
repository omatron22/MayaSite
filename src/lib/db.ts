// src/lib/db.ts

// Minimal process declaration so TypeScript is happy when bundling for the browser
declare const process: {
  env: Record<string, string | undefined>;
};

import { createClient } from '@libsql/client';

// Use Vite env if present (browser), otherwise fall back to Node env (scripts)
const viteEnv =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env
    : {};

const rawUrl =
  (viteEnv as any).VITE_TURSO_DATABASE_URL ||
  process.env.VITE_TURSO_DATABASE_URL ||
  process.env.TURSO_DATABASE_URL ||
  '';

const authToken =
  (viteEnv as any).VITE_TURSO_AUTH_TOKEN ||
  process.env.VITE_TURSO_AUTH_TOKEN ||
  process.env.TURSO_AUTH_TOKEN ||
  '';

export const db = createClient({
  url: rawUrl.replace('libsql://', 'https://'),
  authToken
});

// Initialize database schema (used by scripts only)
export async function initDatabase() {
  // CATALOG SIGNS - Master list of all Maya signs with cross-references
  await db.execute(`
    CREATE TABLE IF NOT EXISTS catalog_signs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      -- MHD identifiers
      mhd_code TEXT NOT NULL UNIQUE,
      mhd_code_sub TEXT,
      mhd_code_2003 TEXT,
      
      -- Cross-catalog codes (for search by different systems)
      thompson_code TEXT,
      thompson_variant TEXT,
      zender_code TEXT,
      kettunen_code TEXT,
      kettunen_1999 TEXT,
      gronemeyer_code TEXT,
      former_mhd_code TEXT,
      
      -- Linguistic data
      logographic_value TEXT,
      logographic_cvc TEXT,
      syllabic_value TEXT,
      english_translation TEXT,
      word_class TEXT,
      calendrical_name TEXT,
      
      -- Visual/contextual metadata
      picture_description TEXT,
      volume TEXT,
      technique TEXT,
      distribution TEXT,
      
      -- Image
      primary_image_url TEXT,
      
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // BLOCKS - Glyph blocks (words composed of 1+ graphemes)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mhd_block_id TEXT NOT NULL UNIQUE,
      
      -- Location/artifact metadata
      artifact_code TEXT NOT NULL,
      surface_page TEXT,
      orientation_frame TEXT,
      coordinate TEXT,
      
      -- Block-level linguistic data
      block_logosyll TEXT,
      block_hyphenated TEXT,
      block_maya1 TEXT,
      block_maya2 TEXT,
      block_english TEXT,
      block_graphcodes TEXT,
      
      -- Date fields (multiple calendar systems)
      event_calendar TEXT,
      event_long_count TEXT,
      event_260_day TEXT,
      event_365_day TEXT,
      
      -- Geographic/contextual
      region_origin TEXT,
      site_origin TEXT,
      region_dest TEXT,
      site_dest TEXT,
      person_code TEXT,
      scribe TEXT,
      material TEXT,
      technique TEXT,
      artifact_type TEXT,
      object_description TEXT,
      
      semantic_context TEXT,
      notes TEXT,
      
      -- Images
      block_image1_url TEXT,
      block_image2_url TEXT,
      image_notes TEXT,
      
      -- Sorting
      sort_order INTEGER,
      
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // GRAPHEMES - Individual sign occurrences within blocks
  await db.execute(`
    CREATE TABLE IF NOT EXISTS graphemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      -- Links
      block_id INTEGER NOT NULL,
      catalog_sign_id INTEGER,
      
      -- Grapheme-specific data
      grapheme_code TEXT NOT NULL,
      grapheme_logosyll TEXT,
      grapheme_hyphenated TEXT,
      grapheme_maya TEXT,
      grapheme_english TEXT,
      
      -- For quick filtering without joins
      artifact_code TEXT,
      location_summary TEXT,
      
      FOREIGN KEY (block_id) REFERENCES blocks(id),
      FOREIGN KEY (catalog_sign_id) REFERENCES catalog_signs(id)
    )
  `);

  // ROBOFLOW INSTANCES - Segmented training data
  await db.execute(`
    CREATE TABLE IF NOT EXISTS roboflow_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catalog_sign_id INTEGER,
      
      -- Roboflow metadata
      class_name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      bounding_box TEXT,
      confidence REAL,
      
      source_image_id TEXT,
      dataset_name TEXT DEFAULT 'yax-w4l6k',
      
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (catalog_sign_id) REFERENCES catalog_signs(id)
    )
  `);

  // SOURCES - Reference data
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_code TEXT NOT NULL UNIQUE,
      base_url TEXT NOT NULL,
      requires_login BOOLEAN NOT NULL DEFAULT 0
    )
  `);

  await db.execute(`
    INSERT OR IGNORE INTO sources (name, short_code, base_url, requires_login) VALUES
    ('Maya Hieroglyphic Database', 'mhd', 'https://www.mayadatabase.org/', 1),
    ('Kerr Maya Vase Database', 'kerr', 'http://mayavase.com/', 0),
    ('Corpus of Maya Hieroglyphic Inscriptions', 'cmhi', 'https://peabody.harvard.edu/sites-online', 0),
    ('Roboflow Dataset', 'roboflow', 'https://universe.roboflow.com/maya-glyphs/', 0)
  `);

  // INDEXES for Noah's primary queries
  console.log('Creating indexes...');
  
  // Search by catalog codes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_mhd ON catalog_signs(mhd_code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_thompson ON catalog_signs(thompson_code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_english ON catalog_signs(english_translation)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_wordclass ON catalog_signs(word_class)`);
  
  // Filter blocks by location/date
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_blocks_artifact ON blocks(artifact_code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_blocks_sort ON blocks(sort_order)`);
  
  // Quick grapheme lookups
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_graphemes_code ON graphemes(grapheme_code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_graphemes_block ON graphemes(block_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_graphemes_catalog ON graphemes(catalog_sign_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_graphemes_artifact ON graphemes(artifact_code)`);
  
  // Roboflow lookups
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_roboflow_catalog ON roboflow_instances(catalog_sign_id)`);
  
  console.log('✅ Database schema initialized!');
}
