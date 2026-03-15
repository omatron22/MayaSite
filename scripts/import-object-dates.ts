/**
 * Imports object/artifact creation dates from classicmayan-raw.json artefacts.
 * These represent WHEN THE MONUMENT WAS MADE — distinct from event dates
 * (which record what historical event the block describes).
 *
 * Matching strategy:
 *   1. Exact match on artifact_name
 *   2. Normalized match (strip leading zeros, normalize site names)
 *   3. Fuzzy match on site + object type + number
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

// Normalize artifact name for fuzzy matching
function normalize(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\b0+(\d)/g, '$1') // Strip leading zeros: "Stela 01" → "Stela 1"
    .trim()
    .toLowerCase();
}

async function main() {
  const raw = JSON.parse(readFileSync('data/classicmayan-raw.json', 'utf8'));
  const artefacts: Artefact[] = raw.artefacts;

  // Ensure object_date_start column exists
  for (const col of ['object_date_start', 'object_date_end', 'object_date_lc']) {
    try {
      await db.execute(`ALTER TABLE blocks ADD COLUMN ${col} TEXT`);
      console.log(`Added ${col} column`);
    } catch {
      // Column already exists
    }
  }

  // Filter to artefacts with dates
  const withDates = artefacts.filter(a => a.date && (a.date.start || a.date.mayaStart));
  console.log(`Artefacts with dates: ${withDates.length} / ${artefacts.length}`);

  // Get all distinct artifact_names from blocks
  const namesResult = await db.execute(`
    SELECT DISTINCT artifact_name, artifact_code, COUNT(*) as block_count
    FROM blocks
    WHERE artifact_name IS NOT NULL AND artifact_name != ''
    GROUP BY artifact_name
  `);

  // Build lookup: normalized name → { artifact_name, artifact_code, count }
  const nameLookup = new Map<string, { name: string; code: string; count: number }>();
  for (const row of namesResult.rows) {
    const norm = normalize(String(row.artifact_name));
    nameLookup.set(norm, {
      name: String(row.artifact_name),
      code: String(row.artifact_code),
      count: Number(row.block_count),
    });
  }

  console.log(`Distinct artifact_names in DB: ${nameLookup.size}`);

  // Match artefacts to blocks
  let matched = 0;
  let blocksUpdated = 0;
  const updates: { sql: string; args: (string | number | null)[] }[] = [];

  for (const art of withDates) {
    const label = art.label;
    const normLabel = normalize(label);

    // Try exact normalized match
    let match = nameLookup.get(normLabel);

    // Try without comma (some labels use different formatting)
    if (!match) {
      // "Yaxchilan, Lintel 21" → try matching parts
      const parts = label.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        // Try "Site, Object N" with various normalizations
        const site = parts[0];
        const rest = parts.slice(1).join(',').trim();

        // Search through all names for a match
        for (const [norm, info] of nameLookup) {
          if (norm.includes(normalize(site)) && norm.includes(normalize(rest))) {
            match = info;
            break;
          }
        }
      }
    }

    if (match) {
      matched++;
      const dateStr = art.date!.start
        ? `${art.date!.start} CE`
        : null;
      const dateEnd = art.date!.end && art.date!.end !== art.date!.start
        ? `${art.date!.end} CE`
        : null;

      updates.push({
        sql: `UPDATE blocks SET object_date_start = ?, object_date_end = ?, object_date_lc = ?
              WHERE artifact_name = ? AND (object_date_start IS NULL OR object_date_start = '')`,
        args: [
          dateStr,
          dateEnd,
          art.date!.mayaStart || null,
          match.name,
        ],
      });

      if (matched <= 15) {
        console.log(`  ${label} → ${match.name} (${match.count} blocks) → ${dateStr}`);
      }
    }
  }

  console.log(`\nMatched: ${matched} / ${withDates.length} artefacts`);

  // Execute updates in batches
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    const results = await db.batch(batch);
    blocksUpdated += results.reduce((sum, r) => sum + (r.rowsAffected || 0), 0);
  }

  console.log(`Blocks updated with object dates: ${blocksUpdated}`);

  // Verify
  const verify = await db.execute(`
    SELECT COUNT(*) as c FROM blocks WHERE object_date_start IS NOT NULL AND object_date_start != ''
  `);
  console.log(`\nVerification: ${verify.rows[0].c} blocks have object_date_start`);

  // Show samples
  const samples = await db.execute(`
    SELECT artifact_name, object_date_start, object_date_lc, event_long_count
    FROM blocks
    WHERE object_date_start IS NOT NULL AND object_date_start != ''
    GROUP BY artifact_name
    ORDER BY RANDOM()
    LIMIT 10
  `);
  console.log('\nSample results:');
  for (const s of samples.rows) {
    console.log(`  ${s.artifact_name}: object=${s.object_date_start}, event LC=${s.event_long_count || '—'}`);
  }
}

main().catch(console.error);
