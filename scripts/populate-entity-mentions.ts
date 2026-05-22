// scripts/populate-entity-mentions.ts
// Links blocks to entities:
//   * places: by exact match on blocks.site_name → entities.canonical_name (type=place)
//   * persons: by substring match of any entity_alias.normalized_alias in
//     normalized(transcription_1 || block_english)
// Idempotent (INSERT OR IGNORE on UNIQUE(entity_id, block_id, mention_text)).
// Run with: npx tsx scripts/populate-entity-mentions.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

function normalize(s: string | null): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['‘’ʼʻ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function ensureUniqueIndex() {
  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_mentions
     ON entity_mentions(entity_id, block_id, mention_text)`
  );
}

async function batchExecute(stmts: { sql: string; args: (string | number | null)[] }[]) {
  const BATCH = 200;
  for (let i = 0; i < stmts.length; i += BATCH) {
    await db.batch(stmts.slice(i, i + BATCH), 'write');
  }
}

async function main() {
  await ensureUniqueIndex();

  // --- 1) place mentions from blocks.site_name ---
  console.log('Linking blocks → place entities by site_name...');
  const placeRes = await db.execute(`
    SELECT b.id AS block_id, b.site_name, e.entity_id
    FROM blocks b
    JOIN entities e
      ON e.entity_type = 'place'
     AND e.normalized_name = LOWER(TRIM(b.site_name))
    WHERE b.site_name IS NOT NULL AND b.site_name != ''
  `);
  console.log(`  ${placeRes.rows.length} block→place links found.`);

  const placeStmts = placeRes.rows.map((r) => ({
    sql: `INSERT OR IGNORE INTO entity_mentions
            (mention_id, entity_id, block_id, mention_text, confidence, match_method)
          VALUES (?, ?, ?, ?, 1.0, 'site_name_exact')`,
    args: [
      `pm-${r.entity_id}-${r.block_id}`,
      String(r.entity_id),
      Number(r.block_id),
      String(r.site_name),
    ] as (string | number | null)[],
  }));
  await batchExecute(placeStmts);
  console.log(`  ${placeStmts.length} place mentions inserted (idempotent).`);

  // --- 2) person mentions by alias substring match ---
  console.log('\nLoading person aliases...');
  const aliasRows = await db.execute(`
    SELECT a.entity_id, a.alias, a.normalized_alias
    FROM entity_aliases a
    JOIN entities e ON e.entity_id = a.entity_id
    WHERE e.entity_type = 'person'
      AND LENGTH(a.normalized_alias) >= 4
  `);

  // Group by normalized_alias so duplicate aliases across entities all get a hit.
  const aliasMap = new Map<string, { entity_id: string; alias: string }[]>();
  aliasRows.rows.forEach((r) => {
    const norm = String(r.normalized_alias);
    if (!aliasMap.has(norm)) aliasMap.set(norm, []);
    aliasMap.get(norm)!.push({
      entity_id: String(r.entity_id),
      alias: String(r.alias),
    });
  });
  console.log(`  ${aliasRows.rows.length} aliases loaded (${aliasMap.size} unique normalized).`);

  console.log('\nScanning block transcriptions for alias matches...');
  const blocks = await db.execute(`
    SELECT id, transcription_1, block_english, block_logosyll
    FROM blocks
    WHERE transcription_1 IS NOT NULL
       OR block_english IS NOT NULL
       OR block_logosyll IS NOT NULL
  `);
  console.log(`  Scanning ${blocks.rows.length} blocks...`);

  const personStmts: { sql: string; args: (string | number | null)[] }[] = [];
  let matchedBlocks = 0;
  for (const b of blocks.rows) {
    const blockId = Number(b.id);
    const haystack = normalize(
      [b.transcription_1, b.block_english, b.block_logosyll]
        .filter((s) => s != null && s !== '_' && s !== '')
        .join(' ')
    );
    if (haystack.length < 4) continue;

    let hit = false;
    for (const [norm, entries] of aliasMap) {
      // word-boundary-ish: surround with spaces in haystack
      if ((' ' + haystack + ' ').includes(' ' + norm + ' ') ||
          haystack.startsWith(norm + ' ') ||
          haystack.endsWith(' ' + norm) ||
          haystack === norm) {
        hit = true;
        for (const { entity_id, alias } of entries) {
          personStmts.push({
            sql: `INSERT OR IGNORE INTO entity_mentions
                    (mention_id, entity_id, block_id, mention_text, confidence, match_method)
                  VALUES (?, ?, ?, ?, 0.7, 'alias_substring')`,
            args: [
              `pa-${entity_id}-${blockId}-${norm.replace(/\s+/g, '_').slice(0, 30)}`,
              entity_id,
              blockId,
              alias,
            ],
          });
        }
      }
    }
    if (hit) matchedBlocks++;
  }
  console.log(`  ${matchedBlocks} blocks had at least one alias hit.`);
  console.log(`  ${personStmts.length} person mention rows queued.`);

  await batchExecute(personStmts);

  // --- summary ---
  const total = await db.execute('SELECT COUNT(*) AS n FROM entity_mentions');
  const byType = await db.execute(`
    SELECT e.entity_type, COUNT(*) AS n
    FROM entity_mentions m JOIN entities e ON e.entity_id = m.entity_id
    GROUP BY e.entity_type
  `);
  console.log(`\nTotal entity_mentions: ${total.rows[0].n}`);
  byType.rows.forEach((r) => console.log(`  ${r.entity_type}: ${r.n}`));

  // Show top mentioned rulers
  const topPersons = await db.execute(`
    SELECT e.canonical_name, COUNT(DISTINCT m.block_id) AS blocks
    FROM entity_mentions m
    JOIN entities e ON e.entity_id = m.entity_id
    WHERE e.entity_type = 'person'
    GROUP BY e.entity_id
    ORDER BY blocks DESC
    LIMIT 10
  `);
  console.log('\nTop 10 persons by block mentions:');
  topPersons.rows.forEach((r) => console.log(`  ${r.canonical_name}: ${r.blocks} blocks`));

  console.log('\nDONE.');
}

main().catch((err) => { console.error(err); process.exit(1); });
