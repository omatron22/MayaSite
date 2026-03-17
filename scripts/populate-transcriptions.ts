// scripts/populate-transcriptions.ts
// Verifies transcription_1 and transcription_2 columns are populated.
// Previously copied block_maya1 → transcription_1, now those are the canonical column names.
// Run with: npx tsx scripts/populate-transcriptions.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('Checking transcription_1/transcription_2 population...\n');

  // Check current state
  const before = await db.execute(`
    SELECT
      SUM(CASE WHEN transcription_1 IS NOT NULL AND transcription_1 != '' THEN 1 ELSE 0 END) as t1,
      SUM(CASE WHEN transcription_2 IS NOT NULL AND transcription_2 != '' THEN 1 ELSE 0 END) as t2,
      SUM(CASE WHEN transcription_1 IS NOT NULL AND transcription_1 != '' THEN 1 ELSE 0 END) as m1,
      SUM(CASE WHEN transcription_2 IS NOT NULL AND transcription_2 != '' THEN 1 ELSE 0 END) as m2
    FROM blocks
  `);
  const b = before.rows[0] as Record<string, number>;
  console.log(`Before: transcription_1=${b.t1}, transcription_2=${b.t2}`);
  console.log(`Source: transcription_1=${b.m1}, transcription_2=${b.m2}\n`);

  if (b.t1 > 0) {
    console.log('transcription_1 already populated. Skipping.');
    return;
  }

  // transcription_1 and transcription_2 are now the canonical column names.
  // No copy needed — they are populated directly by import scripts.
  console.log('  transcription_1 and transcription_2 are the canonical columns (no copy needed)');

  // Verify
  const after = await db.execute(`
    SELECT
      SUM(CASE WHEN transcription_1 IS NOT NULL AND transcription_1 != '' THEN 1 ELSE 0 END) as t1,
      SUM(CASE WHEN transcription_2 IS NOT NULL AND transcription_2 != '' THEN 1 ELSE 0 END) as t2
    FROM blocks
  `);
  const a = after.rows[0] as Record<string, number>;
  console.log(`\n=== Transcriptions Populated ===`);
  console.log(`  transcription_1: ${a.t1} blocks`);
  console.log(`  transcription_2: ${a.t2} blocks`);

  // Show samples
  const samples = await db.execute(`
    SELECT transcription_1, transcription_2
    FROM blocks
    WHERE transcription_1 IS NOT NULL AND transcription_1 != ''
      AND transcription_2 IS NOT NULL AND transcription_2 != ''
      AND transcription_1 != transcription_2
    LIMIT 5
  `);
  console.log(`\nSamples where transcription_1 ≠ transcription_2:`);
  for (const s of samples.rows) {
    console.log(`  "${s.transcription_1}" vs "${s.transcription_2}"`);
  }
}

main().catch(console.error);
