// scripts/import-famsi-montgomery.ts
// Scrapes the FAMSI Montgomery Drawing Collection (718 records, 15/page) into
// source_items. Each record: JM ID, location/site, caption/description,
// category (period/culture), keywords, credit, image URL.
// Also auto-seeds entity_mentions by matching location → existing entity place.
// Idempotent (INSERT OR REPLACE on UNIQUE(collection_id, external_id)).
// Run with: npx tsx scripts/import-famsi-montgomery.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

const BASE = 'http://research.famsi.org';
const LIST_URL = (rowstart: number) => `${BASE}/montgomery_list.php?rowstart=${rowstart}`;
const HIRES_BASE = `${BASE}/uploads/montgomery/hires`;
const TOTAL = 718;
const PAGE = 15;
const UA = 'MayaSite Research Bot (academic use; omaresp35@gmail.com)';

interface MontgomeryRecord {
  jmId: string;
  imageFilename: string;
  location: string | null;
  caption: string | null;
  category: string | null;
  keywords: string | null;
  credit: string | null;
  dimensions: string | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePage(html: string): MontgomeryRecord[] {
  const records: MontgomeryRecord[] = [];

  // Two URL patterns observed:
  //   /uploads/montgomery/hires/jm#####slug.jpg          (early/late pages)
  //   /uploads/montgomery/[NUM]/image/JM######slug.jpg   (middle pages)
  // Match both. Capture the full relative URL so we preserve the subdirectory.
  const imageRe = /\/uploads\/montgomery\/(?:hires|\d+\/image)\/(jm\d+[a-z0-9_]*)\.jpg/gi;
  const allMatches = Array.from(html.matchAll(imageRe));

  // Dedupe by (relative path) and skip thumbnails (the regex case-insensitive
  // catches both jm and JM; the `_tn_` prefix is the thumbnail variant).
  const seen = new Set<string>();
  for (const m of allMatches) {
    const fullRelPath = m[0]; // e.g. /uploads/montgomery/303/image/JM000750TikEmblem.jpg
    if (fullRelPath.includes('_tn_')) continue;
    if (seen.has(fullRelPath)) continue;
    seen.add(fullRelPath);

    const baseName = m[1]; // e.g. JM000750TikEmblem (no extension)
    const jmMatch = baseName.match(/^(jm\d+)/i);
    if (!jmMatch) continue;
    const jmId = jmMatch[1].toUpperCase();

    // Find metadata block immediately preceding this image
    const imgIdx = m.index ?? 0;
    const windowStart = Math.max(0, imgIdx - 4000);
    const windowEnd = imgIdx;
    const meta = html.slice(windowStart, windowEnd);

    const extract = (label: string): string | null => {
      const re = new RegExp(`text-bold">\\s*${label}:[^<]*</span>\\s*<span class="text">([^<]*)</span>`, 'i');
      const r = meta.match(re);
      return r ? decodeEntities(r[1]) : null;
    };

    records.push({
      jmId,
      imageFilename: fullRelPath, // full relative path including subdir
      location: extract('Location'),
      caption: extract('Caption'),
      category: extract('Category'),
      keywords: extract('Keywords'),
      credit: extract('Credit'),
      dimensions: extract('High Resolution'),
    });
  }
  return records;
}

function normalizeSite(loc: string | null): string | null {
  if (!loc) return null;
  // "Palenque, Chiapas, Mexico" → "Palenque"
  const first = loc.split(',')[0]?.trim();
  return first || null;
}

async function fetchWithRetry(url: string, attempts = 3): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function batchExecute(stmts: { sql: string; args: (string | number | null)[] }[]) {
  const BATCH = 50;
  for (let i = 0; i < stmts.length; i += BATCH) {
    await db.batch(stmts.slice(i, i + BATCH), 'write');
  }
}

async function main() {
  console.log('Importing FAMSI Montgomery Drawing Collection...\n');

  // Ensure the source_collections row exists
  await db.execute({
    sql: `INSERT OR IGNORE INTO source_collections
            (collection_id, title, provider, source_url, rights_note, response_format)
          VALUES ('famsi-montgomery', 'FAMSI Montgomery Drawing Collection', 'FAMSI / LACMA stewardship',
                  'http://research.famsi.org/montgomery_list.php',
                  'Copyright © John Montgomery. Hosted by FAMSI/LACMA for scholarly use; cite original.',
                  'HTML scrape')`,
    args: [],
  });

  // Build location → entity_id map up front for fast matching
  const placeEntities = await db.execute(`
    SELECT entity_id, canonical_name FROM entities WHERE entity_type = 'place'
  `);
  const placeMap = new Map<string, string>();
  placeEntities.rows.forEach((r) => {
    placeMap.set(String(r.canonical_name).toLowerCase(), String(r.entity_id));
  });
  console.log(`  ${placeMap.size} place entities loaded for site matching.\n`);

  const allRecords: MontgomeryRecord[] = [];
  for (let rowstart = 0; rowstart < TOTAL; rowstart += PAGE) {
    process.stdout.write(`  Page ${Math.floor(rowstart / PAGE) + 1}/${Math.ceil(TOTAL / PAGE)} (rowstart=${rowstart})... `);
    const html = await fetchWithRetry(LIST_URL(rowstart));
    const records = parsePage(html);
    allRecords.push(...records);
    process.stdout.write(`${records.length} records\n`);
    await new Promise((r) => setTimeout(r, 600)); // polite delay
  }

  console.log(`\nParsed ${allRecords.length} total records.\n`);

  // Insert source_items
  const itemStmts = allRecords.map((r) => {
    const site = normalizeSite(r.location);
    const period = r.category ? r.category.replace(/Maya,?\s*/i, '').trim() : null;
    // r.imageFilename is now the full relative URL (e.g. /uploads/montgomery/303/image/JM000750TikEmblem.jpg).
    // Build full URL + thumbnail URL by inserting _tn_ before the basename.
    const imageUrl = `${BASE}${r.imageFilename}`;
    const thumbUrl = `${BASE}${r.imageFilename.replace(/\/([^/]+)$/, '/_tn_$1')}`;
    return {
      sql: `INSERT OR REPLACE INTO source_items
              (item_id, collection_id, external_id, title, creator, site_name,
               period, description, notes, image_url, thumb_url, source_url, rights_note, raw_json)
            VALUES (?, 'famsi-montgomery', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `famsi-mont-${r.jmId.toLowerCase()}`,
        r.jmId,
        r.caption || r.jmId,
        'John Montgomery',
        site,
        period,
        r.caption,
        r.keywords,
        imageUrl,
        thumbUrl,
        `${BASE}/montgomery_list.php`,
        r.credit,
        JSON.stringify(r),
      ] as (string | number | null)[],
    };
  });
  await batchExecute(itemStmts);
  console.log(`  ${itemStmts.length} source_items inserted.`);

  // Link each Montgomery item to a place entity via location → site match
  // (writes into entity_mentions; block_id NULL since these are external items)
  // First add source_item_id column to entity_mentions if missing.
  const cols = await db.execute(`PRAGMA table_info(entity_mentions)`);
  const hasItemCol = cols.rows.some((r) => String(r.name) === 'source_item_id');
  if (!hasItemCol) {
    console.log('  Adding entity_mentions.source_item_id column...');
    await db.execute(`ALTER TABLE entity_mentions ADD COLUMN source_item_id TEXT`);
  }
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mentions_source_item ON entity_mentions(source_item_id)`);

  const mentionStmts: { sql: string; args: (string | number | null)[] }[] = [];
  let matched = 0;
  for (const r of allRecords) {
    const site = normalizeSite(r.location);
    if (!site) continue;
    const entityId = placeMap.get(site.toLowerCase());
    if (!entityId) continue;
    matched++;
    mentionStmts.push({
      sql: `INSERT OR IGNORE INTO entity_mentions
              (mention_id, entity_id, source_item_id, mention_text, confidence, match_method)
            VALUES (?, ?, ?, ?, 0.9, 'famsi_mont_location')`,
      args: [
        `mont-${r.jmId.toLowerCase()}-${entityId}`,
        entityId,
        `famsi-mont-${r.jmId.toLowerCase()}`,
        site,
      ],
    });
  }
  await batchExecute(mentionStmts);
  console.log(`  ${matched} montgomery items linked to a place entity.`);

  // Update last_imported_at
  await db.execute(`UPDATE source_collections SET last_imported_at = datetime('now') WHERE collection_id = 'famsi-montgomery'`);

  // Summary
  const total = await db.execute(`SELECT COUNT(*) AS n FROM source_items WHERE collection_id = 'famsi-montgomery'`);
  console.log(`\nTotal famsi-montgomery source_items now: ${total.rows[0].n}`);

  const topSites = await db.execute(`
    SELECT site_name, COUNT(*) AS n FROM source_items
    WHERE collection_id = 'famsi-montgomery' AND site_name IS NOT NULL
    GROUP BY site_name ORDER BY n DESC LIMIT 10
  `);
  console.log('\nTop 10 Montgomery sites:');
  topSites.rows.forEach((r) => console.log(`  ${r.site_name}: ${r.n}`));

  console.log('\nDONE.');
}

main().catch((err) => { console.error(err); process.exit(1); });
