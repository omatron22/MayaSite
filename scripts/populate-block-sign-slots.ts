// scripts/populate-block-sign-slots.ts
// Parses block_graphcodes from all 208K blocks into block_sign_slots rows.
// Each space-separated token in block_graphcodes becomes one slot.
// Run with: npx tsx scripts/populate-block-sign-slots.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('Populating block_sign_slots from block_graphcodes...\n');

  // Check existing
  const existing = await db.execute(`SELECT COUNT(*) as count FROM block_sign_slots`);
  if (Number(existing.rows[0].count) > 0) {
    console.log(`Already have ${existing.rows[0].count} slots. Skipping.`);
    console.log('To re-run, first: DELETE FROM block_sign_slots');
    return;
  }

  // Build MHD catalog_code → entry_id lookup from catalog_entries
  const entriesResult = await db.execute(`
    SELECT entry_id, catalog_code, legacy_catalog_sign_id
    FROM catalog_entries WHERE catalog = 'MHD'
  `);
  const codeToEntry = new Map<string, string>();
  for (const row of entriesResult.rows) {
    codeToEntry.set(String(row.catalog_code), String(row.entry_id));
  }

  // Also build graphcode → entry_id (some codes use graphcode rather than mhd_code_sub)
  const signResult = await db.execute(`
    SELECT cs.id, cs.graphcode, cs.mhd_code_sub, cs.mhd_code
    FROM catalog_signs cs
  `);
  const signIdToEntry = new Map<number, string>();
  for (const row of entriesResult.rows) {
    if (row.legacy_catalog_sign_id != null) {
      signIdToEntry.set(Number(row.legacy_catalog_sign_id), String(row.entry_id));
    }
  }

  // Build code lookup: try graphcode, mhd_code_sub, mhd_code
  const graphcodeToEntry = new Map<string, string>();
  for (const row of signResult.rows) {
    const entryId = signIdToEntry.get(Number(row.id));
    if (!entryId) continue;
    if (row.graphcode) graphcodeToEntry.set(String(row.graphcode), entryId);
    if (row.mhd_code_sub) graphcodeToEntry.set(String(row.mhd_code_sub), entryId);
    if (row.mhd_code) graphcodeToEntry.set(String(row.mhd_code), entryId);
  }

  console.log(`Loaded ${codeToEntry.size} catalog_code lookups, ${graphcodeToEntry.size} graphcode lookups.\n`);

  function lookupEntry(code: string): string | null {
    return codeToEntry.get(code) || graphcodeToEntry.get(code) || null;
  }

  // Process blocks in batches
  const BLOCK_BATCH = 5000;
  const INSERT_BATCH = 500;
  let totalSlots = 0;
  let eroded = 0;
  let uncertain = 0;
  let certain = 0;
  let unmatched = 0;

  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const blocksResult = await db.execute({
      sql: `SELECT id, block_graphcodes FROM blocks
            WHERE block_graphcodes IS NOT NULL AND block_graphcodes != ''
            ORDER BY id LIMIT ? OFFSET ?`,
      args: [BLOCK_BATCH, offset],
    });

    if (blocksResult.rows.length === 0) {
      hasMore = false;
      break;
    }

    let inserts: { sql: string; args: (string | number | null)[] }[] = [];

    for (const block of blocksResult.rows) {
      const blockId = Number(block.id);
      const graphcodes = String(block.block_graphcodes).trim();
      if (!graphcodes) continue;

      const tokens = graphcodes.split(/\s+/);

      for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i].trim();
        if (!token) continue;

        const slotId = `bss-${blockId}-${i}`;
        let certaintyVal: string;
        let entryId: string | null = null;

        if (token === '000') {
          certaintyVal = 'eroded';
          eroded++;
        } else if (token.endsWith('?')) {
          certaintyVal = 'uncertain';
          token = token.slice(0, -1);
          entryId = lookupEntry(token);
          uncertain++;
          if (!entryId) unmatched++;
        } else {
          certaintyVal = 'certain';
          entryId = lookupEntry(token);
          certain++;
          if (!entryId) unmatched++;
        }

        inserts.push({
          sql: `INSERT INTO block_sign_slots
                (slot_id, block_id, slot_position, catalog_entry, certainty, raw_code)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [slotId, blockId, i, entryId, certaintyVal, tokens[i]],
        });

        totalSlots++;

        if (inserts.length >= INSERT_BATCH) {
          await db.batch(inserts, 'write');
          inserts = [];
        }
      }
    }

    if (inserts.length > 0) {
      await db.batch(inserts, 'write');
    }

    offset += blocksResult.rows.length;
    if (offset % 20000 === 0) {
      console.log(`  Processed ${offset} blocks, ${totalSlots} slots so far...`);
    }
  }

  console.log(`\n=== Block Sign Slots Complete ===`);
  console.log(`Total slots: ${totalSlots}`);
  console.log(`  Certain: ${certain}`);
  console.log(`  Uncertain: ${uncertain}`);
  console.log(`  Eroded: ${eroded}`);
  console.log(`  Unmatched codes: ${unmatched}`);

  // Verify
  const verify = await db.execute(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN certainty = 'certain' THEN 1 ELSE 0 END) as certain,
      SUM(CASE WHEN certainty = 'uncertain' THEN 1 ELSE 0 END) as uncertain,
      SUM(CASE WHEN certainty = 'eroded' THEN 1 ELSE 0 END) as eroded,
      SUM(CASE WHEN catalog_entry IS NOT NULL THEN 1 ELSE 0 END) as linked
    FROM block_sign_slots
  `);
  const v = verify.rows[0] as Record<string, number>;
  console.log(`\nVerification: ${v.total} slots (${v.linked} linked, ${v.certain} certain, ${v.uncertain} uncertain, ${v.eroded} eroded)`);
}

main().catch(console.error);
