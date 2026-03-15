/**
 * Creates persons table, imports ClassicMayan rulers, populates scribe from blnotes,
 * and links persons to blocks via artefact codes.
 *
 * Run with: npx tsx scripts/import-persons.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

interface CMPerson {
  id: string;
  label: string;
}

interface CMArtefact {
  id: number;
  label: string;
  persons?: string[];
  site?: { id: number; label: string } | null;
}

async function main() {
  console.log('=== Person Entity Import ===\n');

  // ── Step 1: Create persons table ──
  console.log('Step 1: Creating persons table...');
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS persons (
      person_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      site_name TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS person_block_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id TEXT NOT NULL REFERENCES persons(person_id),
      block_id INTEGER NOT NULL REFERENCES blocks(id),
      role TEXT NOT NULL DEFAULT 'associated',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_person_block_person ON person_block_links(person_id);
    CREATE INDEX IF NOT EXISTS idx_person_block_block ON person_block_links(block_id);
    CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name);
  `);
  console.log('  Tables created.\n');

  // ── Step 2: Import ClassicMayan rulers ──
  console.log('Step 2: Importing ClassicMayan rulers...');
  const raw = JSON.parse(readFileSync(path.join(__dirname, '..', 'data', 'classicmayan-raw.json'), 'utf8'));
  const cmPersons: CMPerson[] = raw.persons || [];
  const cmArtefacts: CMArtefact[] = raw.artefacts || [];

  let personsInserted = 0;
  for (const p of cmPersons) {
    const personId = `cm-${p.id}`;
    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO persons (person_id, name, source) VALUES (?, ?, ?)`,
        args: [personId, p.label, 'classicmayan.org'],
      });
      personsInserted++;
    } catch {
      // already exists
    }
  }
  console.log(`  Inserted ${personsInserted} ClassicMayan rulers.\n`);

  // ── Step 3: Link persons to blocks via artefacts ──
  console.log('Step 3: Linking persons to blocks via artefacts...');

  // Build artefact→person mapping
  const artefactPersons = new Map<number, string[]>();
  for (const a of cmArtefacts) {
    if (a.persons && a.persons.length > 0) {
      artefactPersons.set(a.id, a.persons);
    }
  }
  console.log(`  ${artefactPersons.size} artefacts have person links.`);

  // Find blocks with object_date_artefact_id (stored as artefact label in artifact name/notes)
  // Actually we need to match artefact labels to blocks via artifact_code + site_name
  // Better approach: check if we stored artefact IDs during object date import
  // The object dates script matched artefacts by label → artifact_code prefix
  // Let's match the same way: artefact.label contains site name + monument

  // Build label→artifact_code mapping by parsing artefact labels
  const artefactBlocks = new Map<number, string[]>(); // artefact_id → artifact_codes

  // Get all distinct artifact codes from blocks
  const artCodesResult = await db.execute('SELECT DISTINCT artifact_code FROM blocks');
  const allArtCodes = new Set(artCodesResult.rows.map(r => String(r.artifact_code)));

  // Try to match artefacts to artifact codes using site abbreviations from labels
  const siteAbbrevMap: Record<string, string> = {
    'Copan': 'CPN',
    'Tikal': 'TIK',
    'Palenque': 'PAL',
    'Yaxchilan': 'YAX',
    'Quirigua': 'QRG',
    'Piedras Negras': 'PNG',
    'Naranjo': 'NAR',
    'Calakmul': 'CLK',
    'Tonina': 'TNA',
    'Dos Pilas': 'DPL',
    'Pusilha': 'PUS',
    'La Pasadita': 'LPS',
    'El Abra': 'ABR',
    'Lacanha': 'LAC',
    'Uxul': 'UXL',
  };

  let linksCreated = 0;
  for (const [artId, personIds] of artefactPersons) {
    const artefact = cmArtefacts.find(a => a.id === artId);
    if (!artefact) continue;

    // Try to find matching blocks by artifact code
    const label = artefact.label;
    let matchedCode: string | null = null;

    // Try site abbreviation match
    for (const [siteName, siteCode] of Object.entries(siteAbbrevMap)) {
      if (label.startsWith(siteName)) {
        if (allArtCodes.has(siteCode)) {
          matchedCode = siteCode;
          break;
        }
      }
    }

    if (!matchedCode) continue;

    // Find blocks from this artifact code
    const blocksResult = await db.execute({
      sql: 'SELECT id FROM blocks WHERE artifact_code = ? LIMIT 500',
      args: [matchedCode],
    });

    if (blocksResult.rows.length === 0) continue;

    // Link each person to these blocks
    const batch: { sql: string; args: (string | number)[] }[] = [];
    for (const pid of personIds) {
      const personId = `cm-${pid}`;
      for (const block of blocksResult.rows) {
        batch.push({
          sql: 'INSERT OR IGNORE INTO person_block_links (person_id, block_id, role) VALUES (?, ?, ?)',
          args: [personId, Number(block.id), 'ruler'],
        });
      }
    }

    if (batch.length > 0) {
      // Execute in small batches
      for (let i = 0; i < batch.length; i += 100) {
        try {
          await db.batch(batch.slice(i, i + 100));
          linksCreated += Math.min(100, batch.length - i);
        } catch {
          // ignore duplicates
        }
      }
    }
  }
  console.log(`  Created ${linksCreated} person-block links.\n`);

  // ── Step 4: Import blnotes as scribe data ──
  console.log('Step 4: Populating scribe field from blnotes...');

  // blnotes contains scribe attributions like "Dresden scribe 3"
  // Currently scribe column is NULL for all blocks
  // We'll populate scribe from blnotes where it looks like a scribe attribution
  const scribePatterns = [
    'scribe',
    'painter',
    'artist',
    'carver',
    'sculptor',
  ];

  // Get blocks with notes that look like scribe attributions
  const notesResult = await db.execute(`
    SELECT DISTINCT notes FROM blocks
    WHERE notes IS NOT NULL AND notes != '' AND notes != '_'
  `);

  const scribeNotes: string[] = [];
  const nonScribeNotes: string[] = [];

  for (const row of notesResult.rows) {
    const note = String(row.notes).toLowerCase();
    if (scribePatterns.some(p => note.includes(p))) {
      scribeNotes.push(String(row.notes));
    } else {
      nonScribeNotes.push(String(row.notes));
    }
  }

  console.log(`  Found ${scribeNotes.length} scribe-attribution note values, ${nonScribeNotes.length} other notes.`);
  console.log(`  Scribe notes: ${scribeNotes.slice(0, 10).join(', ')}...`);

  // Update blocks: set scribe = notes where notes is a scribe attribution
  let scribesUpdated = 0;
  for (const note of scribeNotes) {
    const result = await db.execute({
      sql: `UPDATE blocks SET scribe = ? WHERE notes = ? AND (scribe IS NULL OR scribe = '')`,
      args: [note, note],
    });
    scribesUpdated += result.rowsAffected;
  }
  console.log(`  Updated ${scribesUpdated} blocks with scribe attributions.\n`);

  // ── Step 5: Create person entries from unique person_codes ──
  console.log('Step 5: Creating person entries from MHD person codes...');

  const personCodesResult = await db.execute(`
    SELECT person_code, COUNT(*) as block_count
    FROM blocks
    WHERE person_code IS NOT NULL AND person_code != '' AND person_code != '_'
    GROUP BY person_code
    ORDER BY block_count DESC
  `);

  let mhdPersonsCreated = 0;
  for (const row of personCodesResult.rows) {
    const code = String(row.person_code);
    const personId = `mhd-${code}`;
    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO persons (person_id, name, source, notes) VALUES (?, ?, ?, ?)`,
        args: [personId, code, 'MHD', `MHD person code. Appears in ${row.block_count} blocks.`],
      });
      mhdPersonsCreated++;
    } catch {
      // already exists
    }
  }
  console.log(`  Created ${mhdPersonsCreated} MHD person entries (from ${personCodesResult.rows.length} unique codes).\n`);

  // ── Step 6: Link MHD person codes to blocks (bulk) ──
  console.log('Step 6: Linking MHD person codes to blocks (bulk INSERT...SELECT)...');

  const mhdLinkResult = await db.execute(`
    INSERT OR IGNORE INTO person_block_links (person_id, block_id, role)
    SELECT 'mhd-' || b.person_code, b.id, 'person'
    FROM blocks b
    WHERE b.person_code IS NOT NULL AND b.person_code != '' AND b.person_code != '_'
  `);
  console.log(`  Created ${mhdLinkResult.rowsAffected} MHD person-block links.\n`);

  // ── Step 7: Create scribe persons from unique scribe values ──
  console.log('Step 7: Creating scribe person entries...');

  const scribesResult = await db.execute(`
    SELECT scribe, COUNT(*) as block_count
    FROM blocks
    WHERE scribe IS NOT NULL AND scribe != '' AND scribe != '_'
    GROUP BY scribe
    ORDER BY block_count DESC
  `);

  let scribePersonsCreated = 0;
  for (const row of scribesResult.rows) {
    const scribeName = String(row.scribe);
    const personId = `scribe-${scribeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO persons (person_id, name, source, notes) VALUES (?, ?, ?, ?)`,
        args: [personId, scribeName, 'MHD', `Scribe attribution from blnotes. Appears in ${row.block_count} blocks.`],
      });
      scribePersonsCreated++;
    } catch {
      // already exists
    }
  }
  console.log(`  Created ${scribePersonsCreated} scribe person entries.\n`);

  // Link scribe persons to blocks (bulk)
  // SQLite doesn't have REGEXP so we use REPLACE to build the person_id
  // For scribes we need to match the ID generation logic: lowercase, replace non-alphanumeric with hyphens
  // Simplest: just do per-scribe inserts since there are only ~24 unique values
  let scribeLinksCreated = 0;
  for (const row of scribesResult.rows) {
    const scribeName = String(row.scribe);
    const personId = `scribe-${scribeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const result = await db.execute({
      sql: `INSERT OR IGNORE INTO person_block_links (person_id, block_id, role)
            SELECT ?, b.id, 'scribe'
            FROM blocks b WHERE b.scribe = ?`,
      args: [personId, scribeName],
    });
    scribeLinksCreated += result.rowsAffected;
  }
  console.log(`  Created ${scribeLinksCreated} scribe-block links.\n`);

  // ── Summary ──
  const [totalPersons, totalLinks] = await Promise.all([
    db.execute('SELECT COUNT(*) as c FROM persons'),
    db.execute('SELECT COUNT(*) as c FROM person_block_links'),
  ]);

  console.log('=== Summary ===');
  console.log(`  Total persons: ${totalPersons.rows[0].c}`);
  console.log(`  Total person-block links: ${totalLinks.rows[0].c}`);

  // Sample
  const sample = await db.execute(`
    SELECT p.person_id, p.name, p.source, COUNT(pbl.id) as block_count
    FROM persons p
    LEFT JOIN person_block_links pbl ON p.person_id = pbl.person_id
    GROUP BY p.person_id
    ORDER BY block_count DESC
    LIMIT 15
  `);
  console.log('\nTop persons by block count:');
  for (const s of sample.rows) {
    console.log(`  ${s.name} (${s.source}): ${s.block_count} blocks`);
  }
}

main().catch(console.error);
