// scripts/fix-grapheme-linkage.ts
// Improves grapheme-to-catalog linkage by stripping "?" suffixes and
// trailing variant lowercase letters before matching against catalog_signs.
// Run with: npx tsx scripts/fix-grapheme-linkage.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

/**
 * Strip a trailing "?" from a grapheme code.
 * Returns null if nothing was stripped.
 */
function stripQuestion(code: string): string | null {
  if (code.endsWith('?')) {
    const stripped = code.slice(0, -1);
    return stripped.length >= 2 ? stripped : null;
  }
  return null;
}

/**
 * Strip a trailing lowercase letter (a-z) that acts as a variant suffix.
 * Only strips if the character before it is a digit or uppercase letter
 * (meaning the lowercase letter is a variant, not part of the base code).
 * Returns null if nothing was stripped or result would be < 2 chars.
 */
function stripVariant(code: string): string | null {
  if (code.length < 2) return null;
  const last = code[code.length - 1];
  // Only strip trailing lowercase a-z
  if (last >= 'a' && last <= 'z') {
    const preceding = code[code.length - 2];
    // Only strip if preceded by a digit or uppercase letter
    if ((preceding >= '0' && preceding <= '9') || (preceding >= 'A' && preceding <= 'Z')) {
      const stripped = code.slice(0, -1);
      return stripped.length >= 2 ? stripped : null;
    }
  }
  return null;
}

/**
 * Strip both trailing "?" and variant letter.
 * Handles "AK2s?" -> strip "?" first -> "AK2s" -> strip variant -> "AK2"
 * Returns null if nothing could be stripped or result < 2 chars.
 */
function stripBoth(code: string): string | null {
  const afterQuestion = stripQuestion(code);
  if (afterQuestion) {
    const afterVariant = stripVariant(afterQuestion);
    if (afterVariant) return afterVariant;
  }
  return null;
}

async function main() {
  console.log('=== Fix Grapheme Linkage ===\n');

  // 1) Build a case-insensitive lookup map of graphcode -> catalog_sign id
  console.log('Loading catalog signs...');
  const catalogRows = await db.execute('SELECT id, graphcode FROM catalog_signs WHERE graphcode IS NOT NULL');
  const catalogMap = new Map<string, number>();
  for (const row of catalogRows.rows) {
    const graphcode = String(row.graphcode).toUpperCase();
    // If multiple entries have the same graphcode, first one wins
    if (!catalogMap.has(graphcode)) {
      catalogMap.set(graphcode, Number(row.id));
    }
  }
  console.log(`  Loaded ${catalogMap.size.toLocaleString()} unique graphcodes\n`);

  // 2) Get baseline stats
  const totalResult = await db.execute('SELECT COUNT(*) as c FROM graphemes');
  const totalGraphemes = Number(totalResult.rows[0].c);

  const linkedResult = await db.execute('SELECT COUNT(*) as c FROM graphemes WHERE catalog_sign_id IS NOT NULL');
  const linkedBefore = Number(linkedResult.rows[0].c);

  const unlinkedResult = await db.execute('SELECT COUNT(*) as c FROM graphemes WHERE catalog_sign_id IS NULL');
  const unlinkedCount = Number(unlinkedResult.rows[0].c);

  console.log(`Total graphemes: ${totalGraphemes.toLocaleString()}`);
  console.log(`Already linked:  ${linkedBefore.toLocaleString()} (${(linkedBefore / totalGraphemes * 100).toFixed(1)}%)`);
  console.log(`Unlinked:        ${unlinkedCount.toLocaleString()}\n`);

  // 3) Fetch all unlinked graphemes
  console.log('Fetching unlinked graphemes...');
  const unlinkedRows = await db.execute(
    'SELECT id, grapheme_code FROM graphemes WHERE catalog_sign_id IS NULL'
  );
  console.log(`  Got ${unlinkedRows.rows.length.toLocaleString()} unlinked graphemes\n`);

  // 4) Try to match each unlinked grapheme using the stripping strategies
  //    Priority: question-only, variant-only, both
  let matchedByQuestion = 0;
  let matchedByVariant = 0;
  let matchedByBoth = 0;

  const updates: { sql: string; args: (string | number)[] }[] = [];

  for (const row of unlinkedRows.rows) {
    const id = Number(row.id);
    const code = String(row.grapheme_code);

    // Strategy 1: strip trailing "?" only
    const q = stripQuestion(code);
    if (q) {
      const catalogId = catalogMap.get(q.toUpperCase());
      if (catalogId !== undefined) {
        updates.push({
          sql: 'UPDATE graphemes SET catalog_sign_id = ? WHERE id = ?',
          args: [catalogId, id],
        });
        matchedByQuestion++;
        continue;
      }
    }

    // Strategy 2: strip trailing variant letter only
    const v = stripVariant(code);
    if (v) {
      const catalogId = catalogMap.get(v.toUpperCase());
      if (catalogId !== undefined) {
        updates.push({
          sql: 'UPDATE graphemes SET catalog_sign_id = ? WHERE id = ?',
          args: [catalogId, id],
        });
        matchedByVariant++;
        continue;
      }
    }

    // Strategy 3: strip both "?" and variant letter (e.g. "AK2s?" -> "AK2")
    const b = stripBoth(code);
    if (b) {
      const catalogId = catalogMap.get(b.toUpperCase());
      if (catalogId !== undefined) {
        updates.push({
          sql: 'UPDATE graphemes SET catalog_sign_id = ? WHERE id = ?',
          args: [catalogId, id],
        });
        matchedByBoth++;
        continue;
      }
    }
  }

  const totalMatched = matchedByQuestion + matchedByVariant + matchedByBoth;
  console.log(`Matches found: ${totalMatched.toLocaleString()}`);
  console.log(`  By stripping "?":       ${matchedByQuestion.toLocaleString()}`);
  console.log(`  By stripping variant:   ${matchedByVariant.toLocaleString()}`);
  console.log(`  By stripping both:      ${matchedByBoth.toLocaleString()}\n`);

  if (updates.length === 0) {
    console.log('No new linkages to apply.\n');
    return;
  }

  // 5) Batch update in chunks
  console.log(`Applying ${updates.length.toLocaleString()} updates...`);
  const BATCH_SIZE = 500;
  const startTime = Date.now();
  let applied = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await db.batch(batch, 'write');
    applied += batch.length;

    if (applied % 2000 === 0 || applied === updates.length) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`  Updated ${applied.toLocaleString()}/${updates.length.toLocaleString()} (${elapsed}s)`);
    }
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`  Done in ${totalTime}s\n`);

  // 6) Report new totals
  const linkedAfterResult = await db.execute('SELECT COUNT(*) as c FROM graphemes WHERE catalog_sign_id IS NOT NULL');
  const linkedAfter = Number(linkedAfterResult.rows[0].c);

  const stillUnlinkedResult = await db.execute('SELECT COUNT(*) as c FROM graphemes WHERE catalog_sign_id IS NULL');
  const stillUnlinked = Number(stillUnlinkedResult.rows[0].c);

  console.log('=== Results ===');
  console.log(`Linked before: ${linkedBefore.toLocaleString()} (${(linkedBefore / totalGraphemes * 100).toFixed(1)}%)`);
  console.log(`Linked after:  ${linkedAfter.toLocaleString()} (${(linkedAfter / totalGraphemes * 100).toFixed(1)}%)`);
  console.log(`New linkages:  +${(linkedAfter - linkedBefore).toLocaleString()}`);
  console.log(`Still unlinked: ${stillUnlinked.toLocaleString()} (${(stillUnlinked / totalGraphemes * 100).toFixed(1)}%)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
