// scripts/import-classicmayan.ts
// Merges ClassicMayan.org (Bonn/TWKM) sign catalog data into catalog_signs.
// Matching strategy:
//   1. Bonn sign_number → catalog_signs.zender_code (zero-padded TWKM match)
//   2. Thompson concordance → catalog_signs.thompson_code (fallback)
// Run with: npx tsx scripts/import-classicmayan.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BonnSign {
  sign_number: number;
  translation: string | null;
  graphs: {
    graph_code: string;
    variant: string;
    image_url: string;
    thumb_url: string;
    occurrence_count: number;
    nicknames: string[];
  }[];
  decipherments: {
    type: string;
    value: string;
    confidence: number;
    criteria: string[];
  }[];
  thompson_codes: string[];
  concordances: {
    catalog_name: string;
    catalog_id: string;
    number: string;
    graph_code: string;
    comment: string;
  }[];
  comments: string[];
  descriptions: string[];
}

async function main() {
  console.log('Importing ClassicMayan.org (Bonn/TWKM) data into catalog_signs...\n');

  // Add new columns if they don't exist
  console.log('Adding bonn columns if needed...');
  for (const col of [
    'bonn_sign_number INTEGER',
    'bonn_confidence INTEGER',
    'bonn_image_url TEXT',
  ]) {
    const colName = col.split(' ')[0];
    try {
      await db.execute(`SELECT ${colName} FROM catalog_signs LIMIT 1`);
    } catch {
      await db.execute(`ALTER TABLE catalog_signs ADD COLUMN ${col}`);
      console.log(`  Added column: ${colName}`);
    }
  }

  // Load Bonn data
  const filePath = path.join(__dirname, '..', 'data', 'classicmayan-signs.json');
  const bonnSigns: BonnSign[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Loaded ${bonnSigns.length} Bonn signs\n`);

  // Load catalog signs from DB
  const result = await db.execute(
    `SELECT id, graphcode, mhd_code, thompson_code, zender_code,
            syllabic_value, logographic_value, english_translation
     FROM catalog_signs`
  );

  interface CatalogEntry {
    id: number;
    thompson_code: string | null;
    zender_code: string | null;
    syllabic_value: string | null;
    logographic_value: string | null;
    english_translation: string | null;
  }

  // Build lookup maps
  // zender_code → catalog entry (primary match path)
  const byZender = new Map<string, CatalogEntry[]>();
  // thompson_code numeric part → catalog entries (secondary match path)
  const byThompson = new Map<string, CatalogEntry[]>();

  for (const row of result.rows) {
    const entry: CatalogEntry = {
      id: row.id as number,
      thompson_code: row.thompson_code as string | null,
      zender_code: row.zender_code as string | null,
      syllabic_value: row.syllabic_value as string | null,
      logographic_value: row.logographic_value as string | null,
      english_translation: row.english_translation as string | null,
    };

    if (row.zender_code) {
      const zCode = String(row.zender_code).trim();
      if (!byZender.has(zCode)) byZender.set(zCode, []);
      byZender.get(zCode)!.push(entry);
    }

    if (row.thompson_code) {
      const tCode = String(row.thompson_code).trim();
      // Extract numeric part(s) - handle comma-separated and letter suffixes
      // e.g., "0096" → "96", "0144c" → "144", "0060abdef" → "60"
      const nums = tCode.split(/[,;]/).map(t => {
        const m = t.trim().match(/^0*(\d+)/);
        return m ? m[1] : null;
      }).filter(Boolean) as string[];

      for (const num of nums) {
        if (!byThompson.has(num)) byThompson.set(num, []);
        byThompson.get(num)!.push(entry);
      }
    }
  }

  console.log(`Catalog: ${result.rows.length} signs`);
  console.log(`  ${byZender.size} unique zender codes`);
  console.log(`  ${byThompson.size} unique Thompson numbers\n`);

  // Match and update
  let matchedByZender = 0;
  let matchedByThompson = 0;
  let noMatch = 0;
  let bonnUpdated = 0;
  let thompsonFilled = 0;
  let zenderFilled = 0;
  let syllabicFilled = 0;
  let logographicFilled = 0;
  let translationFilled = 0;
  let catalogRowsUpdated = 0;

  const updates: { sql: string; args: (string | number | null)[] }[] = [];
  const unmatchedSigns: { signNo: number; thompson: string[] }[] = [];

  for (const bonn of bonnSigns) {
    // Zero-pad Bonn sign number to match our zender_code format
    const bonnZender = String(bonn.sign_number).padStart(4, '0');

    // Get the primary (first) graph's image URL
    const primaryImage = bonn.graphs.length > 0 ? bonn.graphs[0].image_url : null;

    // Get the best decipherment confidence (lowest number = most certain)
    const bestConfidence = bonn.decipherments.length > 0
      ? Math.min(...bonn.decipherments.map(d => d.confidence))
      : null;

    // Try matching by zender code (TWKM number)
    let matchedEntries = byZender.get(bonnZender);
    let matchMethod = 'zender';

    if (!matchedEntries || matchedEntries.length === 0) {
      // Fallback: match by Thompson concordance
      matchedEntries = [];
      for (const tCode of bonn.thompson_codes) {
        // Strip "T" prefix and any letter suffixes to get just the number
        // e.g., "T510b" → "510", "T561a" → "561", "T3" → "3"
        const tNum = tCode.replace(/^T/, '').replace(/[a-z]+$/i, '');
        const entries = byThompson.get(tNum) || [];
        for (const e of entries) {
          if (!matchedEntries.some(m => m.id === e.id)) {
            matchedEntries.push(e);
          }
        }
      }
      if (matchedEntries.length > 0) {
        matchMethod = 'thompson';
      }
    }

    if (matchedEntries.length === 0) {
      noMatch++;
      unmatchedSigns.push({ signNo: bonn.sign_number, thompson: bonn.thompson_codes });
      continue;
    }

    if (matchMethod === 'zender') matchedByZender++;
    else matchedByThompson++;

    // Update each matching catalog entry
    for (const entry of matchedEntries) {
      const setClauses: string[] = [];
      const args: (string | number | null)[] = [];

      // Always set bonn_sign_number
      setClauses.push('bonn_sign_number = ?');
      args.push(bonn.sign_number);

      // Set bonn_confidence
      if (bestConfidence !== null) {
        setClauses.push('bonn_confidence = ?');
        args.push(bestConfidence);
      }

      // Set bonn_image_url
      if (primaryImage) {
        setClauses.push('bonn_image_url = ?');
        args.push(primaryImage);
      }

      // Fill thompson_code if empty and Bonn has Thompson concordances
      if (!entry.thompson_code && bonn.thompson_codes.length > 0) {
        // Convert Bonn format (T3, T13) to our format (0003, 0013)
        const paddedThompson = bonn.thompson_codes.map(t => {
          const num = t.replace(/^T/, '');
          return num.padStart(4, '0');
        }).join(', ');
        setClauses.push('thompson_code = ?');
        args.push(paddedThompson);
        thompsonFilled++;
      }

      // Fill zender_code if empty
      if (!entry.zender_code) {
        setClauses.push('zender_code = ?');
        args.push(bonnZender);
        zenderFilled++;
      }

      // Fill syllabic_value from Bonn phonogram decipherments
      if (!entry.syllabic_value) {
        const phonograms = bonn.decipherments
          .filter(d => d.type === 'phonogram')
          .sort((a, b) => a.confidence - b.confidence); // best confidence first
        if (phonograms.length > 0) {
          setClauses.push('syllabic_value = ?');
          args.push(phonograms.map(p => p.value).join(', '));
          syllabicFilled++;
        }
      }

      // Fill logographic_value from Bonn logogram decipherments
      if (!entry.logographic_value) {
        const logograms = bonn.decipherments
          .filter(d => d.type === 'logogram')
          .sort((a, b) => a.confidence - b.confidence);
        if (logograms.length > 0) {
          setClauses.push('logographic_value = ?');
          args.push(logograms.map(l => l.value).join(', '));
          logographicFilled++;
        }
      }

      // Fill english_translation from Bonn translation
      if (!entry.english_translation && bonn.translation) {
        setClauses.push('english_translation = ?');
        args.push(bonn.translation);
        translationFilled++;
      }

      if (setClauses.length > 0) {
        args.push(entry.id);
        updates.push({
          sql: `UPDATE catalog_signs SET ${setClauses.join(', ')} WHERE id = ?`,
          args,
        });
        catalogRowsUpdated++;
      }
    }

    // Batch execute
    if (updates.length >= 100) {
      await db.batch(updates, 'write');
      updates.length = 0;
      bonnUpdated++;
      if (bonnUpdated % 100 === 0) {
        console.log(`  Processed ${bonnUpdated} Bonn signs...`);
      }
    }
  }

  // Final batch
  if (updates.length > 0) {
    await db.batch(updates, 'write');
  }

  console.log(`\n=== Match Results ===`);
  console.log(`Matched by zender/TWKM code: ${matchedByZender}`);
  console.log(`Matched by Thompson code: ${matchedByThompson}`);
  console.log(`Total matched: ${matchedByZender + matchedByThompson}/${bonnSigns.length} Bonn signs`);
  console.log(`Not matched: ${noMatch}`);
  console.log(`Catalog rows updated: ${catalogRowsUpdated}`);
  console.log(`Thompson codes filled: ${thompsonFilled}`);
  console.log(`Zender codes filled: ${zenderFilled}`);
  console.log(`Syllabic values filled: ${syllabicFilled}`);
  console.log(`Logographic values filled: ${logographicFilled}`);
  console.log(`Translations filled: ${translationFilled}`);

  // Print some unmatched examples
  if (unmatchedSigns.length > 0) {
    console.log(`\nUnmatched Bonn signs (first 20):`);
    unmatchedSigns.slice(0, 20).forEach(s => {
      console.log(`  Sign ${s.signNo}: Thompson=${s.thompson.join(', ') || 'none'}`);
    });
  }

  // Print coverage after merge
  const after = await db.execute(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN thompson_code IS NOT NULL THEN 1 ELSE 0 END) as has_thompson,
      SUM(CASE WHEN zender_code IS NOT NULL THEN 1 ELSE 0 END) as has_zender,
      SUM(CASE WHEN kettunen_code IS NOT NULL THEN 1 ELSE 0 END) as has_kettunen,
      SUM(CASE WHEN gronemeyer_code IS NOT NULL THEN 1 ELSE 0 END) as has_gronemeyer,
      SUM(CASE WHEN bonn_sign_number IS NOT NULL THEN 1 ELSE 0 END) as has_bonn,
      SUM(CASE WHEN bonn_image_url IS NOT NULL THEN 1 ELSE 0 END) as has_bonn_img,
      SUM(CASE WHEN syllabic_value IS NOT NULL THEN 1 ELSE 0 END) as has_syllabic,
      SUM(CASE WHEN logographic_value IS NOT NULL THEN 1 ELSE 0 END) as has_logographic,
      SUM(CASE WHEN english_translation IS NOT NULL THEN 1 ELSE 0 END) as has_translation
    FROM catalog_signs
  `);
  const r = after.rows[0] as Record<string, number>;
  console.log('\n=== Coverage After Import ===');
  console.log(`  Thompson: ${r.has_thompson}/${r.total} (${Math.round(r.has_thompson / r.total * 100)}%)`);
  console.log(`  Zender/Bonn: ${r.has_zender}/${r.total} (${Math.round(r.has_zender / r.total * 100)}%)`);
  console.log(`  Kettunen: ${r.has_kettunen}/${r.total} (${Math.round(r.has_kettunen / r.total * 100)}%)`);
  console.log(`  Gronemeyer: ${r.has_gronemeyer}/${r.total} (${Math.round(r.has_gronemeyer / r.total * 100)}%)`);
  console.log(`  Bonn sign number: ${r.has_bonn}/${r.total} (${Math.round(r.has_bonn / r.total * 100)}%)`);
  console.log(`  Bonn image: ${r.has_bonn_img}/${r.total} (${Math.round(r.has_bonn_img / r.total * 100)}%)`);
  console.log(`  Syllabic value: ${r.has_syllabic}/${r.total} (${Math.round(r.has_syllabic / r.total * 100)}%)`);
  console.log(`  Logographic value: ${r.has_logographic}/${r.total} (${Math.round(r.has_logographic / r.total * 100)}%)`);
  console.log(`  English translation: ${r.has_translation}/${r.total} (${Math.round(r.has_translation / r.total * 100)}%)`);
}

main().catch(console.error);
