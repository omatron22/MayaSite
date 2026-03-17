// scripts/fix-remaining-gaps.ts
// Fixes: missed TWKM-722 concordance link + 28 semicolon multi-date blocks
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

function longCountToGregorian(lc: string): string | null {
  const parts = lc.split('.').map(Number);
  if (parts.length !== 5 || parts.some(isNaN)) return null;
  const [baktun, katun, tun, uinal, kin] = parts;
  if (baktun > 20 || katun > 19 || tun > 19 || uinal > 17 || kin > 19) return null;
  const totalDays = baktun * 144000 + katun * 7200 + tun * 360 + uinal * 20 + kin;
  const jdn = totalDays + 584283;
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function main() {
  console.log('Fixing remaining gaps...\n');

  // Fix 1: Create concordance link for TWKM-722 ↔ MHD-660
  console.log('Fix 1: TWKM-722 ↔ MHD-660 concordance link');
  const existing = await db.execute(
    `SELECT * FROM concordance_links WHERE
     (entry_a = 'twkm-722' AND entry_b = 'mhd-660') OR
     (entry_a = 'mhd-660' AND entry_b = 'twkm-722')`
  );
  if (existing.rows.length > 0) {
    console.log('  Already exists — skipping');
  } else {
    await db.execute(
      `INSERT INTO concordance_links (link_id, entry_a, entry_b, correspondence, asserted_by, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['cl-twkm722-mhd660', 'twkm-722', 'mhd-660', 'exact', 'zender_code_match', 'Recovered match via zender_code 0722']
    );
    console.log('  Created link');
  }

  // Fix 2: Convert semicolon multi-date Long Counts
  console.log('\nFix 2: Semicolon multi-date blocks');
  const semiRows = await db.execute(
    `SELECT id, event_long_count FROM blocks WHERE event_long_count LIKE '%;%' AND event_gregorian IS NULL`
  );
  console.log(`  Found ${semiRows.rows.length} blocks with semicolons`);

  let converted = 0;
  const batch: { sql: string; args: unknown[] }[] = [];
  for (const row of semiRows.rows) {
    const lc = String(row.event_long_count).split(';')[0].trim();
    const greg = longCountToGregorian(lc);
    if (!greg) continue;
    batch.push({ sql: `UPDATE blocks SET event_gregorian = ? WHERE id = ?`, args: [greg, row.id] });
    converted++;
  }
  if (batch.length > 0) {
    await db.batch(batch, 'write');
  }
  console.log(`  Converted ${converted} blocks`);

  // Verify final state
  console.log('\n═══ Final verification ═══');
  const greg = await db.execute(`SELECT COUNT(*) as c FROM blocks WHERE event_gregorian IS NOT NULL`);
  console.log(`Blocks with Gregorian date: ${greg.rows[0].c}`);

  const twkmLinked = await db.execute(
    `SELECT COUNT(DISTINCT ce.entry_id) as c
     FROM catalog_entries ce
     WHERE ce.catalog = 'TWKM'
     AND EXISTS (
       SELECT 1 FROM concordance_links cl
       WHERE cl.entry_a = ce.entry_id OR cl.entry_b = ce.entry_id
     )`
  );
  console.log(`TWKM entries with concordance links: ${twkmLinked.rows[0].c}`);

  const unlinked = await db.execute(
    `SELECT COUNT(*) as c FROM catalog_entries ce
     WHERE ce.catalog = 'TWKM'
     AND NOT EXISTS (
       SELECT 1 FROM concordance_links cl
       WHERE cl.entry_a = ce.entry_id OR cl.entry_b = ce.entry_id
     )`
  );
  console.log(`TWKM entries with NO links: ${unlinked.rows[0].c}`);
}

main().catch(console.error);
