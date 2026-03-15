// scripts/migrate-mhd-to-entries.ts
// Migrates 3,141 catalog_signs rows into catalog_entries with catalog='MHD'.
// Deterministic IDs: mhd-{catalog_signs.id}
// Run with: npx tsx scripts/migrate-mhd-to-entries.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  console.log('Migrating catalog_signs → catalog_entries (MHD)...\n');

  // Check if already migrated
  const existing = await db.execute(
    `SELECT COUNT(*) as count FROM catalog_entries WHERE catalog = 'MHD'`
  );
  const existingCount = Number(existing.rows[0].count);
  if (existingCount > 0) {
    console.log(`Already have ${existingCount} MHD entries. Skipping migration.`);
    console.log('To re-run, first: DELETE FROM catalog_entries WHERE catalog = \'MHD\'');
    return;
  }

  // Load all catalog signs
  const result = await db.execute(`
    SELECT id, graphcode, mhd_code, mhd_code_sub, thompson_code, zender_code,
           syllabic_value, logographic_value, english_translation,
           word_class, primary_image_url, notes, variant_code,
           bonn_sign_number
    FROM catalog_signs
    ORDER BY id
  `);

  console.log(`Found ${result.rows.length} catalog signs to migrate.\n`);

  // Build parent map: variant_code signs (e.g. "61bt yu") have a numeric prefix
  // that maps to the parent sign's mhd_code (e.g. sign with mhd_code="61")
  const mhdCodeToEntryId = new Map<string, string>();
  for (const row of result.rows) {
    const mhdCode = String(row.mhd_code || '');
    if (mhdCode && /^\d+$/.test(mhdCode)) {
      mhdCodeToEntryId.set(mhdCode, `mhd-${row.id}`);
    }
  }

  // Determine reading_type per Wyatt's spec:
  // syllabogram, logogram, numeral, diacritic, unknown
  function getReadingType(row: Record<string, unknown>): string | null {
    const hasSyllabic = !!row.syllabic_value;
    const hasLogographic = !!row.logographic_value;
    if (hasSyllabic && hasLogographic) return 'syllabogram'; // prioritize syllabic
    if (hasSyllabic) return 'syllabogram';
    if (hasLogographic) return 'logogram';
    return null;
  }

  // Build parent relationships: variant_code signs like "61bt yu" → parent is mhd_code "61"
  function findParentEntryId(row: Record<string, unknown>): string | null {
    const variantCode = row.variant_code as string | null;
    if (!variantCode) return null;
    const mhdCode = String(row.mhd_code || '');
    // Extract numeric prefix: "61bt yu" → "61", "229bl a" → "229"
    const match = mhdCode.match(/^(\d+)/);
    if (!match) return null;
    const parentMhdCode = match[1];
    const parentId = mhdCodeToEntryId.get(parentMhdCode);
    if (parentId && parentId !== `mhd-${row.id}`) return parentId;
    return null;
  }

  const BATCH_SIZE = 100;
  let inserts: { sql: string; args: (string | number | null)[] }[] = [];
  let inserted = 0;
  let withParent = 0;

  for (const row of result.rows) {
    const entryId = `mhd-${row.id}`;
    const catalogCode = String(row.mhd_code_sub || row.graphcode || row.mhd_code);
    const parentEntry = findParentEntryId(row as Record<string, unknown>);
    const readingValue = (row.syllabic_value || row.logographic_value || null) as string | null;
    const readingType = getReadingType(row as Record<string, unknown>);
    const partOfSpeech = row.word_class ? JSON.stringify([row.word_class]) : null;

    if (parentEntry) withParent++;

    inserts.push({
      sql: `INSERT INTO catalog_entries
            (entry_id, catalog, catalog_code, parent_entry, variant_code,
             reading_value, reading_type, gloss_english, gloss_mayan,
             part_of_speech, confidence_level, image_url, notes, legacy_catalog_sign_id)
            VALUES (?, 'MHD', ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?)`,
      args: [
        entryId,
        catalogCode,
        parentEntry,
        (row.variant_code as string | null) || null,
        readingValue,
        readingType,
        (row.english_translation as string | null) || null,
        partOfSpeech,
        (row.primary_image_url as string | null) || null,
        (row.notes as string | null) || null,
        row.id as number,
      ],
    });

    if (inserts.length >= BATCH_SIZE) {
      await db.batch(inserts, 'write');
      inserted += inserts.length;
      inserts = [];
      if (inserted % 500 === 0) {
        console.log(`  Inserted ${inserted}...`);
      }
    }
  }

  if (inserts.length > 0) {
    await db.batch(inserts, 'write');
    inserted += inserts.length;
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Entries created: ${inserted}`);
  console.log(`With parent relationships: ${withParent}`);

  // Verify
  const verify = await db.execute(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN parent_entry IS NOT NULL THEN 1 ELSE 0 END) as with_parent,
      SUM(CASE WHEN reading_value IS NOT NULL THEN 1 ELSE 0 END) as with_reading,
      SUM(CASE WHEN gloss_english IS NOT NULL THEN 1 ELSE 0 END) as with_gloss,
      SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as with_image,
      SUM(CASE WHEN legacy_catalog_sign_id IS NOT NULL THEN 1 ELSE 0 END) as with_legacy
    FROM catalog_entries WHERE catalog = 'MHD'
  `);
  const v = verify.rows[0] as Record<string, number>;
  console.log(`\nVerification:`);
  console.log(`  Total MHD entries: ${v.total}`);
  console.log(`  With parent: ${v.with_parent}`);
  console.log(`  With reading: ${v.with_reading}`);
  console.log(`  With gloss: ${v.with_gloss}`);
  console.log(`  With image: ${v.with_image}`);
  console.log(`  With legacy ID: ${v.with_legacy}`);
}

main().catch(console.error);
