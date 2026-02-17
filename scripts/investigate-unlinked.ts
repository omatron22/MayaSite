import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // Total counts
  const totalG = await db.execute(`SELECT COUNT(*) as count FROM graphemes`);
  const linkedG = await db.execute(`SELECT COUNT(*) as count FROM graphemes WHERE catalog_sign_id IS NOT NULL`);
  const unlinkedG = await db.execute(`SELECT COUNT(*) as count FROM graphemes WHERE catalog_sign_id IS NULL`);
  console.log(`Total graphemes: ${totalG.rows[0].count}`);
  console.log(`Linked to catalog: ${linkedG.rows[0].count}`);
  console.log(`Unlinked: ${unlinkedG.rows[0].count}`);
  
  // Distinct unlinked grapheme codes
  const unlinkedCodes = await db.execute(`
    SELECT grapheme_code, COUNT(*) as cnt 
    FROM graphemes 
    WHERE catalog_sign_id IS NULL 
    GROUP BY grapheme_code 
    ORDER BY cnt DESC 
    LIMIT 50
  `);
  console.log('\n=== TOP 50 UNLINKED GRAPHEME CODES ===');
  for (const row of unlinkedCodes.rows) {
    console.log(`  ${row.grapheme_code}: ${row.cnt} instances`);
  }
  
  // Check if any of these unlinked codes EXIST in catalog_signs
  const distinctUnlinked = await db.execute(`
    SELECT DISTINCT grapheme_code FROM graphemes WHERE catalog_sign_id IS NULL
  `);
  
  let couldMatch = 0;
  let cannotMatch = 0;
  const matchable: string[] = [];
  const unmatchable: string[] = [];
  
  for (const row of distinctUnlinked.rows) {
    const code = String(row.grapheme_code);
    // Check if this code exists in catalog_signs.graphcode or mhd_code_sub
    const found = await db.execute(`
      SELECT id FROM catalog_signs 
      WHERE graphcode = ? OR mhd_code_sub = ?
      LIMIT 1
    `, [code.toUpperCase(), code.toUpperCase()]);
    
    if (found.rows.length > 0) {
      couldMatch++;
      if (matchable.length < 20) matchable.push(code);
    } else {
      cannotMatch++;
      if (unmatchable.length < 20) unmatchable.push(code);
    }
  }
  
  console.log(`\n=== LINKAGE ANALYSIS ===`);
  console.log(`  Distinct unlinked codes: ${distinctUnlinked.rows.length}`);
  console.log(`  Could be matched to catalog: ${couldMatch}`);
  console.log(`  No catalog entry exists: ${cannotMatch}`);
  console.log(`  Sample matchable: ${matchable.join(', ')}`);
  console.log(`  Sample unmatchable: ${unmatchable.join(', ')}`);
  
  // How does the import script currently link? Check what matching logic was used
  // Let's see what patterns exist in unlinked grapheme_code values
  const patterns = await db.execute(`
    SELECT 
      CASE 
        WHEN grapheme_code LIKE '%-%' THEN 'has-dash'
        WHEN grapheme_code LIKE '%.%' THEN 'has-dot'
        WHEN grapheme_code LIKE '%[%' THEN 'has-bracket'
        WHEN LENGTH(grapheme_code) <= 3 THEN 'short-code'
        ELSE 'standard'
      END as pattern,
      COUNT(*) as cnt
    FROM graphemes 
    WHERE catalog_sign_id IS NULL
    GROUP BY pattern
  `);
  console.log('\n=== UNLINKED CODE PATTERNS ===');
  for (const row of patterns.rows) {
    console.log(`  ${row.pattern}: ${row.cnt}`);
  }
  
  // Check if there are graphemes where catalog_sign_id is null but a matching catalog entry exists
  // by looking at grapheme_code vs catalog_signs.graphcode case-insensitively
  const caseIssue = await db.execute(`
    SELECT COUNT(*) as count FROM graphemes g
    WHERE g.catalog_sign_id IS NULL
    AND EXISTS (
      SELECT 1 FROM catalog_signs c 
      WHERE UPPER(c.graphcode) = UPPER(g.grapheme_code)
    )
  `);
  console.log(`\n  Unlinked but matchable by case-insensitive graphcode: ${caseIssue.rows[0].count}`);
  
  // Check for partial matches (grapheme_code is a prefix/suffix of graphcode)
  const sampleUnlinked = await db.execute(`
    SELECT DISTINCT grapheme_code FROM graphemes WHERE catalog_sign_id IS NULL LIMIT 30
  `);
  console.log('\n=== SAMPLE UNLINKED CODES (first 30) ===');
  for (const row of sampleUnlinked.rows) {
    console.log(`  "${row.grapheme_code}"`);
  }
}

main().catch(console.error);
