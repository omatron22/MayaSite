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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS signs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bonn_id TEXT,
      thompson_id TEXT,
      mhd_id TEXT,
      phonetic_value TEXT,
      description TEXT,
      primary_image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sign_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sign_id INTEGER NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      image_url TEXT,
      date_start INTEGER,
      date_end INTEGER,
      location TEXT,
      artifact_type TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sign_id) REFERENCES signs(id)
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
}
