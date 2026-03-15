/**
 * Parses artifact codes into human-readable names.
 * Uses actual site_code values from the DB to determine where the site prefix
 * ends and the object type begins.
 *
 * Pattern: {SiteCode}{ObjectType}{Number}{Suffix}
 * Examples:
 *   PNGSt12  → Piedras Negras, Stela 12
 *   TIKSt31  → Tikal, Stela 31
 *   PALTIw   → Palenque, Temple of the Inscriptions (west)
 *   CPNStJ   → Copan, Stela J
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Object type abbreviations found in MHD artifact codes
const OBJECT_TYPES: [string, string][] = [
  // Longer matches first to avoid partial matches
  ['Bench', 'Bench'],
  ['Misc', 'Miscellaneous'],
  ['Pier', 'Pier'],
  ['Step', 'Step'],
  ['Door', 'Doorway'],
  ['Wall', 'Wall'],
  ['Ring', 'Ring'],
  ['Mur', 'Mural'],
  ['Mon', 'Monument'],
  ['Pan', 'Panel'],
  ['Lin', 'Lintel'],
  ['Alt', 'Altar'],
  ['Tab', 'Tablet'],
  ['Plt', 'Platform'],
  ['Ves', 'Vessel'],
  ['Bon', 'Bone'],
  ['Ear', 'Earflare'],
  ['Cel', 'Celt'],
  ['Lid', 'Lid'],
  ['Cap', 'Capstone'],
  ['Col', 'Column'],
  ['Jam', 'Jamb'],
  ['Dsk', 'Disk'],
  ['Fig', 'Figurine'],
  ['Bl', 'Block'],
  ['Sc', 'Sculptured'],
  ['Sh', 'Shell'],
  ['Th', 'Throne'],
  ['Pl', 'Plaque'],
  ['HS', 'Hieroglyphic Stairway'],
  ['St', 'Stela'],
  // Special compound names
  ['TIw', 'Temple of the Inscriptions (west)'],
  ['TIe', 'Temple of the Inscriptions (east)'],
  ['TI', 'Temple of the Inscriptions'],
  ['TC', 'Temple of the Cross'],
  ['TFC', 'Temple of the Foliated Cross'],
  ['TS', 'Temple of the Sun'],
  ['PT', 'Palace Tablet'],
  ['FC', 'Foliated Cross'],
  ['T', 'Temple'],
];

// Direction/position suffixes
const SUFFIXES: Record<string, string> = {
  'n': 'north',
  's': 'south',
  'e': 'east',
  'w': 'west',
  'ew': 'east-west',
  'ns': 'north-south',
  'fr': 'front',
  'bk': 'back',
  'lt': 'left',
  'rt': 'right',
};

function parseObjectPart(remainder: string): string {
  if (!remainder) return '';

  // Try to match object type (longest match first — array is pre-sorted)
  for (const [abbr, name] of OBJECT_TYPES) {
    if (remainder.startsWith(abbr)) {
      const rest = remainder.slice(abbr.length);

      // Check if the name already includes direction (e.g., TIw → "Temple of the Inscriptions (west)")
      if (name.includes('(')) {
        return name;
      }

      // Parse remaining as number + optional suffix
      const numMatch = rest.match(/^(\d+)(.*)/);
      if (numMatch) {
        const number = numMatch[1];
        const suffix = numMatch[2];
        const readableSuffix = suffix ? SUFFIXES[suffix.toLowerCase()] : null;
        return readableSuffix ? `${name} ${number} (${readableSuffix})` : `${name} ${number}${suffix}`;
      }

      // No number — just letters (e.g., "J" in StJ, "Op" in AltOp)
      if (rest) {
        const readableSuffix = SUFFIXES[rest.toLowerCase()];
        return readableSuffix ? `${name} (${readableSuffix})` : `${name} ${rest}`;
      }

      return name;
    }
  }

  // Couldn't match an object type — return as-is
  return remainder;
}

async function main() {
  // Ensure artifact_name column exists
  try {
    await db.execute("ALTER TABLE blocks ADD COLUMN artifact_name TEXT");
    console.log('Added artifact_name column to blocks');
  } catch {
    console.log('artifact_name column already exists');
  }

  // Get all known site codes from the DB (longest first for matching)
  const siteResult = await db.execute(`
    SELECT DISTINCT site_code, site_name
    FROM blocks
    WHERE site_code IS NOT NULL AND site_code != '' AND site_code != '_'
    ORDER BY LENGTH(site_code) DESC
  `);

  const siteCodes = siteResult.rows.map(r => ({
    code: String(r.site_code),
    name: String(r.site_name || r.site_code),
  }));

  console.log(`Loaded ${siteCodes.length} site codes`);

  // Get all unique artifact codes
  const result = await db.execute(`
    SELECT DISTINCT artifact_code, site_code, site_name
    FROM blocks
    WHERE artifact_code IS NOT NULL AND artifact_code != '' AND artifact_code != '_'
    ORDER BY artifact_code
  `);

  console.log(`Found ${result.rows.length} unique artifact code + site combinations`);

  // Parse each artifact code
  const codeToName = new Map<string, string>();
  let parsed = 0;
  let unparsed = 0;

  for (const row of result.rows) {
    const code = String(row.artifact_code);
    const siteCode = row.site_code ? String(row.site_code) : null;
    const siteName = row.site_name ? String(row.site_name) : null;

    if (codeToName.has(code)) continue;

    // Use the known site_code to split the artifact code
    let objectPart = '';
    let resolvedSiteName = siteName;

    if (siteCode && code.startsWith(siteCode)) {
      objectPart = code.slice(siteCode.length);
    } else {
      // Try to match against all known site codes (longest first)
      const matched = siteCodes.find(sc => code.startsWith(sc.code));
      if (matched) {
        objectPart = code.slice(matched.code.length);
        if (!resolvedSiteName) resolvedSiteName = matched.name;
      } else {
        // Can't determine site prefix — skip
        codeToName.set(code, code);
        unparsed++;
        continue;
      }
    }

    if (!objectPart) {
      codeToName.set(code, resolvedSiteName || code);
      unparsed++;
      continue;
    }

    const readablePart = parseObjectPart(objectPart);
    if (readablePart === objectPart) {
      // Couldn't parse object type — just show site + raw
      codeToName.set(code, resolvedSiteName ? `${resolvedSiteName}, ${objectPart}` : code);
      unparsed++;
    } else {
      codeToName.set(code, resolvedSiteName ? `${resolvedSiteName}, ${readablePart}` : readablePart);
      parsed++;
    }
  }

  console.log(`Parsed: ${parsed}, Could not parse object type: ${unparsed}`);

  // Show examples
  console.log('\nExamples (parsed):');
  let shown = 0;
  for (const [code, name] of codeToName) {
    if (shown < 30 && name !== code && !name.endsWith(`, ${code.slice(3)}`)) {
      console.log(`  ${code} → ${name}`);
      shown++;
    }
  }

  // Clear old bad artifact_name values first
  await db.execute("UPDATE blocks SET artifact_name = NULL WHERE artifact_name IS NOT NULL");

  // Update blocks in batches
  const entries = Array.from(codeToName.entries()).filter(([code, name]) => name !== code);
  const BATCH = 50;
  let updated = 0;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const tx = await db.batch(
      batch.map(([code, name]) => ({
        sql: "UPDATE blocks SET artifact_name = ? WHERE artifact_code = ?",
        args: [name, code],
      }))
    );
    updated += tx.reduce((sum, r) => sum + (r.rowsAffected || 0), 0);

    if ((i / BATCH) % 20 === 0) {
      console.log(`  ${i}/${entries.length} codes processed, ${updated} blocks updated`);
    }
  }

  console.log(`\nBlocks updated with artifact_name: ${updated}`);

  // Verify with samples
  const sample = await db.execute(`
    SELECT artifact_code, artifact_name
    FROM blocks
    WHERE artifact_name IS NOT NULL
    GROUP BY artifact_code
    ORDER BY RANDOM()
    LIMIT 20
  `);
  console.log('\nRandom sample results:');
  sample.rows.forEach(r => console.log(`  ${r.artifact_code} → ${r.artifact_name}`));
}

main().catch(console.error);
