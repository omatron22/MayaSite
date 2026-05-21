// scripts/init-source-collections-schema.ts
// Creates the shared source-collection schema (source_collections,
// source_items, source_item_sign_links) used by all future external
// data imports. Idempotent. Run with:
//   npx tsx scripts/init-source-collections-schema.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('Creating source-collection schema...\n');

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS source_collections (
      collection_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      provider TEXT NOT NULL,
      source_url TEXT NOT NULL,
      rights_note TEXT,
      response_format TEXT,
      last_imported_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS source_items (
      item_id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      title TEXT,
      creator TEXT,
      site_name TEXT,
      monument_type TEXT,
      monument_number TEXT,
      object_number TEXT,
      culture TEXT,
      period TEXT,
      material TEXT,
      dimensions TEXT,
      description TEXT,
      notes TEXT,
      image_url TEXT,
      thumb_url TEXT,
      source_url TEXT NOT NULL,
      rights_note TEXT,
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(collection_id, external_id)
    );

    CREATE TABLE IF NOT EXISTS source_item_sign_links (
      link_id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      catalog_sign_id INTEGER,
      catalog_entry TEXT,
      graph_id TEXT,
      raw_code TEXT,
      match_method TEXT,
      confidence REAL,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_source_items_collection ON source_items(collection_id);
    CREATE INDEX IF NOT EXISTS idx_source_items_site ON source_items(site_name);
    CREATE INDEX IF NOT EXISTS idx_source_links_item ON source_item_sign_links(item_id);
    CREATE INDEX IF NOT EXISTS idx_source_links_sign ON source_item_sign_links(catalog_sign_id);
    CREATE INDEX IF NOT EXISTS idx_source_links_entry ON source_item_sign_links(catalog_entry);
  `);

  // Seed known existing collections so other imports can reference them.
  const seeds = [
    {
      id: 'mhd',
      title: 'Maya Hieroglyphic Database',
      provider: 'tDAR / MHD project',
      url: 'https://mayadatabase.org',
      rights: 'No open reuse license; scholarly use only. Cite tDAR id 514652, doi:10.48512/XCV8514652.',
      format: 'JSON snapshots imported via scripts/import-mhd-*',
    },
    {
      id: 'twkm',
      title: 'ClassicMayan / Bonn / TWKM',
      provider: 'TWKM, University of Bonn',
      url: 'https://classicmayan.org',
      rights: 'CC BY 4.0',
      format: 'JSON: data.en.json',
    },
    {
      id: 'lmgg',
      title: 'Learner’s Maya Glyph Guide',
      provider: 'mayaglyphs.org',
      url: 'https://mayaglyphs.org',
      rights: 'No open license; scholarly/noncommercial attribution-only.',
      format: 'HTML scrape',
    },
    {
      id: 'kerr-vases',
      title: 'Kerr Maya Vase Database',
      provider: 'Justin Kerr / Mayavase.com',
      url: 'https://research.mayavase.com/kerrmaya.html',
      rights: '© Justin Kerr. Permission-required; link only.',
      format: 'HTML scrape',
    },
    {
      id: 'cmhi',
      title: 'Corpus of Maya Hieroglyphic Inscriptions',
      provider: 'Harvard Peabody Museum',
      url: 'https://peabody.harvard.edu/cmhi',
      rights: 'Personal scholarly use only unless permission granted.',
      format: 'HTML scrape',
    },
    {
      id: 'roboflow-yax',
      title: 'Roboflow Maya glyph dataset (yax)',
      provider: 'utz’ib, Roboflow Universe',
      url: 'https://universe.roboflow.com/maya-glyphs/yax-w4l6k',
      rights: 'CC BY-NC-SA 4.0',
      format: 'COCO export',
    },
    {
      id: 'mayasite-sites',
      title: 'MayaSite site coordinates',
      provider: 'MayaSite project',
      url: '(in-repo: src/lib/sites.ts)',
      rights: 'MayaSite project data, hand-compiled.',
      format: 'TypeScript source',
    },
  ];

  for (const s of seeds) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO source_collections
            (collection_id, title, provider, source_url, rights_note, response_format, last_imported_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [s.id, s.title, s.provider, s.url, s.rights, s.format],
    });
  }

  const cnt = await db.execute('SELECT COUNT(*) AS n FROM source_collections');
  console.log(`Seeded source_collections: ${cnt.rows[0].n} rows.`);
  console.log('DONE.');
}

main().catch((err) => { console.error(err); process.exit(1); });
