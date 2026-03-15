/**
 * Imports 3 MHD grapheme-level fields that were not originally imported:
 *   - dictionary: dictionary references (9,704 graphemes)
 *   - evidence: evidence codes (42,472 graphemes)
 *   - substitution: substitution patterns (10,018 graphemes)
 *
 * Matches source graphemes to DB graphemes by (block_id, grapheme_code).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // Add columns if they don't exist
  for (const col of ['dictionary', 'evidence', 'substitution']) {
    try {
      await db.execute(`ALTER TABLE graphemes ADD COLUMN ${col} TEXT`);
      console.log(`Added ${col} column`);
    } catch {
      console.log(`${col} column already exists`);
    }
  }

  // Load source data
  const graphemes = JSON.parse(readFileSync('data/mhd-graphemes-all.json', 'utf8'));
  console.log(`Source graphemes: ${graphemes.length}`);

  // Filter to those with data
  const withData = graphemes.filter((g: any) =>
    (g.dictionary && g.dictionary.trim()) ||
    (g.evidence && g.evidence.trim()) ||
    (g.substitution && g.substitution.trim())
  );
  console.log(`Graphemes with dictionary/evidence/substitution: ${withData.length}`);

  // Get all blocks to map mhd_block_id → our block id
  // MHD block identity: artifact_code + blsort
  const blocksResult = await db.execute(`
    SELECT id, artifact_code, sort_order FROM blocks
  `);
  const blockLookup = new Map<string, number>();
  for (const row of blocksResult.rows) {
    const key = `${row.artifact_code}-${row.sort_order}`;
    blockLookup.set(key, Number(row.id));
  }
  console.log(`Block lookup entries: ${blockLookup.size}`);

  // Get all graphemes to map block_id + code → grapheme id
  const dbGraphemes = await db.execute(`
    SELECT id, block_id, grapheme_code FROM graphemes
  `);
  const graphemeLookup = new Map<string, number>();
  for (const row of dbGraphemes.rows) {
    const key = `${row.block_id}-${row.grapheme_code}`;
    graphemeLookup.set(key, Number(row.id));
  }
  console.log(`Grapheme lookup entries: ${graphemeLookup.size}`);

  // Build updates
  const updates: { sql: string; args: (string | number | null)[] }[] = [];
  let matched = 0;

  for (const g of withData) {
    const blockKey = `${g.objabbr}-${g.blsort}`;
    const blockId = blockLookup.get(blockKey);
    if (!blockId) continue;

    const graphemeKey = `${blockId}-${g.grgraphcode}`;
    const graphemeId = graphemeLookup.get(graphemeKey);
    if (!graphemeId) continue;

    const dict = g.dictionary?.trim() || null;
    const evid = g.evidence?.trim() || null;
    const subst = g.substitution?.trim() || null;

    if (dict || evid || subst) {
      updates.push({
        sql: `UPDATE graphemes SET dictionary = ?, evidence = ?, substitution = ? WHERE id = ?`,
        args: [dict, evid, subst, graphemeId],
      });
      matched++;
    }
  }

  console.log(`\nMatched graphemes to update: ${matched}`);

  // Execute in batches
  const BATCH = 100;
  let updated = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    try {
      await db.batch(batch);
      updated += batch.length;
    } catch {
      try {
        await new Promise(r => setTimeout(r, 2000));
        await db.batch(batch);
        updated += batch.length;
      } catch (e2) {
        console.error(`Failed batch at ${i}:`, e2);
      }
    }
    if ((i / BATCH) % 50 === 0 && i > 0) {
      console.log(`  ${updated} / ${updates.length} updated`);
    }
  }

  console.log(`\nDone: ${updated} graphemes updated`);

  // Verify
  for (const col of ['dictionary', 'evidence', 'substitution']) {
    const v = await db.execute(
      `SELECT COUNT(*) as c FROM graphemes WHERE ${col} IS NOT NULL AND ${col} != ''`
    );
    console.log(`${col}: ${v.rows[0].c} populated`);
  }
}

main().catch(console.error);
