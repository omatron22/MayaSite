/**
 * Populates position_in_block for block_sign_slots using the blhyphen field.
 *
 * Heuristic derived from MHD blhyphen conventions:
 *   - Hyphens connect affixes to roots (morphological boundaries within a word)
 *   - Spaces separate independent morphemes/words
 *
 * Rules:
 *   1. Code "000" → position = "eroded"
 *   2. Parse blhyphen into tokens, preserving hyphen vs space boundaries
 *   3. Find the "main sign" — the first logographic sign, or if all syllabic,
 *      the first sign in a space-separated group
 *   4. Signs hyphen-connected BEFORE the main sign → "prefix"
 *   5. Signs hyphen-connected AFTER the main sign → "suffix"
 *   6. Space-separated signs → "main" (independent morphemes)
 *   7. Fallback: first sign = "main", rest = "suffix"
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Load MHD catalog for usage1 lookup (logographic vs syllabic)
const catalog = JSON.parse(readFileSync('data/mhd-catalog-all.json', 'utf8'));
const usageLookup = new Map<string, string>();
for (const r of catalog) {
  usageLookup.set(r.graphcode, r.usage1 || '');
  if (r.graphcode1) usageLookup.set(r.graphcode1, r.usage1 || '');
}

function getUsage(code: string): string {
  // Strip variant suffix (lowercase letters) and ? from end
  const base = code.replace(/[a-z?]+$/i, '');
  return usageLookup.get(code) || usageLookup.get(base) || '';
}

interface TokenInfo {
  reading: string;       // the reading from blhyphen
  joinedToPrev: boolean; // true if connected by hyphen to previous token
  joinedToNext: boolean; // true if connected by hyphen to next token
}

function parseHyphen(blhyphen: string): TokenInfo[] {
  if (!blhyphen || blhyphen === '_') return [];

  const tokens: TokenInfo[] = [];
  // Split into words (space-separated), then within words split on hyphens
  const words = blhyphen.split(/\s+/);
  for (const word of words) {
    const parts = word.split('-');
    for (let i = 0; i < parts.length; i++) {
      tokens.push({
        reading: parts[i],
        joinedToPrev: i > 0, // hyphenated to previous within this word
        joinedToNext: i < parts.length - 1, // hyphenated to next within this word
      });
    }
  }
  return tokens;
}

function assignPositions(codes: string[], hyphenTokens: TokenInfo[]): string[] {
  const positions: string[] = [];

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];

    // Eroded
    if (code === '000') {
      positions.push('eroded');
      continue;
    }

    const usage = getUsage(code.replace(/\?$/, ''));
    const token = hyphenTokens[i];

    if (!token) {
      // No hyphen data — use heuristic based on usage and position
      if (usage === 'logographic' || usage === 'both') {
        positions.push('main');
      } else if (usage === 'syllabic') {
        // Check if there's already a main sign before us
        const hasMainBefore = positions.some(p => p === 'main');
        positions.push(hasMainBefore ? 'suffix' : 'prefix');
      } else {
        // Unknown usage — first non-eroded = main, rest = suffix
        const hasMainBefore = positions.some(p => p === 'main');
        positions.push(hasMainBefore ? 'suffix' : 'main');
      }
      continue;
    }

    // Has hyphen data
    if (!token.joinedToPrev && !token.joinedToNext) {
      // Space-separated = independent morpheme = main sign
      positions.push('main');
    } else if (token.joinedToNext && !token.joinedToPrev) {
      // Start of a hyphenated chain
      // If logographic, it's the main sign of this word
      if (usage === 'logographic' || usage === 'both') {
        positions.push('main');
      } else {
        // Syllabic at start of chain → prefix
        positions.push('prefix');
      }
    } else if (token.joinedToPrev && !token.joinedToNext) {
      // End of a hyphenated chain → suffix
      positions.push('suffix');
    } else {
      // Middle of chain (joined both sides)
      if (usage === 'logographic' || usage === 'both') {
        positions.push('main');
      } else {
        // Middle syllabic → suffix (phonetic complement)
        positions.push('suffix');
      }
    }
  }

  // Ensure at least one main sign if we have non-eroded signs
  const hasMain = positions.some(p => p === 'main');
  if (!hasMain) {
    // Find first non-eroded slot and make it main
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] !== 'eroded') {
        positions[i] = 'main';
        break;
      }
    }
  }

  return positions;
}

async function main() {
  console.log('Loading blocks with blhyphen data...');

  // Get all blocks that have graphcodes
  const blocksResult = await db.execute(`
    SELECT id, block_graphcodes, block_hyphenated
    FROM blocks
    WHERE block_graphcodes IS NOT NULL AND block_graphcodes != '' AND block_graphcodes != '_'
  `);

  console.log(`Blocks with graphcodes: ${blocksResult.rows.length}`);

  // Get all block_sign_slots
  const slotsResult = await db.execute(`
    SELECT slot_id, block_id, slot_position, raw_code, certainty
    FROM block_sign_slots
    ORDER BY block_id, slot_position
  `);

  console.log(`Total slots: ${slotsResult.rows.length}`);

  // Group slots by block_id
  const slotsByBlock = new Map<string, Array<{ slot_id: string; raw_code: string; position: number }>>();
  for (const row of slotsResult.rows) {
    const blockId = String(row.block_id);
    if (!slotsByBlock.has(blockId)) slotsByBlock.set(blockId, []);
    slotsByBlock.get(blockId)!.push({
      slot_id: String(row.slot_id),
      raw_code: String(row.raw_code),
      position: Number(row.slot_position),
    });
  }

  // Build block lookup for hyphen data
  const blockHyphen = new Map<string, string>();
  const blockCodes = new Map<string, string>();
  for (const row of blocksResult.rows) {
    blockHyphen.set(String(row.id), String(row.block_hyphenated || ''));
    blockCodes.set(String(row.id), String(row.block_graphcodes || ''));
  }

  console.log(`Blocks with slots: ${slotsByBlock.size}`);

  // Process each block
  const updates: { sql: string; args: (string | null)[] }[] = [];
  let processed = 0;
  let assigned = 0;

  for (const [blockId, slots] of slotsByBlock) {
    const hyphen = blockHyphen.get(blockId) || '';
    const graphcodes = blockCodes.get(blockId) || '';
    const codes = graphcodes.split(' ').filter(c => c);

    // Parse hyphen tokens
    const hyphenTokens = parseHyphen(hyphen);

    // Assign positions
    const positions = assignPositions(
      slots.map(s => s.raw_code),
      hyphenTokens,
    );

    // Create update statements
    for (let i = 0; i < slots.length; i++) {
      const pos = positions[i];
      if (pos) {
        updates.push({
          sql: `UPDATE block_sign_slots SET position_in_block = ? WHERE slot_id = ?`,
          args: [pos, slots[i].slot_id],
        });
        assigned++;
      }
    }

    processed++;
    if (processed % 10000 === 0) {
      console.log(`  ${processed} blocks processed, ${assigned} positions assigned`);
    }
  }

  console.log(`\nTotal: ${processed} blocks, ${assigned} positions to assign`);

  // Execute in batches
  const BATCH = 100;
  let updated = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    try {
      await db.batch(batch);
      updated += batch.length;
    } catch (e) {
      // Retry once
      try {
        await new Promise(r => setTimeout(r, 2000));
        await db.batch(batch);
        updated += batch.length;
      } catch (e2) {
        console.error(`Failed batch at ${i}:`, e2);
      }
    }

    if ((i / BATCH) % 100 === 0 && i > 0) {
      console.log(`  ${updated} / ${updates.length} slots updated`);
    }
  }

  console.log(`\nDone: ${updated} slots updated with position_in_block`);

  // Verify
  const verify = await db.execute(`
    SELECT position_in_block, COUNT(*) as c
    FROM block_sign_slots
    GROUP BY position_in_block
    ORDER BY c DESC
  `);
  console.log('\nPosition distribution:');
  for (const row of verify.rows) {
    console.log(`  ${row.position_in_block || 'NULL'}: ${row.c}`);
  }
}

main().catch(console.error);
