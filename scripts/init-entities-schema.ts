// scripts/init-entities-schema.ts
// Creates the unified entity layer (entities, entity_aliases, entity_mentions)
// and seeds it with: (a) places from distinct blocks.site_name, (b) scribes
// from blocks.scribe, (c) a curated list of famous Maya rulers so people
// searching e.g. "Pakal" actually find him.
// Run with: npx tsx scripts/init-entities-schema.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’`]/g, '').replace(/\s+/g, ' ').trim();
}

// Curated minimal historical-rulers seed. NOT meant to be exhaustive —
// just covers the most-frequently-searched names that don't appear in
// blocks.person_code (which uses opaque Macri codes).
type Ruler = { canonical: string; aliases: string[]; site: string; description: string };
const RULERS: Ruler[] = [
  { canonical: "K'inich Janaab' Pakal I", aliases: ['Pakal', 'Pacal', 'Pakal the Great', "K'inich Janab Pakal", 'Janaab Pakal'], site: 'Palenque', description: 'Palenque, r. 615-683. Most famous Maya king.' },
  { canonical: "K'inich Kan Bahlam II", aliases: ['Chan Bahlum', "Kan B'alam II", 'Chan Bahlum II'], site: 'Palenque', description: "Palenque, r. 684-702. Son of Pakal." },
  { canonical: "K'inich K'an Joy Chitam II", aliases: ["K'an Joy Chitam", 'Kan Hok Chitam'], site: 'Palenque', description: 'Palenque, r. 702-711.' },
  { canonical: 'Jasaw Chan K\'awiil I', aliases: ['Hasaw Chan K\'awiil', 'Jasaw', 'Ah Cacao'], site: 'Tikal', description: 'Tikal, r. 682-734. Defeated Calakmul 695.' },
  { canonical: "Yik'in Chan K'awiil", aliases: ["Yik'in", 'Yikin Chan Kawil'], site: 'Tikal', description: 'Tikal, r. 734-766. Son of Jasaw Chan K\'awiil I.' },
  { canonical: "Itzamnaaj B'alam II", aliases: ['Shield Jaguar II', 'Shield Jaguar the Great', "Itzamna B'alam"], site: 'Yaxchilan', description: 'Yaxchilan, r. 681-742.' },
  { canonical: 'Bird Jaguar IV', aliases: ["Yaxun B'alam IV", 'Yaxun Balam IV', "Yaxuun B'alam"], site: 'Yaxchilan', description: 'Yaxchilan, r. 752-768. Son of Shield Jaguar II.' },
  { canonical: "K'inich Yax K'uk' Mo'", aliases: ["Yax K'uk Mo", 'Sun-eyed Quetzal Macaw', 'Yax Kuk Mo'], site: 'Copan', description: 'Founder of Copan dynasty, r. ~426-437.' },
  { canonical: "Waxaklajuun Ub'aah K'awiil", aliases: ['18 Rabbit', 'Eighteen Rabbit', 'Waxaklajuun U Bah Kawil'], site: 'Copan', description: 'Copan 13th ruler, r. 695-738.' },
  { canonical: "K'ahk' Yipyaj Chan K'awiil", aliases: ['Smoke Squirrel', 'Smoke Monkey'], site: 'Copan', description: 'Copan 15th ruler, r. 749-763.' },
  { canonical: "Yax Pasaj Chan Yopaat", aliases: ['Yax Pac', 'Yax Pasah'], site: 'Copan', description: 'Copan 16th and last major ruler, r. 763-810.' },
  { canonical: "Yuknoom Ch'een II", aliases: ['Yuknoom the Great', 'Yuknoom Cheen'], site: 'Calakmul', description: 'Calakmul, r. 636-686. Greatest Calakmul ruler.' },
  { canonical: "Yuknoom Yich'aak K'ahk'", aliases: ['Jaguar Paw Smoke', 'Fiery Claw of K\'ahk\''], site: 'Calakmul', description: 'Calakmul, r. 686-695.' },
  { canonical: "K'inich Ich'aak Chapaat", aliases: ['Jaguar Paw of Tonina'], site: 'Tonina', description: 'Tonina ruler.' },
  { canonical: "K'inich B'aaknal Chaak", aliases: ['Baaknal Chaak'], site: 'Tonina', description: 'Tonina, r. 688-715.' },
  { canonical: "Wak Chan K'awiil", aliases: ['Double Bird', "Wak Chan Kawil"], site: 'Tikal', description: 'Tikal, r. 537-562.' },
  { canonical: 'Animal Skull', aliases: ['Animal Headdress', 'Nuun Ujol Chaak'], site: 'Tikal', description: 'Tikal ruler.' },
  { canonical: "Nuun Ujol Chaak", aliases: ['Shield Skull', 'Nun Ujol Chaak'], site: 'Tikal', description: 'Tikal, r. 657-679.' },
  { canonical: "Siyaj K'ahk'", aliases: ['Smoking Frog', "Siyah K'ak'", 'Sihyaj K\'ahk\''], site: 'Tikal', description: 'Teotihuacan-affiliated warrior, AD 378 entrada at Tikal.' },
  { canonical: "K'awiil Chan K'inich", aliases: ['Lord Caracol'], site: 'Caracol', description: 'Caracol ruler.' },
  { canonical: "Yajaw Te' K'inich II", aliases: ['Lord Water'], site: 'Caracol', description: 'Caracol, r. 553-593.' },
  { canonical: "K'inich Yajaw Te'", aliases: ['Smoke Shell'], site: 'Caracol', description: 'Caracol ruler.' },
  { canonical: "K'an II", aliases: ["K'an II of Caracol"], site: 'Caracol', description: 'Caracol, r. 618-658.' },
  { canonical: 'Lady K\'abel', aliases: ['Kabel', "Lady K'ab'el", 'Snake Lady'], site: 'El Peru', description: 'Queen of El Peru-Waka, ~672-692.' },
  { canonical: 'Lady Six Sky', aliases: ['Wak Chanil Ajaw', 'Six Sky'], site: 'Naranjo', description: 'Naranjo queen-regent from Dos Pilas, ruled ~682-741.' },
  { canonical: "K'inich B'alam", aliases: ["K'inich Balam"], site: 'El Peru', description: 'El Peru ruler.' },
  { canonical: 'Tajoom Uk\'ab K\'ahk\'', aliases: ['Tajoom Ukab Kahk', "Tajoom Uk'ab' K'ahk'"], site: 'Calakmul', description: 'Calakmul ruler, early 7th c.' },
  { canonical: "K'inich K'awiil Chan K'inich", aliases: [], site: 'Caracol', description: 'Caracol later ruler.' },
];

async function main() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS entities (
      entity_id TEXT PRIMARY KEY,
      entity_type TEXT CHECK(entity_type IN ('person','scribe','title','place','dynasty','deity','toponym','unknown')),
      canonical_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      description TEXT,
      source_collection_id TEXT,
      source_url TEXT,
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS entity_aliases (
      alias_id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      alias TEXT NOT NULL,
      normalized_alias TEXT NOT NULL,
      script_form TEXT,
      language TEXT,
      source TEXT
    );
    CREATE TABLE IF NOT EXISTS entity_mentions (
      mention_id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      block_id INTEGER,
      grapheme_id INTEGER,
      source_item_id TEXT,
      mention_text TEXT,
      confidence REAL,
      match_method TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_entities_norm ON entities(normalized_name);
    CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
    CREATE INDEX IF NOT EXISTS idx_entity_aliases_norm ON entity_aliases(normalized_alias);
    CREATE INDEX IF NOT EXISTS idx_entity_aliases_entity ON entity_aliases(entity_id);
    CREATE INDEX IF NOT EXISTS idx_entity_mentions_block ON entity_mentions(block_id);
    CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON entity_mentions(entity_id);
  `);
  console.log('entities + entity_aliases + entity_mentions tables ready.\n');

  // (a) Places — distinct site_name from blocks
  console.log('Seeding place entities from blocks.site_name...');
  const sites = await db.execute(
    `SELECT DISTINCT site_name FROM blocks WHERE site_name IS NOT NULL AND site_name != ''`
  );
  const placeStmts: { sql: string; args: (string | number | null)[] }[] = [];
  for (const r of sites.rows) {
    const name = String(r.site_name).trim();
    if (!name) continue;
    const id = `place-${norm(name).replace(/[^a-z0-9]+/g, '-')}`;
    placeStmts.push({
      sql: `INSERT OR IGNORE INTO entities (entity_id, entity_type, canonical_name, normalized_name, source_collection_id)
            VALUES (?, 'place', ?, ?, 'mhd')`,
      args: [id, name, norm(name)],
    });
  }
  for (let i = 0; i < placeStmts.length; i += 100) await db.batch(placeStmts.slice(i, i + 100), 'write');
  console.log(`  ${placeStmts.length} place entities seeded.`);

  // (b) Scribes — distinct scribe from blocks
  console.log('Seeding scribe entities from blocks.scribe...');
  const scribes = await db.execute(
    `SELECT DISTINCT scribe FROM blocks WHERE scribe IS NOT NULL AND scribe != ''`
  );
  const scribeStmts: { sql: string; args: (string | number | null)[] }[] = [];
  for (const r of scribes.rows) {
    const name = String(r.scribe).trim();
    if (!name) continue;
    const id = `scribe-${norm(name).replace(/[^a-z0-9]+/g, '-')}`;
    scribeStmts.push({
      sql: `INSERT OR IGNORE INTO entities (entity_id, entity_type, canonical_name, normalized_name, description, source_collection_id)
            VALUES (?, 'scribe', ?, ?, 'Scribe (Macri-Vail attribution)', 'mhd')`,
      args: [id, name, norm(name)],
    });
  }
  for (let i = 0; i < scribeStmts.length; i += 100) await db.batch(scribeStmts.slice(i, i + 100), 'write');
  console.log(`  ${scribeStmts.length} scribe entities seeded.`);

  // (c) Curated famous rulers
  console.log('Seeding curated famous-rulers list...');
  for (const r of RULERS) {
    const id = `ruler-${norm(r.canonical).replace(/[^a-z0-9]+/g, '-')}`;
    await db.execute({
      sql: `INSERT OR REPLACE INTO entities (entity_id, entity_type, canonical_name, normalized_name, description, source_collection_id, source_url)
            VALUES (?, 'person', ?, ?, ?, 'mayasite-curated', 'https://en.wikipedia.org/wiki/Maya_civilization')`,
      args: [id, r.canonical, norm(r.canonical), `${r.description} Primary site: ${r.site}.`],
    });
    // Insert each alias (including the canonical itself for direct match)
    const allAliases = [r.canonical, ...r.aliases, r.site];
    for (const a of allAliases) {
      const aliasId = `alias-${id}-${norm(a).replace(/[^a-z0-9]+/g, '-')}`;
      await db.execute({
        sql: `INSERT OR IGNORE INTO entity_aliases (alias_id, entity_id, alias, normalized_alias, source)
              VALUES (?, ?, ?, ?, 'mayasite-curated')`,
        args: [aliasId, id, a, norm(a)],
      });
    }
  }
  console.log(`  ${RULERS.length} curated rulers seeded.`);

  // mayasite-curated collection seed (if missing)
  await db.execute({
    sql: `INSERT OR IGNORE INTO source_collections (collection_id, title, provider, source_url, rights_note, response_format, last_imported_at)
          VALUES ('mayasite-curated', 'MayaSite curated content', 'MayaSite project', 'in-repo: scripts/', 'Original to MayaSite, free to use with attribution.', 'in-repo TypeScript', datetime('now'))`,
    args: [],
  });

  // Totals
  const totalsByType = await db.execute(
    `SELECT entity_type, COUNT(*) AS n FROM entities GROUP BY entity_type`
  );
  console.log('\nEntities by type:');
  totalsByType.rows.forEach(r => console.log(`  ${r.entity_type}: ${r.n}`));

  // Verify PAKAL now findable
  const pakal = await db.execute({
    sql: `SELECT e.canonical_name FROM entities e
          JOIN entity_aliases a ON a.entity_id = e.entity_id
          WHERE a.normalized_alias = ? LIMIT 1`,
    args: ['pakal'],
  });
  console.log(`\nSearch "pakal" hits entity: ${pakal.rows[0]?.canonical_name ?? '(none)'}`);

  console.log('\nDONE.');
}

main().catch((err) => { console.error(err); process.exit(1); });
