// scripts/scrape-lmgg.ts
// Scrapes the LMGG concordance tables from mayaglyphs.org and saves as JSON.
// Extracts TWKM ↔ MHD ↔ Thompson ↔ CMGG cross-references.
// Run with: npx tsx scripts/scrape-lmgg.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LmggEntry {
  twkm_code: string | null;
  twkm_pronunciation: string | null;
  twkm_translation: string | null;
  mhd_codes: string[];
  mhd_readings: Record<string, string>;
  thompson_numbers: string[];
  cmgg_values: string[];
  cmgg_translation: string | null;
  source_table: 'twkm' | 'mhd' | 'cmgg';
}

async function scrapeTWKM(): Promise<LmggEntry[]> {
  console.log('Fetching TWKM concordance...');
  const resp = await fetch('https://mayaglyphs.org/concTWKM.html');
  const html = await resp.text();
  const $ = cheerio.load(html);

  const entries: LmggEntry[] = [];

  $('#concTableTWKM > tbody > tr').each((_, tr) => {
    const tds = $(tr).find('> td');
    if (tds.length < 4) return;

    // Column 1: TWKM code and pronunciation
    const twkmCell = $(tds[0]);
    const twkmCode = twkmCell.find('.bonn-info strong').first().text().trim();
    if (!twkmCode) return;

    const pronEl = twkmCell.find('.bonn-info .pron');
    let pronunciation = pronEl.text().trim();
    if (pronunciation === 'no TWKM pron / translation') pronunciation = '';
    const tranEl = twkmCell.find('.bonn-info .tran');
    const translation = tranEl.text().trim() || null;

    // Column 2: MHD codes
    const mhdCell = $(tds[1]);
    const mhdCodes: string[] = [];
    const mhdReadings: Record<string, string> = {};
    mhdCell.find('.mhd-info').each((_, info) => {
      const code = $(info).find('strong .notranslate').text().trim();
      if (code && code !== 'No MHD code found') {
        mhdCodes.push(code);
        const reading = $(info).find('.mhd-read').text().trim();
        if (reading && reading !== 'no MHD pron / translation') {
          mhdReadings[code] = reading;
        }
      }
    });

    // Column 3: Thompson numbers
    const thompCell = $(tds[2]);
    const thompNums: string[] = [];
    thompCell.find('.tcap .notranslate').each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.startsWith('T')) thompNums.push(t);
    });

    // Column 4: CMGG values
    const cmggCell = $(tds[3]);
    const cmggValues: string[] = [];
    cmggCell.find('.cmgg-words .notranslate').each((_, el) => {
      const val = $(el).text().trim();
      if (val) cmggValues.push(val);
    });
    const cmggTran = cmggCell.find('.cmgg-tran').text().trim() || null;

    entries.push({
      twkm_code: twkmCode,
      twkm_pronunciation: pronunciation || null,
      twkm_translation: translation,
      mhd_codes: mhdCodes,
      mhd_readings: mhdReadings,
      thompson_numbers: thompNums,
      cmgg_values: cmggValues,
      cmgg_translation: cmggTran,
      source_table: 'twkm',
    });
  });

  console.log(`  Extracted ${entries.length} TWKM entries`);
  return entries;
}

async function scrapeMHD(): Promise<LmggEntry[]> {
  console.log('Fetching MHD concordance...');
  const resp = await fetch('https://mayaglyphs.org/concMHD.html');
  const html = await resp.text();
  const $ = cheerio.load(html);

  const entries: LmggEntry[] = [];

  // MHD concordance table structure: MHD | TWKM | T-numbers | CMGG
  $('table.outer > tbody > tr').each((_, tr) => {
    const tds = $(tr).find('> td');
    if (tds.length < 4) return;

    // Column 1: MHD codes
    const mhdCell = $(tds[0]);
    const mhdCodes: string[] = [];
    const mhdReadings: Record<string, string> = {};
    mhdCell.find('.mhd-info').each((_, info) => {
      const code = $(info).find('strong .notranslate').text().trim();
      if (code) {
        mhdCodes.push(code);
        const reading = $(info).find('.mhd-read').text().trim();
        if (reading && reading !== 'no MHD pron / translation') {
          mhdReadings[code] = reading;
        }
      }
    });
    if (mhdCodes.length === 0) return;

    // Column 2: TWKM codes
    const twkmCell = $(tds[1]);
    const twkmCode = twkmCell.find('.bonn-info strong').first().text().trim() || null;
    const pronEl = twkmCell.find('.bonn-info .pron');
    let pronunciation = pronEl.text().trim();
    if (pronunciation === 'no TWKM pron / translation') pronunciation = '';

    // Column 3: Thompson numbers
    const thompCell = $(tds[2]);
    const thompNums: string[] = [];
    thompCell.find('.tcap .notranslate').each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.startsWith('T')) thompNums.push(t);
    });

    // Column 4: CMGG
    const cmggCell = $(tds[3]);
    const cmggValues: string[] = [];
    cmggCell.find('.cmgg-words .notranslate').each((_, el) => {
      const val = $(el).text().trim();
      if (val) cmggValues.push(val);
    });
    const cmggTran = cmggCell.find('.cmgg-tran').text().trim() || null;

    entries.push({
      twkm_code: twkmCode,
      twkm_pronunciation: pronunciation || null,
      twkm_translation: null,
      mhd_codes: mhdCodes,
      mhd_readings: mhdReadings,
      thompson_numbers: thompNums,
      cmgg_values: cmggValues,
      cmgg_translation: cmggTran,
      source_table: 'mhd',
    });
  });

  console.log(`  Extracted ${entries.length} MHD entries`);
  return entries;
}

async function scrapeCMGG(): Promise<LmggEntry[]> {
  console.log('Fetching CMGG concordance...');
  const resp = await fetch('https://mayaglyphs.org/concCMGG.html');
  const html = await resp.text();
  const $ = cheerio.load(html);

  const entries: LmggEntry[] = [];

  $('table.outer > tbody > tr').each((_, tr) => {
    const tds = $(tr).find('> td');
    if (tds.length < 4) return;

    // Column 1: CMGG
    const cmggCell = $(tds[0]);
    const cmggValues: string[] = [];
    cmggCell.find('.cmgg-words .notranslate').each((_, el) => {
      const val = $(el).text().trim();
      if (val) cmggValues.push(val);
    });
    if (cmggValues.length === 0) return;
    const cmggTran = cmggCell.find('.cmgg-tran').text().trim() || null;

    // Column 2: TWKM codes
    const twkmCell = $(tds[1]);
    const twkmCode = twkmCell.find('.bonn-info strong').first().text().trim() || null;

    // Column 3: MHD codes
    const mhdCell = $(tds[2]);
    const mhdCodes: string[] = [];
    const mhdReadings: Record<string, string> = {};
    mhdCell.find('.mhd-info').each((_, info) => {
      const code = $(info).find('strong .notranslate').text().trim();
      if (code) {
        mhdCodes.push(code);
        const reading = $(info).find('.mhd-read').text().trim();
        if (reading) mhdReadings[code] = reading;
      }
    });

    // Column 4: Thompson numbers
    const thompCell = $(tds[3]);
    const thompNums: string[] = [];
    thompCell.find('.tcap .notranslate').each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.startsWith('T')) thompNums.push(t);
    });

    entries.push({
      twkm_code: twkmCode,
      twkm_pronunciation: null,
      twkm_translation: null,
      mhd_codes: mhdCodes,
      mhd_readings: mhdReadings,
      thompson_numbers: thompNums,
      cmgg_values: cmggValues,
      cmgg_translation: cmggTran,
      source_table: 'cmgg',
    });
  });

  console.log(`  Extracted ${entries.length} CMGG entries`);
  return entries;
}

async function main() {
  console.log('Scraping LMGG Concordance Tables...\n');

  const [twkm, mhd, cmgg] = await Promise.all([
    scrapeTWKM(),
    scrapeMHD(),
    scrapeCMGG(),
  ]);

  const allEntries = { twkm, mhd, cmgg };
  const outPath = path.join(__dirname, '..', 'data', 'lmgg-concordance.json');
  fs.writeFileSync(outPath, JSON.stringify(allEntries, null, 2));
  console.log(`\nSaved to ${outPath}`);

  // Build a deduplicated cross-reference map: MHD code → { twkm, thompson[], cmgg[] }
  const crossRef = new Map<string, {
    twkm_code: string | null;
    thompson_numbers: Set<string>;
    cmgg_values: Set<string>;
    pronunciation: string | null;
  }>();

  for (const entries of [twkm, mhd, cmgg]) {
    for (const entry of entries) {
      for (const mhdCode of entry.mhd_codes) {
        if (!crossRef.has(mhdCode)) {
          crossRef.set(mhdCode, {
            twkm_code: null,
            thompson_numbers: new Set(),
            cmgg_values: new Set(),
            pronunciation: null,
          });
        }
        const ref = crossRef.get(mhdCode)!;
        if (entry.twkm_code) ref.twkm_code = entry.twkm_code;
        for (const t of entry.thompson_numbers) ref.thompson_numbers.add(t);
        for (const c of entry.cmgg_values) ref.cmgg_values.add(c);
        if (entry.twkm_pronunciation) ref.pronunciation = entry.twkm_pronunciation;
      }
    }
  }

  // Save flattened cross-ref for easy import
  const flatCrossRef = Array.from(crossRef.entries()).map(([code, ref]) => ({
    mhd_code: code,
    twkm_code: ref.twkm_code,
    thompson_numbers: [...ref.thompson_numbers],
    cmgg_values: [...ref.cmgg_values],
    pronunciation: ref.pronunciation,
  }));

  const crossRefPath = path.join(__dirname, '..', 'data', 'lmgg-crossref.json');
  fs.writeFileSync(crossRefPath, JSON.stringify(flatCrossRef, null, 2));

  console.log(`\nCross-reference summary:`);
  console.log(`  Unique MHD codes: ${crossRef.size}`);
  console.log(`  With TWKM mapping: ${flatCrossRef.filter(r => r.twkm_code).length}`);
  console.log(`  With Thompson numbers: ${flatCrossRef.filter(r => r.thompson_numbers.length > 0).length}`);
  console.log(`  With CMGG values: ${flatCrossRef.filter(r => r.cmgg_values.length > 0).length}`);
  console.log(`\nSaved cross-reference to ${crossRefPath}`);
}

main().catch((err) => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
