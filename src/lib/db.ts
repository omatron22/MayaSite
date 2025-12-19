// src/lib/db.ts (fix the cache cleanup section)
import { createClient } from '@libsql/client';

// Detect environment
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions?.node;

// Load .env.local only in Node.js (scripts)
if (isNode && !isBrowser) {
  const { config } = await import('dotenv');
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = join(__dirname, '..', '..');
  
  config({ path: join(projectRoot, '.env.local') });
}

// Get credentials from environment
function getEnvVar(name: string): string {
  // In browser (Vite), use import.meta.env
  if (isBrowser && typeof import.meta !== 'undefined') {
    const viteEnv = (import.meta as any).env;
    return viteEnv?.[name] || '';
  }
  
  // In Node.js, use process.env
  if (isNode) {
    return process.env[name] || '';
  }
  
  return '';
}

const rawUrl = getEnvVar('VITE_TURSO_DATABASE_URL') || getEnvVar('TURSO_DATABASE_URL');
const authToken = getEnvVar('VITE_TURSO_AUTH_TOKEN') || getEnvVar('TURSO_AUTH_TOKEN');

if (!rawUrl || !authToken) {
  console.error('⚠️ Database credentials not found.');
}

// Create database client with connection pooling
export const db = createClient({
  url: rawUrl.replace('libsql://', 'https://').trim(),
  authToken: authToken.trim(),
  // Add connection options for better performance
  intMode: 'number' // Faster integer handling
});

// Query result cache for frequently accessed data
const queryCache = new Map<string, { data: any; timestamp: number }>();
const QUERY_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const MAX_QUERY_CACHE_SIZE = 100;

// Cache-aware query wrapper
export async function cachedQuery(cacheKey: string, queryFn: () => Promise<any>) {
  const cached = queryCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < QUERY_CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await queryFn();
  queryCache.set(cacheKey, { data, timestamp: now });
  
  // Limit cache size - FIX HERE
  if (queryCache.size > MAX_QUERY_CACHE_SIZE) {
    const keysIterator = queryCache.keys();
    const firstKey = keysIterator.next().value;
    if (firstKey !== undefined) {
      queryCache.delete(firstKey);
    }
  }
  
  return data;
}

// Clear cache utility
export function clearQueryCache(pattern?: string) {
  if (pattern) {
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
}

// Initialize database schema (used by scripts only)
export async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS catalog_signs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mhd_code TEXT NOT NULL UNIQUE,
      mhd_code_sub TEXT,
      mhd_code_2003 TEXT,
      thompson_code TEXT,
      thompson_variant TEXT,
      zender_code TEXT,
      kettunen_code TEXT,
      kettunen_1999 TEXT,
      gronemeyer_code TEXT,
      former_mhd_code TEXT,
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
      graphcode TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mhd_block_id TEXT NOT NULL UNIQUE,
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
      block_image1_url TEXT,
      block_image2_url TEXT,
      image_url TEXT,
      image_notes TEXT,
      sort_order INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS graphemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_id INTEGER NOT NULL,
      catalog_sign_id INTEGER,
      grapheme_code TEXT NOT NULL,
      grapheme_logosyll TEXT,
      grapheme_hyphenated TEXT,
      grapheme_maya TEXT,
      grapheme_english TEXT,
      artifact_code TEXT,
      location_summary TEXT,
      FOREIGN KEY (block_id) REFERENCES blocks(id),
      FOREIGN KEY (catalog_sign_id) REFERENCES catalog_signs(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS roboflow_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catalog_sign_id INTEGER,
      class_name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      bounding_box TEXT,
      confidence REAL,
      source_image_id TEXT,
      dataset_split TEXT,
      dataset_name TEXT DEFAULT 'yax-w4l6k',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (catalog_sign_id) REFERENCES catalog_signs(id)
    )
  `);

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

  console.log('Creating indexes...');
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_mhd ON catalog_signs(mhd_code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_graphcode ON catalog_signs(graphcode)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_thompson ON catalog_signs(thompson_code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_syllabic ON catalog_signs(syllabic_value)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_english ON catalog_signs(english_translation)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_wordclass ON catalog_signs(word_class)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_catalog_volume ON catalog_signs(volume)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_blocks_artifact ON blocks(artifact_code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_blocks_region ON blocks(region)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_blocks_calendar ON blocks(event_calendar)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_blocks_sort ON blocks(sort_order)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_graphemes_code ON graphemes(grapheme_code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_graphemes_block ON graphemes(block_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_graphemes_catalog ON graphemes(catalog_sign_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_graphemes_artifact ON graphemes(artifact_code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_roboflow_catalog ON roboflow_instances(catalog_sign_id)`);
  
  console.log('✅ Database schema initialized!');
}
