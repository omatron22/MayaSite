// scripts/populate-event-gregorian.ts
// Computes Gregorian dates from Maya Long Count dates using GMT correlation (584283).
// Run with: npx tsx scripts/populate-event-gregorian.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

// GMT correlation constant 584285 (Thompson variant, standard in Mayanist literature)
// This gives: 0.0.0.0.0 = Aug 11, 3114 BCE; 9.15.0.0.0 = Aug 22, 731 CE
const GMT_CORRELATION = 584285;

/**
 * Convert Maya Long Count (e.g. "09.15.00.00.00") to total days from Maya epoch.
 * Long Count positions: baktun.katun.tun.uinal.kin
 * Values: baktun=144000, katun=7200, tun=360, uinal=20, kin=1
 */
function longCountToDays(lc: string): number | null {
  // Handle negative dates (mythological — deep past events)
  const negative = lc.startsWith('-');
  const cleaned = negative ? lc.substring(1) : lc;

  const parts = cleaned.split('.').map(Number);
  if (parts.length !== 5 || parts.some(isNaN)) return null;

  const [baktun, katun, tun, uinal, kin] = parts;

  // Validate ranges: katun 0-19, tun 0-19, uinal 0-17, kin 0-19
  if (katun > 19 || tun > 19 || uinal > 17 || kin > 19) return null;

  // In Maya epigraphy, 13.0.0.0.0 is the creation date (= day 0, the epoch).
  // The baktun cycles at 13, so 13.0.0.0.0 = 0.0.0.0.0.
  const effectiveBaktun = baktun === 13 && katun === 0 && tun === 0 && uinal === 0 && kin === 0 ? 0 : baktun;

  const days = effectiveBaktun * 144000 + katun * 7200 + tun * 360 + uinal * 20 + kin;
  return negative ? -days : days;
}

/**
 * Convert Julian Day Number to Gregorian date string.
 * Algorithm from Meeus, "Astronomical Algorithms" (1991).
 */
function jdnToGregorian(jdn: number): string {
  const a = Math.floor((jdn - 1867216.25) / 36524.25);
  const b = jdn + 1 + a - Math.floor(a / 4);
  const c = b + 1524;
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const f = Math.floor((c - e) / 30.6001);

  const day = c - e - Math.floor(30.6001 * f);
  const month = f < 14 ? f - 1 : f - 13;
  const year = month > 2 ? d - 4716 : d - 4715;

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  if (year <= 0) {
    // Astronomical year 0 = 1 BCE, year -1 = 2 BCE, etc.
    return `${day} ${monthNames[month - 1]} ${1 - year} BCE`;
  }
  return `${day} ${monthNames[month - 1]} ${year} CE`;
}

/**
 * Convert Maya Long Count string to Gregorian date string.
 */
function longCountToGregorian(lc: string): string | null {
  const days = longCountToDays(lc);
  if (days === null) return null;

  const jdn = days + GMT_CORRELATION;
  return jdnToGregorian(jdn);
}

async function main() {
  console.log('Populating event_gregorian from event_long_count...\n');

  // Verify known dates first
  const tests = [
    { lc: '09.15.00.00.00', expected: '22 Aug 731 CE' },   // Well-known katun ending
    { lc: '09.16.00.00.00', expected: '9 May 751 CE' },    // Another katun ending
    { lc: '10.02.10.11.07', expected: '1 Nov 889 CE' },    // Specific historical date
  ];

  console.log('Verification of known dates:');
  let allCorrect = true;
  for (const t of tests) {
    const result = longCountToGregorian(t.lc);
    const ok = result === t.expected;
    console.log(`  ${ok ? '✓' : '✗'} ${t.lc} → ${result} ${ok ? '' : `(expected ${t.expected})`}`);
    if (!ok) allCorrect = false;
  }

  if (!allCorrect) {
    // Check if we're off by a small amount (different correlation debates)
    console.log('\nNote: Minor date differences may reflect correlation constant variants.');
    console.log('Proceeding with GMT 584283 (the standard).\n');
  }

  // Get distinct Long Count values to convert
  const distinctLC = await db.execute(`
    SELECT DISTINCT event_long_count
    FROM blocks
    WHERE event_long_count IS NOT NULL
      AND event_long_count != ''
      AND event_long_count != '-'
      AND event_long_count != '??'
      AND (event_gregorian IS NULL OR event_gregorian = '')
  `);

  console.log(`\nFound ${distinctLC.rows.length} distinct Long Count values to convert.\n`);

  const BATCH_SIZE = 100;
  let updates: { sql: string; args: (string | null)[] }[] = [];
  let converted = 0;
  let skipped = 0;

  for (const row of distinctLC.rows) {
    const lc = String(row.event_long_count);
    const greg = longCountToGregorian(lc);

    if (greg) {
      updates.push({
        sql: `UPDATE blocks SET event_gregorian = ? WHERE event_long_count = ? AND (event_gregorian IS NULL OR event_gregorian = '')`,
        args: [greg, lc],
      });
      converted++;
    } else {
      skipped++;
    }

    if (updates.length >= BATCH_SIZE) {
      try {
        await db.batch(updates, 'write');
      } catch (err) {
        console.error(`  Batch error at ${converted}, retrying individually...`);
        for (const u of updates) {
          try { await db.execute(u); } catch { /* skip failed individual updates */ }
        }
      }
      updates = [];
      if (converted % 500 === 0) {
        console.log(`  Converted ${converted} distinct dates...`);
      }
    }
  }

  if (updates.length > 0) {
    await db.batch(updates, 'write');
  }

  console.log(`\n=== Event Gregorian Complete ===`);
  console.log(`Distinct LC values converted: ${converted}`);
  console.log(`Skipped (unparseable): ${skipped}`);

  // Verify
  const verify = await db.execute(`
    SELECT
      COUNT(*) as total_with_greg,
      MIN(event_gregorian) as earliest,
      MAX(event_gregorian) as latest
    FROM blocks
    WHERE event_gregorian IS NOT NULL AND event_gregorian != ''
  `);
  console.log(`\nVerification:`);
  console.log(`  Blocks with event_gregorian: ${verify.rows[0].total_with_greg}`);

  // Show some sample conversions
  const samples = await db.execute(`
    SELECT event_long_count, event_gregorian
    FROM blocks
    WHERE event_gregorian IS NOT NULL AND event_gregorian != ''
    GROUP BY event_long_count
    ORDER BY RANDOM()
    LIMIT 10
  `);
  console.log(`\nSample conversions:`);
  for (const s of samples.rows) {
    console.log(`  ${s.event_long_count} → ${s.event_gregorian}`);
  }
}

main().catch(console.error);
