/**
 * Derives TWKM earliest/latest attestation dates for catalog_entries.
 *
 * Strategy: graph → artefacts[] → artefact.date.start/end
 * For each TWKM catalog_entry, find all graphs, collect their artefact dates,
 * and store the min/max as earliest/latest attestation dates.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

interface Artefact {
  id: number;
  label: string;
  date: {
    start: number | null;
    end: number | null;
    mayaStart: string | null;
    mayaEnd: string | null;
  } | null;
}

interface Graph {
  graphNo: number;
  signNo: number;
  artefacts: number[];
}

async function main() {
  // Add columns
  for (const col of ['earliest_attestation', 'latest_attestation']) {
    try {
      await db.execute(`ALTER TABLE catalog_entries ADD COLUMN ${col} TEXT`);
      console.log(`Added ${col} column`);
    } catch {
      console.log(`${col} column already exists`);
    }
  }

  // Load classicmayan data
  const raw = JSON.parse(readFileSync('data/classicmayan-raw.json', 'utf8'));
  const artefacts: Artefact[] = raw.artefacts;
  const graphs: Graph[] = raw.graphs;

  // Build artefact date lookup
  const artefactDates = new Map<number, { start: number | null; end: number | null }>();
  for (const a of artefacts) {
    if (a.date && (a.date.start !== null || a.date.end !== null)) {
      artefactDates.set(a.id, { start: a.date.start, end: a.date.end });
    }
  }
  console.log(`Artefacts with dates: ${artefactDates.size}`);

  // For each sign, collect all dates from its graphs' artefacts
  const signDates = new Map<number, { earliest: number; latest: number }>();

  for (const g of graphs) {
    for (const artId of g.artefacts || []) {
      const dates = artefactDates.get(artId);
      if (!dates) continue;

      const existing = signDates.get(g.signNo) || { earliest: Infinity, latest: -Infinity };

      if (dates.start !== null) {
        existing.earliest = Math.min(existing.earliest, dates.start);
        existing.latest = Math.max(existing.latest, dates.start);
      }
      if (dates.end !== null) {
        existing.latest = Math.max(existing.latest, dates.end);
      }

      signDates.set(g.signNo, existing);
    }
  }

  console.log(`Signs with attestation dates: ${signDates.size}`);

  // Update catalog_entries for TWKM signs
  const updates: { sql: string; args: (string | number)[] }[] = [];

  for (const [signNo, dates] of signDates) {
    if (dates.earliest === Infinity) continue;

    const entryId = `twkm-${signNo}`;
    const earliest = dates.earliest <= 0 ? `${Math.abs(dates.earliest)} BCE` : `${dates.earliest} CE`;
    const latest = dates.latest <= 0 ? `${Math.abs(dates.latest)} BCE` : `${dates.latest} CE`;

    updates.push({
      sql: `UPDATE catalog_entries SET earliest_attestation = ?, latest_attestation = ? WHERE entry_id = ?`,
      args: [earliest, latest, entryId],
    });
  }

  console.log(`Updates to apply: ${updates.length}`);

  // Execute in batches
  const BATCH = 50;
  let updated = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    try {
      const results = await db.batch(batch);
      updated += results.reduce((sum, r) => sum + (r.rowsAffected || 0), 0);
    } catch {
      try {
        await new Promise(r => setTimeout(r, 2000));
        const results = await db.batch(batch);
        updated += results.reduce((sum, r) => sum + (r.rowsAffected || 0), 0);
      } catch (e2) {
        console.error(`Failed batch at ${i}:`, e2);
      }
    }
  }

  console.log(`\nDone: ${updated} entries updated with attestation dates`);

  // Sample
  const sample = await db.execute(`
    SELECT entry_id, catalog_code, earliest_attestation, latest_attestation
    FROM catalog_entries
    WHERE earliest_attestation IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 10
  `);
  console.log('\nSamples:');
  for (const s of sample.rows) {
    console.log(`  ${s.catalog_code}: ${s.earliest_attestation} – ${s.latest_attestation}`);
  }
}

main().catch(console.error);
