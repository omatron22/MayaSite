/**
 * Computes object date 260-day (Tzolkin) and 365-day (Haab) from object_date_lc (Long Count).
 *
 * Maya calendar math:
 *   Long Count = days since epoch (0.0.0.0.0 = Aug 11, 3114 BCE in GMT correlation)
 *   Tzolkin (260-day): 13 numbers × 20 day names, cycling every 260 days
 *   Haab (365-day): 18 months × 20 days + 5 Wayeb days
 *
 * Adds object_date_260 and object_date_365 columns to blocks.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const TZOLKIN_NAMES = [
  'Imix', 'Ik', 'Akbal', 'Kan', 'Chicchan',
  'Kimi', 'Manik', 'Lamat', 'Muluk', 'Ok',
  'Chuwen', 'Eb', 'Ben', 'Ix', 'Men',
  'Kib', 'Kaban', 'Etznab', 'Kawak', 'Ajaw',
];

const HAAB_MONTHS = [
  'Pop', 'Wo', 'Sip', 'Sotz', 'Sek',
  'Xul', 'Yaxkin', 'Mol', 'Chen', 'Yax',
  'Sak', 'Keh', 'Mak', 'Kankin', 'Muwan',
  'Pax', 'Kayab', 'Kumku', 'Wayeb',
];

function longCountToDays(lc: string): number | null {
  const parts = lc.split('.').map(Number);
  if (parts.length !== 5 || parts.some(isNaN)) return null;
  const [baktun, katun, tun, winal, kin] = parts;
  return baktun * 144000 + katun * 7200 + tun * 360 + winal * 20 + kin;
}

function daysToTzolkin(days: number): string {
  // Base date 0.0.0.0.0 = 4 Ajaw in Tzolkin
  // 4 Ajaw: number=4, name_index=19 (Ajaw)
  const baseNum = 4;
  const baseNameIdx = 19;

  const num = ((baseNum - 1 + days) % 13 + 13) % 13 + 1;
  const nameIdx = ((baseNameIdx + days) % 20 + 20) % 20;

  return `${String(num).padStart(2, '0')} ${TZOLKIN_NAMES[nameIdx]}`;
}

function daysToHaab(days: number): string {
  // Base date 0.0.0.0.0 = 8 Kumku in Haab
  // 8 Kumku: day_of_year = 17*20 + 8 = 348
  const baseDayOfYear = 348;

  const dayOfYear = ((baseDayOfYear + days) % 365 + 365) % 365;
  const monthIdx = Math.floor(dayOfYear / 20);
  const dayInMonth = dayOfYear % 20;

  if (monthIdx >= 18) {
    // Wayeb (5-day month)
    return `${dayInMonth} Wayeb`;
  }
  return `${String(dayInMonth).padStart(2, '0')} ${HAAB_MONTHS[monthIdx]}`;
}

async function main() {
  // Add columns
  for (const col of ['object_date_260', 'object_date_365']) {
    try {
      await db.execute(`ALTER TABLE blocks ADD COLUMN ${col} TEXT`);
      console.log(`Added ${col} column`);
    } catch {
      console.log(`${col} column already exists`);
    }
  }

  // Get blocks with object_date_lc
  const result = await db.execute(`
    SELECT id, object_date_lc
    FROM blocks
    WHERE object_date_lc IS NOT NULL AND object_date_lc != ''
  `);

  console.log(`Blocks with object_date_lc: ${result.rows.length}`);

  const updates: { sql: string; args: (string | number)[] }[] = [];

  for (const row of result.rows) {
    const lc = String(row.object_date_lc);
    const days = longCountToDays(lc);
    if (days === null) {
      console.log(`  Skipping invalid LC: ${lc} (block ${row.id})`);
      continue;
    }

    const tzolkin = daysToTzolkin(days);
    const haab = daysToHaab(days);

    updates.push({
      sql: `UPDATE blocks SET object_date_260 = ?, object_date_365 = ? WHERE id = ?`,
      args: [tzolkin, haab, Number(row.id)],
    });
  }

  console.log(`Updates to apply: ${updates.length}`);

  // Verify with known date: 9.18.5.0.0 should be 4 Ajaw 13 Keh (from wireframe)
  const testDays = longCountToDays('9.18.5.0.0')!;
  console.log(`\nVerification: 9.18.5.0.0 → ${daysToTzolkin(testDays)} ${daysToHaab(testDays)}`);
  console.log(`Expected: 04 Ajaw 13 Keh`);

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
  }

  console.log(`\nDone: ${updated} blocks updated with object date 260/365`);

  // Sample
  const sample = await db.execute(`
    SELECT artifact_name, object_date_lc, object_date_260, object_date_365, object_date_start
    FROM blocks
    WHERE object_date_260 IS NOT NULL
    GROUP BY artifact_name
    LIMIT 10
  `);
  console.log('\nSamples:');
  for (const s of sample.rows) {
    console.log(`  ${s.artifact_name}: LC=${s.object_date_lc} → ${s.object_date_260} ${s.object_date_365} (${s.object_date_start})`);
  }
}

main().catch(console.error);
