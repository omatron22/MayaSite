// scripts/import-twkm-iconography.ts
// Enriches graphs rows with iconographic_tags from classicmayan-raw.json.
// Run with: npx tsx scripts/import-twkm-iconography.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawGraph {
  signNo: number;
  graphNo: string;
  variant: string;
  imgUrl: string;
  iconography: string[];
  nicknames: string[];
  occurrence: number;
  comment: string;
  description: string;
  translation: string | null;
  artefacts: string[];
  bibliography: string[];
  concordances: string[];
}

interface RawIconography {
  id: string;
  parentId: string;
  label: string;
}

async function main() {
  console.log('Enriching graphs with iconographic tags...\n');

  const rawPath = path.join(__dirname, '..', 'data', 'classicmayan-raw.json');
  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
  const rawGraphs: RawGraph[] = raw.graphs;
  const iconography: RawIconography[] = raw.iconography;

  // Build iconography ID → label lookup
  const iconLabelMap = new Map<string, string>();
  for (const icon of iconography) {
    iconLabelMap.set(icon.id, icon.label);
  }
  console.log(`Loaded ${iconography.length} iconography labels.`);
  console.log(`Loaded ${rawGraphs.length} raw graphs.\n`);

  const BATCH_SIZE = 100;
  let updates: { sql: string; args: (string | null)[] }[] = [];
  let updated = 0;
  let noGraphRow = 0;

  for (const rg of rawGraphs) {
    if (!rg.iconography || rg.iconography.length === 0) continue;

    const graphId = `twkm-graph-${rg.graphNo}`;
    const tags = rg.iconography
      .map(id => iconLabelMap.get(id))
      .filter(Boolean) as string[];

    if (tags.length === 0) continue;

    const tagsJson = JSON.stringify(tags);

    updates.push({
      sql: `UPDATE graphs SET iconographic_tags = ? WHERE graph_id = ?`,
      args: [tagsJson, graphId],
    });
    updated++;

    if (updates.length >= BATCH_SIZE) {
      await db.batch(updates, 'write');
      updates = [];
    }
  }

  if (updates.length > 0) await db.batch(updates, 'write');

  // Check how many actually matched
  const verify = await db.execute(`
    SELECT
      COUNT(*) as total_graphs,
      SUM(CASE WHEN iconographic_tags IS NOT NULL THEN 1 ELSE 0 END) as with_tags
    FROM graphs
  `);
  const v = verify.rows[0] as Record<string, number>;

  console.log(`\n=== Iconography Enrichment ===`);
  console.log(`Updates attempted: ${updated}`);
  console.log(`Graphs total: ${v.total_graphs}`);
  console.log(`Graphs with iconographic tags: ${v.with_tags}`);
}

main().catch(console.error);
