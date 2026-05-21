// scripts/import-mhd-blocks.ts
// Imports MHD block data with correct image URL extraction and site mapping.
// Run with: npx tsx scripts/import-mhd-blocks.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inline site mapping (from src/lib/sites.ts) so import script is self-contained
const ARTIFACT_TO_SITE: Record<string, { name: string; region: string }> = {};

const SITE_DEFS: Record<string, { codes: string[]; region: string }> = {
  'Calakmul': { codes: ['COLK','COLM','COLC','COLL','COLS','COLP','COLH','COLDO','COLLC','COLFRM','COLMPV','COLMS','COLCNCP','CLK','CLKS'], region: 'Central' },
  'Madrid Codex': { codes: ['MAD'], region: 'North' },
  'Dresden Codex': { codes: ['DRE'], region: 'North' },
  'Paris Codex': { codes: ['PAR'], region: 'North' },
  'Copan': { codes: ['CPN','CPNS','CPNA','CPNT','CPNHSB','CPNHSA'], region: 'East' },
  'Naranjo': { codes: ['NAR','NARS','NARA'], region: 'Central' },
  'Piedras Negras': { codes: ['PNG','PNGS','PNGP','PNGA'], region: 'Usumacinta' },
  'Tonina': { codes: ['TNAM'], region: 'Central' },
  'Yaxchilan': { codes: ['YAX','YAXL','YAXS','YAXHS'], region: 'Usumacinta' },
  'Palenque': { codes: ['PAL','PALT','PALTI','PALPT','PALTC','PALTFC','PALTS','PALTCI','PALKTT'], region: 'Usumacinta' },
  'Tikal': { codes: ['TIK','TIKS','TIKT','TIKK','TIKMT','TIKTIP'], region: 'Central' },
  'Caracol': { codes: ['CRC','CRCS','CRCA','CRCE','CRCHS'], region: 'East' },
  'Quirigua': { codes: ['QRG','QRGS','QRGA','QRGZP','QRGZG'], region: 'East' },
  'Coba': { codes: ['COB','COBS'], region: 'North' },
  'Dos Pilas': { codes: ['DPL','DPLS','DPLHS','DPLP'], region: 'Central' },
  'Pusila': { codes: ['PUS','PUSS'], region: 'East' },
  'El Peru': { codes: ['PRU','PRUS'], region: 'Central' },
  'Tortuguero': { codes: ['TRT','TRTM'], region: 'Usumacinta' },
  'La Corona': { codes: ['CRN','CRNP','CRNHS','CRNA','CRNHSA'], region: 'Central' },
  'El Naranjo': { codes: ['NTN','NTND'], region: 'Central' },
  'Chinkultic': { codes: ['CHN','CHNT','CHNC','CHNS','CHNLML'], region: 'South' },
  'Moral-Reforma': { codes: ['MRL','MRLS'], region: 'Usumacinta' },
  'Aguateca': { codes: ['AGT','AGTS'], region: 'Central' },
  'Altar de Sacrificios': { codes: ['ALS','ALSS'], region: 'Usumacinta' },
  'Bonampak': { codes: ['BPK','BPKM','BPKSS','BKPKOKV'], region: 'Usumacinta' },
  'Uaxactun': { codes: ['UAX','UAXS','UAXB'], region: 'Central' },
  'Machaquila': { codes: ['MQL','MQLS'], region: 'Central' },
  'Xultun': { codes: ['XUL','XULS'], region: 'Central' },
  'Itzimte': { codes: ['ITN','ITNS','ITSS'], region: 'Central' },
  'Seibal': { codes: ['SBL','SBLS','SBLT'], region: 'Central' },
  'Ek Balam': { codes: ['EKB','EKBM'], region: 'North' },
  'Campeche': { codes: ['CML','CMLU'], region: 'Central' },
  'Oxpemul': { codes: ['OXP','OXPS'], region: 'Central' },
  'Edzna': { codes: ['EDZ','EDZS'], region: 'North' },
  'Uxmal': { codes: ['UXM','UXMM'], region: 'North' },
  'Uxul': { codes: ['UXL','UXLS'], region: 'Central' },
  'Nimli Punit': { codes: ['NMP','NMPS'], region: 'East' },
  'Ixkun': { codes: ['IXK','IXKS'], region: 'East' },
  'Nakum': { codes: ['NCT','NCTS'], region: 'Central' },
  'Sacul': { codes: ['SCU','SCUS'], region: 'Central' },
  'Dzibanche': { codes: ['DCB','DCBS'], region: 'Central' },
  'Polol': { codes: ['PLM','PLMHS'], region: 'Central' },
  'Tamarindito': { codes: ['TAM','TAMHS'], region: 'Central' },
  'Yula': { codes: ['YUL','YULYL'], region: 'Central' },
};

for (const [siteName, { codes, region }] of Object.entries(SITE_DEFS)) {
  for (const code of codes) {
    ARTIFACT_TO_SITE[code] = { name: siteName, region };
  }
}

function lookupSite(artifactCode: string): { name: string; region: string } | null {
  if (ARTIFACT_TO_SITE[artifactCode]) return ARTIFACT_TO_SITE[artifactCode];
  // Try removing common suffixes
  for (const base of [
    artifactCode.replace(/S$/, ''),
    artifactCode.replace(/T$/, ''),
    artifactCode.replace(/HS.*$/, ''),
    artifactCode.replace(/[A-Z]$/, ''),
  ]) {
    if (ARTIFACT_TO_SITE[base]) return ARTIFACT_TO_SITE[base];
  }
  return null;
}

interface ImageObj {
  OrgPubLink?: string;
  ThumbPubLink?: string;
}

function extractImageUrl(img: unknown): string | null {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (typeof img === 'object') {
    const obj = img as ImageObj;
    return obj.OrgPubLink || obj.ThumbPubLink || null;
  }
  return null;
}

type BlockRow = {
  objabbr: string;
  objstralmpg: string;
  blsort: number;
  bltag: string;
  objorienfr: string;
  blcoord: string;
  bllogosyll: string;
  blhyphen: string;
  blmaya1: string;
  blmaya2: string;
  blengl: string;
  blgraphcodes: string;
  blevcal: string;
  blevlc: string;
  blev260: string;
  blev365: string;
  pncode: string;
  blnotes: string;
  blsem: string;
  blsurfpgfr: string;
  imgfr: string | null;
  blimage1: unknown;
  blimage2: unknown;
  blimagenotes: string | null;
  objmat: string;
  objtec: string;
  objtype: string;
  objdescr: string;
};

async function main() {
  console.log('Starting Blocks import...\n');

  const filePath = path.join(__dirname, '..', 'data', 'mhd-blocks-all.json');
  console.log(`Reading ${filePath}...`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const rows: BlockRow[] = JSON.parse(raw);
  console.log(`Loaded ${rows.length.toLocaleString()} blocks\n`);

  console.log('Checking existing blocks...');
  const existing = await db.execute('SELECT mhd_block_id FROM blocks');
  const existingIds = new Set(existing.rows.map(r => String(r.mhd_block_id)));
  const newRows = rows.filter(r => {
    const blockId = `${r.objabbr || 'UNK'}-${r.blsort}`;
    return !existingIds.has(blockId);
  });
  console.log(`  ${existingIds.size.toLocaleString()} already exist, ${newRows.length.toLocaleString()} to create\n`);

  if (newRows.length === 0) {
    console.log('All blocks already imported!\n');
    return;
  }

  let siteMatched = 0;
  let siteUnmatched = 0;

  console.log('Inserting blocks...');
  const startTime = Date.now();
  let processed = 0;
  const inserts = [];

  for (const row of newRows) {
    const artifactCode = row.objabbr || 'UNKNOWN';
    const blockId = `${artifactCode}-${row.blsort}`;
    const site = lookupSite(artifactCode);

    if (site) siteMatched++;
    else siteUnmatched++;

    inserts.push({
      sql: `
        INSERT INTO blocks (
          mhd_block_id, artifact_code, surface_page, orientation_frame, coordinate,
          transcription_logosyll, transcription_hyphen, transcription_1, transcription_2, block_english,
          block_graphcodes, event_calendar, event_long_count, event_260_day, event_365_day,
          region, site_name,
          person_code, scribe, material, technique, artifact_type, object_description,
          semantic_context, notes,
          block_image1_url, block_image2_url, image_notes, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        blockId,
        artifactCode,
        row.objstralmpg || null,
        row.objorienfr || null,
        row.blcoord || null,
        row.bllogosyll && row.bllogosyll !== '_' ? row.bllogosyll : null,
        row.blhyphen && row.blhyphen !== '_' ? row.blhyphen : null,
        row.blmaya1 && row.blmaya1 !== '_' ? row.blmaya1 : null,
        row.blmaya2 && row.blmaya2 !== '_' ? row.blmaya2 : null,
        row.blengl && row.blengl !== '_' ? row.blengl : null,
        row.blgraphcodes || null,
        row.blevcal || null,
        row.blevlc || null,
        row.blev260 || null,
        row.blev365 || null,
        site?.region || null,
        site?.name || null,
        row.pncode || null,
        null,
        row.objmat || null,
        row.objtec || null,
        row.objtype || null,
        row.objdescr || null,
        row.blsem || null,
        row.blnotes || null,
        extractImageUrl(row.blimage1),
        extractImageUrl(row.blimage2),
        row.blimagenotes || null,
        row.blsort
      ]
    });

    if (inserts.length >= 500) {
      await db.batch(inserts, 'write');
      processed += inserts.length;
      inserts.length = 0;

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = elapsed > 0 ? Math.round(processed / elapsed) : processed;
      console.log(`  Inserted ${processed.toLocaleString()}/${newRows.length.toLocaleString()} (${Math.round(processed / newRows.length * 100)}%) | ${rate}/s`);
    }
  }

  if (inserts.length > 0) {
    await db.batch(inserts, 'write');
    processed += inserts.length;
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nInserted ${processed.toLocaleString()} blocks in ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);
  console.log(`Site mapping: ${siteMatched.toLocaleString()} matched, ${siteUnmatched.toLocaleString()} unmapped (${Math.round(siteMatched / (siteMatched + siteUnmatched) * 100)}% coverage)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
