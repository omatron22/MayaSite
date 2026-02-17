// scripts/scrape-kerr.ts
// Scrapes Kerr Maya Vase Database for vessel records.
// Run with: npx tsx scripts/scrape-kerr.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface KerrVessel {
  k_number: string;
  k_num: number;
  description: string | null;
  image_url: string;
  still_url: string;
}

const BASE_URL = 'http://research.mayavase.com';
const CONCURRENCY = 5;
const MAX_K = 9200;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchVessel(kNum: number): Promise<KerrVessel | null> {
  const padded = String(kNum).padStart(4, '0');
  const url = `${BASE_URL}/kerrmaya_hires.php?vase=${kNum}`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'MayaSite Research Bot (academic use)' },
    });
    if (!resp.ok) return null;

    const html = await resp.text();
    const $ = cheerio.load(html);

    // Check if this vessel has an image (the key indicator of a real record)
    const img = $('img').first().attr('src');
    if (!img || !img.includes('mayavase')) return null;

    // Extract description from comments section
    const body = $('body').text();
    let description: string | null = null;

    const commentsIdx = body.indexOf('Comments:');
    if (commentsIdx !== -1) {
      let text = body.substring(commentsIdx + 9).trim();
      // Clean up: remove "CLICK for the shape" and other navigation text
      text = text.replace(/CLICK\s+for\s+the\s+shape\s+of\s+the\s+vessel/gi, '').trim();
      text = text.replace(/\s+/g, ' ').trim();
      if (text.length > 3) {
        description = text.substring(0, 1000);
      }
    }

    return {
      k_number: `K${kNum}`,
      k_num: kNum,
      description,
      image_url: `${BASE_URL}/uploads/mayavase/hires/${padded}.jpg`,
      still_url: `http://www.mayavase.com/still/${padded}still.jpg`,
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log('Scraping Kerr Maya Vase Database...\n');

  const outputPath = path.join(__dirname, '..', 'data', 'kerr-vessels.json');
  const vessels: KerrVessel[] = [];

  // Resume from partial results
  let startFrom = 1;
  if (fs.existsSync(outputPath)) {
    const existing: KerrVessel[] = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    vessels.push(...existing);
    startFrom = Math.max(...existing.map(v => v.k_num)) + 1;
    console.log(`Resuming from K${startFrom} (${vessels.length} existing records)\n`);
  }

  const startTime = Date.now();
  let checked = 0;
  let consecutive404 = 0;

  // Process in concurrent batches
  for (let batch = startFrom; batch <= MAX_K; batch += CONCURRENCY) {
    const promises = [];
    for (let i = 0; i < CONCURRENCY && batch + i <= MAX_K; i++) {
      promises.push(fetchVessel(batch + i));
    }

    const results = await Promise.all(promises);
    for (const result of results) {
      checked++;
      if (result) {
        vessels.push(result);
        consecutive404 = 0;
      } else {
        consecutive404++;
      }
    }

    // Stop if we've hit a long gap (300+ misses after K5000)
    if (batch > 5000 && consecutive404 > 300) {
      console.log(`300 consecutive misses after K${batch}, stopping.`);
      break;
    }

    // Progress and periodic save
    if (checked % 100 === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = elapsed > 0 ? Math.round(checked / elapsed) : checked;
      console.log(`  Checked K${batch}/${MAX_K} | Found ${vessels.length} vessels | ${rate}/s`);
    }

    if (checked % 500 === 0) {
      fs.writeFileSync(outputPath, JSON.stringify(vessels, null, 2));
    }

    // Small delay between batches to be polite
    await sleep(100);
  }

  // Final save
  fs.writeFileSync(outputPath, JSON.stringify(vessels, null, 2));

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nScraped ${vessels.length} Kerr vessels in ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);
  console.log(`Saved to ${outputPath}`);

  const withDesc = vessels.filter(v => v.description).length;
  console.log(`With description: ${withDesc}/${vessels.length} (${Math.round(withDesc / vessels.length * 100)}%)`);
}

main().catch(console.error);
