import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@libsql/client';

const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });

async function retry<T>(fn: () => Promise<T>, attempts = 3, delay = 2000): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err) { if (i === attempts - 1) throw err; await new Promise(r => setTimeout(r, delay)); }
  }
  throw new Error('unreachable');
}

async function main() {
  // Build entry → graph mapping from concordance
  console.log('Building entry → graph mapping...');
  
  const twkmWithGraphs = await retry(() => db.execute(`
    SELECT DISTINCT g.catalog_entry as twkm_entry, g.graph_id, g.variant_suffix
    FROM graphs g
    ORDER BY g.catalog_entry,
      CASE WHEN g.variant_suffix = 'st' THEN 0 ELSE 1 END,
      g.variant_suffix
  `));
  
  const twkmToGraph = new Map<string, string>();
  for (const row of twkmWithGraphs.rows) {
    const entry = String(row.twkm_entry);
    if (!twkmToGraph.has(entry)) twkmToGraph.set(entry, String(row.graph_id));
  }
  
  const links = await retry(() => db.execute(`
    SELECT cl.entry_a, cl.entry_b,
           mhd.entry_id as mhd_entry
    FROM concordance_links cl
    JOIN catalog_entries mhd ON (
      mhd.entry_id = cl.entry_a OR mhd.entry_id = cl.entry_b
    )
    WHERE mhd.catalog = 'MHD'
  `));
  
  const entryToGraph = new Map<string, string>();
  for (const row of links.rows) {
    const mhdEntry = String(row.mhd_entry);
    const otherEntry = String(row.entry_a) === mhdEntry ? String(row.entry_b) : String(row.entry_a);
    const graphId = twkmToGraph.get(otherEntry);
    if (graphId && !entryToGraph.has(mhdEntry)) {
      entryToGraph.set(mhdEntry, graphId);
    }
  }
  console.log(`Entry → graph mappings: ${entryToGraph.size}`);
  
  // Update block_sign_slots
  console.log('Updating block_sign_slots...');
  const BATCH = 10;
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
  console.log(`Done: ${slotUpdated} slots linked`);
  
  const v = await db.execute("SELECT COUNT(*) as cnt FROM block_sign_slots WHERE graph IS NOT NULL");
  console.log(`Verification - Slots with graph: ${v.rows[0].cnt}`);
}

main().catch(console.error);
