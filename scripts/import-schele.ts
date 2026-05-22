// scripts/import-schele.ts
// Scrapes the LACMA/AncientAmericas Linda Schele Drawing Collection
// (~886 records across ~19 pages). Each item is fetched individually for
// full metadata: title, object number (SD-####), medium, site found,
// region, period, culture, archaeological phase, provenance, description,
// bibliography.
// Imports as source_items + auto-links to entity_mentions via site name.
// Idempotent.
// Run with: npx tsx scripts/import-schele.ts [--limit N]
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

const BASE = 'https://www.ancientamericas.org';
const BROWSE_URL = (page: number) => `${BASE}/collection/browse/29?page=${page}`;
const ITEM_URL = (id: string) => `${BASE}/collection/${id}`;
const UA = 'MayaSite Research Bot (academic use; omaresp35@gmail.com)';
const PAGE_DELAY_MS = 600;
const ITEM_DELAY_MS = 250;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ScheleRecord {
  aaId: string;
  title: string | null;
  objectNumber: string | null;
  artist: string | null;
  medium: string | null;
  dimensions: string | null;
  bibliography: string | null;
  siteFound: string | null;
  region: string | null;
  period: string | null;
  phase: string | null;
  culture: string | null;
  provenance: string | null;
  description: string | null;
  imageUrl: string | null;
  thumbUrl: string | null;
  rights: string | null;
}

async function fetchWithRetry(url: string, attempts = 3): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.status === 404) throw new Error('404');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      lastErr = e;
      if (String(e).includes('404')) throw e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

function extractField(html: string, label: string): string | null {
  // <dt>Label</dt><dd>...content...</dd>
  const re = new RegExp(`<dt>\\s*${label}\\s*</dt>\\s*<dd[^>]*>([\\s\\S]*?)</dd>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  const val = decodeEntities(m[1]);
  return val || null;
}

function parseItem(aaId: string, html: string): ScheleRecord {
  const titleMatch = html.match(/<h1 id="object-title">([^<]*)<\/h1>/);
  const title = titleMatch ? decodeEntities(titleMatch[1]) : null;

  // Main image: src="https://...sites/default/files/AA.01.0001.png"
  const imageMatch = html.match(/<img[^>]+src="(https?:\/\/[^"]+\/sites\/default\/files\/[^"]+\.(?:png|jpg|jpeg))[^"]*"/i);
  const imageUrl = imageMatch ? imageMatch[1] : null;
  // Thumbnail: same URL but styles/.../public/...
  const thumbMatch = html.match(/src="(https?:\/\/[^"]+\/sites\/default\/files\/styles\/[^"]+\/public\/[^"]+\.(?:png|jpg|jpeg))[^"?]*\?[^"]+"/i);
  const thumbUrl = thumbMatch ? thumbMatch[1] : null;

  return {
    aaId,
    title,
    objectNumber: extractField(html, 'Object Number'),
    artist: extractField(html, 'Artist'),
    medium: extractField(html, 'Medium'),
    dimensions: extractField(html, 'Object Dimensions'),
    bibliography: extractField(html, 'Bibliography'),
    siteFound: extractField(html, 'Site Found'),
    region: extractField(html, 'Geographic Region'),
    period: extractField(html, 'Chronological Period'),
    phase: extractField(html, 'Archaeological Phase'),
    culture: extractField(html, 'Culture'),
    provenance: extractField(html, 'Provenance'),
    description: extractField(html, 'Description'),
    imageUrl,
    thumbUrl,
    rights: extractField(html, 'Rights and Image Use'),
  };
}

async function batchExecute(stmts: { sql: string; args: (string | number | null)[] }[]) {
  const BATCH = 50;
  for (let i = 0; i < stmts.length; i += BATCH) {
    await db.batch(stmts.slice(i, i + BATCH), 'write');
  }
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

  console.log('Importing LACMA/AncientAmericas Schele Drawing Collection...\n');

  // Ensure source_collections row
  await db.execute({
    sql: `INSERT OR IGNORE INTO source_collections
            (collection_id, title, provider, source_url, rights_note, response_format)
          VALUES ('schele-lacma', 'Linda Schele Drawing Collection', 'LACMA / AncientAmericas.org',
                  'https://www.ancientamericas.org/collection/browse/29',
                  'Copyright LACMA. Freely available for scholarly study and academic publication; publication-quality assets via rights@lacma.org.',
                  'HTML scrape')`,
    args: [],
  });

  // Place entity map for site linking
  const placeEntities = await db.execute(`SELECT entity_id, canonical_name FROM entities WHERE entity_type = 'place'`);
  const placeMap = new Map<string, string>();
  placeEntities.rows.forEach((r) => {
    placeMap.set(String(r.canonical_name).toLowerCase(), String(r.entity_id));
  });
  console.log(`  ${placeMap.size} place entities loaded.\n`);

  // 1) Enumerate all aa IDs across browse pages
  const ids = new Set<string>();
  for (let p = 0; p < 25; p++) {
    process.stdout.write(`  Browse page ${p}... `);
    const html = await fetchWithRetry(BROWSE_URL(p));
    const matches = html.match(/aa\d{6}/g) || [];
    const uniquePage = new Set(matches);
    const newOnPage = Array.from(uniquePage).filter((id) => !ids.has(id));
    newOnPage.forEach((id) => ids.add(id));
    process.stdout.write(`${uniquePage.size} total, ${newOnPage.length} new\n`);
    if (uniquePage.size === 0) break;
    if (ids.size >= limit) break;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }

  const idList = Array.from(ids).slice(0, limit);
  console.log(`\n  Total Schele items to fetch: ${idList.length}\n`);

  // 2) Fetch each item detail page
  const itemStmts: { sql: string; args: (string | number | null)[] }[] = [];
  const mentionStmts: { sql: string; args: (string | number | null)[] }[] = [];
  let matched404 = 0;
  let matchedSite = 0;

  for (let i = 0; i < idList.length; i++) {
    const aaId = idList[i];
    if (i % 25 === 0) process.stdout.write(`  Fetching ${i + 1}/${idList.length}... `);
    try {
      const html = await fetchWithRetry(ITEM_URL(aaId));
      const r = parseItem(aaId, html);
      itemStmts.push({
        sql: `INSERT OR REPLACE INTO source_items
                (item_id, collection_id, external_id, title, creator, site_name,
                 period, culture, material, dimensions, description, notes,
                 image_url, thumb_url, source_url, rights_note, raw_json, object_number)
              VALUES (?, 'schele-lacma', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `schele-${aaId}`,
          aaId,
          r.title,
          r.artist || 'Linda Schele',
          r.siteFound,
          r.period,
          r.culture,
          r.medium,
          r.dimensions,
          r.description,
          r.bibliography,
          r.imageUrl,
          r.thumbUrl,
          ITEM_URL(aaId),
          r.rights,
          JSON.stringify(r),
          r.objectNumber,
        ] as (string | number | null)[],
      });

      if (r.siteFound) {
        const entityId = placeMap.get(r.siteFound.toLowerCase());
        if (entityId) {
          matchedSite++;
          mentionStmts.push({
            sql: `INSERT OR IGNORE INTO entity_mentions
                    (mention_id, entity_id, source_item_id, mention_text, confidence, match_method)
                  VALUES (?, ?, ?, ?, 0.95, 'schele_site_found')`,
            args: [
              `schele-${aaId}-${entityId}`,
              entityId,
              `schele-${aaId}`,
              r.siteFound,
            ],
          });
        }
      }
    } catch (e) {
      if (String(e).includes('404')) matched404++;
    }
    if ((i + 1) % 25 === 0) process.stdout.write('done\n');
    await new Promise((r) => setTimeout(r, ITEM_DELAY_MS));
  }
  console.log();

  await batchExecute(itemStmts);
  await batchExecute(mentionStmts);
  console.log(`\n  ${itemStmts.length} source_items inserted (${matched404} 404s skipped).`);
  console.log(`  ${matchedSite} items linked to existing place entities.`);

  await db.execute(`UPDATE source_collections SET last_imported_at = datetime('now') WHERE collection_id = 'schele-lacma'`);

  // Summary
  const total = await db.execute(`SELECT COUNT(*) AS n FROM source_items WHERE collection_id = 'schele-lacma'`);
  console.log(`\nTotal schele-lacma source_items now: ${total.rows[0].n}`);

  const topSites = await db.execute(`
    SELECT site_name, COUNT(*) AS n FROM source_items
    WHERE collection_id = 'schele-lacma' AND site_name IS NOT NULL
    GROUP BY site_name ORDER BY n DESC LIMIT 10
  `);
  console.log('\nTop 10 Schele sites:');
  topSites.rows.forEach((r) => console.log(`  ${r.site_name}: ${r.n}`));

  console.log('\nDONE.');
}

main().catch((err) => { console.error(err); process.exit(1); });
