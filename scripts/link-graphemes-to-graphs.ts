/**
 * Links graphemes to graph variants via the concordance path.
 * Uses pre-computed mapping + small batches with retry logic for Turso timeouts.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function retry<T>(fn: () => Promise<T>, attempts = 3, delay = 2000): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      console.log(`  Retry ${i + 1}/${attempts} after error...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}

async function main() {
  console.log('Step 1: Building sign → graph mapping...\n');

  // This query is the expensive one. Break it into two steps to avoid timeout.
  // Step 1a: Get TWKM entries that have graphs
  const twkmWithGraphs = await retry(() => db.execute(`
    SELECT DISTINCT g.catalog_entry as twkm_entry, g.graph_id, g.variant_suffix
    FROM graphs g
    ORDER BY g.catalog_entry,
      CASE WHEN g.variant_suffix = 'st' THEN 0 ELSE 1 END,
      g.variant_suffix
  `));
  console.log(`  TWKM entries with graphs: ${new Set(twkmWithGraphs.rows.map(r => r.twkm_entry)).size}`);

  // Deduplicate: best graph per TWKM entry
  const twkmToGraph = new Map<string, string>();
  for (const row of twkmWithGraphs.rows) {
    const entry = String(row.twkm_entry);
    if (!twkmToGraph.has(entry)) {
      twkmToGraph.set(entry, String(row.graph_id));
    }
  }

  // Step 1b: Get concordance links from TWKM → MHD
  const links = await retry(() => db.execute(`
    SELECT cl.entry_a, cl.entry_b,
           mhd.entry_id as mhd_entry, mhd.legacy_catalog_sign_id as sign_id
    FROM concordance_links cl
    JOIN catalog_entries mhd ON (
      mhd.entry_id = cl.entry_a OR mhd.entry_id = cl.entry_b
    )
    WHERE mhd.catalog = 'MHD' AND mhd.legacy_catalog_sign_id IS NOT NULL
  `));
  console.log(`  Concordance links involving MHD: ${links.rows.length}`);

  // Build sign_id → graph_id mapping
  const signToGraph = new Map<number, string>();
  const entryToGraph = new Map<string, string>();

  for (const row of links.rows) {
    const mhdEntry = String(row.mhd_entry);
    const otherEntry = String(row.entry_a) === mhdEntry ? String(row.entry_b) : String(row.entry_a);
    const graphId = twkmToGraph.get(otherEntry);
    if (graphId) {
      const signId = Number(row.sign_id);
      if (!signToGraph.has(signId)) {
        signToGraph.set(signId, graphId);
      }
      if (!entryToGraph.has(mhdEntry)) {
        entryToGraph.set(mhdEntry, graphId);
      }
    }
  }

  console.log(`\n  sign → graph mappings: ${signToGraph.size}`);
  console.log(`  entry → graph mappings: ${entryToGraph.size}`);

  // Step 2: Update graphemes
  console.log('\nStep 2: Updating graphemes...');
  const BATCH = 10;
  let graphemeUpdated = 0;
  const signEntries = Array.from(signToGraph.entries());

  for (let i = 0; i < signEntries.length; i += BATCH) {
    const batch = signEntries.slice(i, i + BATCH);
    try {
      const results = await retry(() => db.batch(
        batch.map(([signId, graphId]) => ({
          sql: 'UPDATE graphemes SET graph_id = ? WHERE catalog_sign_id = ?',
          args: [graphId, signId],
        }))
      ));
      graphemeUpdated += results.reduce((sum, r) => sum + (r.rowsAffected || 0), 0);
    } catch (err) {
      console.error(`  Batch at ${i} failed:`, (err as Error).message);
    }

    if (i % 100 === 0) {
      console.log(`  ${i}/${signEntries.length} signs, ${graphemeUpdated} graphemes updated`);
    }
  }
  console.log(`  Done: ${graphemeUpdated} graphemes linked`);

  // Step 3: Update block_sign_slots
  console.log('\nStep 3: Updating block_sign_slots...');
  let slotUpdated = 0;
  const slotEntries = Array.from(entryToGraph.entries());

  for (let i = 0; i < slotEntries.length; i += BATCH) {
    const batch = slotEntries.slice(i, i + BATCH);
    try {
      const results = await retry(() => db.batch(
        batch.map(([entryId, graphId]) => ({
          sql: "UPDATE block_sign_slots SET graph = ? WHERE catalog_entry = ?",
          args: [graphId, entryId],
        }))
      ));
      slotUpdated += results.reduce((sum, r) => sum + (r.rowsAffected || 0), 0);
    } catch (err) {
      console.error(`  Batch at ${i} failed:`, (err as Error).message);
    }

    if (i % 100 === 0) {
      console.log(`  ${i}/${slotEntries.length} entries, ${slotUpdated} slots updated`);
    }
  }
  console.log(`  Done: ${slotUpdated} slots linked`);

  // Verify
  const v1 = await db.execute("SELECT COUNT(*) as cnt FROM graphemes WHERE graph_id IS NOT NULL");
  const v2 = await db.execute("SELECT COUNT(*) as cnt FROM block_sign_slots WHERE graph IS NOT NULL");
  console.log(`\nVerification:`);
  console.log(`  Graphemes with graph_id: ${v1.rows[0].cnt}`);
  console.log(`  Slots with graph: ${v2.rows[0].cnt}`);
}

main().catch(console.error);
