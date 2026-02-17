// scripts/scrape-cmhi.ts
// Scrapes Harvard CMHI (Corpus of Maya Hieroglyphic Inscriptions) site pages
// for monument line drawing images and metadata.
// Run with: npx tsx scripts/scrape-cmhi.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://peabody.harvard.edu';

const CMHI_SITES = [
  { slug: 'coba', name: 'Coba', code: 'COB' },
  { slug: 'itzimte', name: 'Itzimte', code: 'ITN' },
  { slug: 'ixkun', name: 'Ixkun', code: 'IXK' },
  { slug: 'ixtutz', name: 'Ixtutz', code: 'IXT' },
  { slug: 'la-honradez', name: 'La Honradez', code: 'LHZ' },
  { slug: 'naranjo', name: 'Naranjo', code: 'NAR' },
  { slug: 'piedras-negras', name: 'Piedras Negras', code: 'PNG' },
  { slug: 'pixoy', name: 'Pixoy', code: 'PIX' },
  { slug: 'seibal', name: 'Seibal', code: 'SBL' },
  { slug: 'tonina', name: 'Tonina', code: 'TNA' },
  { slug: 'tzum', name: 'Tzum', code: 'TZM' },
  { slug: 'uaxactun', name: 'Uaxactun', code: 'UAX' },
  { slug: 'ucanal', name: 'Ucanal', code: 'UCN' },
  { slug: 'uxmal', name: 'Uxmal', code: 'UXM' },
  { slug: 'xcalumkin', name: 'Xcalumkin', code: 'XCL' },
  { slug: 'xultun', name: 'Xultun', code: 'XUL' },
  { slug: 'yaxchilan', name: 'Yaxchilan', code: 'YAX' },
];

interface CmhiImage {
  site_name: string;
  site_code: string;
  image_url: string;
  filename: string;
  type: 'drawing' | 'photo' | 'map' | 'other';
  monument_type: string | null;
  monument_number: string | null;
}

function categorizeImage(filename: string): { type: CmhiImage['type']; monumentType: string | null; monumentNum: string | null } {
  const lower = filename.toLowerCase();

  // Determine type
  let type: CmhiImage['type'] = 'other';
  if (lower.includes('_dwg') || lower.includes('drawing')) type = 'drawing';
  else if (lower.includes('_pho') || lower.includes('photo')) type = 'photo';
  else if (lower.includes('_map') || lower.includes('region_map') || lower.includes('site_map')) type = 'map';

  // Extract monument info from filename
  // Pattern: {site}_{monument_type}_{number}_{type}.jpg
  let monumentType: string | null = null;
  let monumentNum: string | null = null;

  const typeMap: Record<string, string> = {
    'lnt': 'Lintel', 'st': 'Stela', 'alt': 'Altar',
    'hs': 'Hieroglyphic Stairway', 'thr': 'Throne',
    'pan': 'Panel', 'mon': 'Monument', 'misc': 'Miscellaneous',
    'bcs': 'Ball Court Sculpture', 'col': 'Column',
    'jam': 'Jamb', 'cap': 'Capstone', 'tab': 'Tablet',
  };

  for (const [abbr, name] of Object.entries(typeMap)) {
    const regex = new RegExp(`_${abbr}_(\\d+)`, 'i');
    const match = lower.match(regex);
    if (match) {
      monumentType = name;
      monumentNum = match[1];
      break;
    }
  }

  return { type, monumentType, monumentNum };
}

async function scrapeSite(site: typeof CMHI_SITES[0]): Promise<CmhiImage[]> {
  const url = `${BASE_URL}/${site.slug}`;
  console.log(`  Fetching ${site.name}...`);

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'MayaSite Research Bot (academic use)' },
    });
    if (!resp.ok) {
      console.log(`    HTTP ${resp.status}`);
      return [];
    }

    const html = await resp.text();
    const $ = cheerio.load(html);

    const images: CmhiImage[] = [];
    const seen = new Set<string>();

    $('img').each((_, el) => {
      let src = $(el).attr('src') || '';
      if (!src.includes('peabody/files/')) return;
      if (src.includes('logo') || src.includes('banner')) return;

      // Make absolute
      if (src.startsWith('/')) src = BASE_URL + src;

      // Get the original (non-styled) URL if possible
      // Styled URLs have /styles/hwp_XXX/public/ in them
      const originalMatch = src.match(/\/public\/(.+)$/);
      if (originalMatch) {
        src = `${BASE_URL}/sites/g/files/omnuum4921/files/${originalMatch[1]}`;
      }

      const filename = src.split('/').pop() || '';
      if (seen.has(filename)) return;
      seen.add(filename);

      const { type, monumentType, monumentNum } = categorizeImage(filename);

      images.push({
        site_name: site.name,
        site_code: site.code,
        image_url: src,
        filename,
        type,
        monument_type: monumentType,
        monument_number: monumentNum,
      });
    });

    console.log(`    Found ${images.length} images (${images.filter(i => i.type === 'drawing').length} drawings)`);
    return images;
  } catch (e) {
    console.log(`    Error: ${e}`);
    return [];
  }
}

async function main() {
  console.log('Scraping Harvard CMHI site pages...\n');

  const allImages: CmhiImage[] = [];

  for (const site of CMHI_SITES) {
    const images = await scrapeSite(site);
    allImages.push(...images);
    // Small delay between sites
    await new Promise(r => setTimeout(r, 500));
  }

  const outputPath = path.join(__dirname, '..', 'data', 'cmhi-images.json');
  fs.writeFileSync(outputPath, JSON.stringify(allImages, null, 2));

  console.log(`\nTotal: ${allImages.length} images from ${CMHI_SITES.length} sites`);
  console.log(`  Drawings: ${allImages.filter(i => i.type === 'drawing').length}`);
  console.log(`  Photos: ${allImages.filter(i => i.type === 'photo').length}`);
  console.log(`  Maps: ${allImages.filter(i => i.type === 'map').length}`);
  console.log(`  Other: ${allImages.filter(i => i.type === 'other').length}`);
  console.log(`\nSaved to ${outputPath}`);
}

main().catch(console.error);
