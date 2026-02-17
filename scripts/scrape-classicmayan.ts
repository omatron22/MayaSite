// scripts/scrape-classicmayan.ts
// Downloads and transforms the ClassicMayan.org (Bonn/TWKM) sign catalog data.
// The catalog is served as a single JSON file at /portal/sc/client/data/json/data.en.json
// License: CC BY 4.0
// Run with: npx tsx scripts/scrape-classicmayan.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_URL = 'https://classicmayan.org/portal/sc/client/data/json/data.en.json';
const IMAGE_BASE = 'https://classicmayan.org/portal/sc/client/data/images/graphs/';

interface RawData {
  artefacts: { id: string; label: string; date: { start: number; end: number }; places: string[] }[];
  catalogs: { id: string; name: string }[];
  concordances: { id: string; catId: string; catNumber: string; graphNo: string; comment: string | null }[];
  decipherments: { id: string; signNo: number; type: string; value: string; confLevelValue: number; confCriteria: string[] }[];
  graphs: {
    graphNo: string; signNo: number; variant: string;
    imgUrl: string; occurrence: number; nicknames: { name: string }[];
    translation: string | null; concordances: string[];
    iconography: string[];
  }[];
  iconography: { id: string; parentId: string; label: string }[];
  signs: { signNo: number; translation: string | null; bibliography: { bibId: string; pages: string }[]; comments: string[]; descriptions: string[] }[];
  places: { id: string; label: string; lat: number; long: number }[];
}

// Output format: one entry per sign (grouping all graph variants)
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
    type: string;     // 'logogram' | 'phonogram'
    value: string;    // e.g., 'NAAH', 'u', 'yi'
    confidence: number; // 1-8 scale
    criteria: string[];
  }[];
  thompson_codes: string[];     // e.g., ['T1', 'T3', 'T11']
  concordances: {               // All catalog cross-references
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
  console.log('Downloading ClassicMayan.org sign catalog data...\n');

  // Download data
  const resp = await fetch(DATA_URL, {
    headers: { 'User-Agent': 'MayaSite Research Bot (academic use)' },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  const raw: RawData = await resp.json();

  console.log(`Raw data loaded:`);
  console.log(`  Signs: ${raw.signs.length}`);
  console.log(`  Graphs: ${raw.graphs.length}`);
  console.log(`  Decipherments: ${raw.decipherments.length}`);
  console.log(`  Concordances: ${raw.concordances.length}`);
  console.log(`  Catalogs: ${raw.catalogs.length}`);

  // Save raw data for reference
  const rawPath = path.join(__dirname, '..', 'data', 'classicmayan-raw.json');
  fs.writeFileSync(rawPath, JSON.stringify(raw, null, 2));
  console.log(`\nRaw data saved to ${rawPath} (${(fs.statSync(rawPath).size / 1024 / 1024).toFixed(1)}MB)`);

  // Build lookup maps
  const catalogMap = new Map(raw.catalogs.map(c => [c.id, c.name]));
  const iconMap = new Map(raw.iconography.map(i => [i.id, i.label]));

  // Group graphs by sign number
  const graphsBySign = new Map<number, RawData['graphs']>();
  for (const g of raw.graphs) {
    if (!graphsBySign.has(g.signNo)) graphsBySign.set(g.signNo, []);
    graphsBySign.get(g.signNo)!.push(g);
  }

  // Group decipherments by sign number
  const decBySign = new Map<number, RawData['decipherments']>();
  for (const d of raw.decipherments) {
    if (!decBySign.has(d.signNo)) decBySign.set(d.signNo, []);
    decBySign.get(d.signNo)!.push(d);
  }

  // Build concordance lookup by graphNo
  const concordancesByGraph = new Map<string, RawData['concordances']>();
  for (const c of raw.concordances) {
    if (!concordancesByGraph.has(c.graphNo)) concordancesByGraph.set(c.graphNo, []);
    concordancesByGraph.get(c.graphNo)!.push(c);
  }

  // Transform signs
  const signs: BonnSign[] = [];

  for (const s of raw.signs) {
    const graphs = graphsBySign.get(s.signNo) || [];
    const decipherments = decBySign.get(s.signNo) || [];

    // Collect Thompson codes and all concordances across all graphs
    const thompsonSet = new Set<string>();
    const allConcordances: BonnSign['concordances'] = [];

    for (const g of graphs) {
      const concs = concordancesByGraph.get(g.graphNo) || [];
      for (const c of concs) {
        const catName = catalogMap.get(c.catId) || 'Unknown';
        allConcordances.push({
          catalog_name: catName,
          catalog_id: c.catId,
          number: c.catNumber,
          graph_code: c.graphNo,
          comment: c.comment || '',
        });

        if (c.catId === '1') { // Thompson (1962)
          thompsonSet.add('T' + c.catNumber);
        }
      }
    }

    signs.push({
      sign_number: s.signNo,
      translation: s.translation,
      graphs: graphs.map(g => ({
        graph_code: g.graphNo,
        variant: g.variant,
        image_url: IMAGE_BASE + g.imgUrl + '.jpg',
        thumb_url: IMAGE_BASE + g.imgUrl + '_thumb.jpg',
        occurrence_count: g.occurrence,
        nicknames: g.nicknames.map(n => n.name),
      })),
      decipherments: decipherments.map(d => ({
        type: d.type,
        value: d.value,
        confidence: d.confLevelValue,
        criteria: d.confCriteria,
      })),
      thompson_codes: [...thompsonSet].sort(),
      concordances: allConcordances,
      comments: s.comments,
      descriptions: s.descriptions,
    });
  }

  // Sort by sign number
  signs.sort((a, b) => a.sign_number - b.sign_number);

  // Save transformed data
  const outputPath = path.join(__dirname, '..', 'data', 'classicmayan-signs.json');
  fs.writeFileSync(outputPath, JSON.stringify(signs, null, 2));

  // Print summary
  const withThompson = signs.filter(s => s.thompson_codes.length > 0);
  const withDecipherments = signs.filter(s => s.decipherments.length > 0);
  const withTranslation = signs.filter(s => s.translation);
  const totalGraphs = signs.reduce((sum, s) => sum + s.graphs.length, 0);
  const totalConcordances = signs.reduce((sum, s) => sum + s.concordances.length, 0);

  console.log(`\n=== Output Summary ===`);
  console.log(`Total signs: ${signs.length}`);
  console.log(`Total graph variants: ${totalGraphs}`);
  console.log(`Total concordances: ${totalConcordances}`);
  console.log(`Signs with Thompson codes: ${withThompson.length} (${Math.round(withThompson.length / signs.length * 100)}%)`);
  console.log(`Signs with decipherments: ${withDecipherments.length} (${Math.round(withDecipherments.length / signs.length * 100)}%)`);
  console.log(`Signs with translations: ${withTranslation.length} (${Math.round(withTranslation.length / signs.length * 100)}%)`);

  // Confidence level distribution
  console.log(`\nDecipherment confidence levels:`);
  const confDist: Record<number, number> = {};
  for (const s of signs) {
    for (const d of s.decipherments) {
      confDist[d.confidence] = (confDist[d.confidence] || 0) + 1;
    }
  }
  Object.entries(confDist)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([level, count]) => console.log(`  Level ${level}: ${count}`));

  // Concordance coverage by catalog
  console.log(`\nConcordance entries by catalog:`);
  const catCounts: Record<string, number> = {};
  for (const s of signs) {
    for (const c of s.concordances) {
      catCounts[c.catalog_name] = (catCounts[c.catalog_name] || 0) + 1;
    }
  }
  Object.entries(catCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([name, count]) => console.log(`  ${name}: ${count}`));

  console.log(`\nSaved to ${outputPath}`);
}

main().catch(console.error);
