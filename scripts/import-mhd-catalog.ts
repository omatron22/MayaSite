// scripts/import-mhd-catalog.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type CatalogRow = {
  codeid: number;
  newcodesub: string;
  graphcode: string;
  subsort: string;
  code2003: string;
  lpict: {
    OrgPubLink?: string;
  } | null;
  tno: string;
  mtno: string;
  zno: string;
  kno: string;
  gno: string;
  k1999: string;
  picture: string;
  technique: string;
  distribution: string;
  volume: string;
  lexcode: string;
  logographic: string;
  logocvc: string;
  english: string;
  wordclass: string;
  syllabic: string;
  calendrical: string;
  note: string;
};

async function main() {
  console.log('🚀 Starting Catalog import...\n');

  const filePath = path.join(__dirname, '..', 'data', 'mhd-catalog-all.json');
  console.log(`📂 Reading ${filePath}...`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const rows: CatalogRow[] = JSON.parse(raw);
  console.log(`✅ Loaded ${rows.length.toLocaleString()} catalog entries\n`);

  console.log('📋 Checking existing catalog signs...');
  const existing = await db.execute('SELECT mhd_code FROM catalog_signs');
  const existingCodes = new Set(existing.rows.map(r => String(r.mhd_code)));
  const newRows = rows.filter(r => !existingCodes.has(String(r.codeid)));
  console.log(`   ${existingCodes.size.toLocaleString()} already exist, ${newRows.length.toLocaleString()} to create\n`);

  if (newRows.length === 0) {
    console.log('✅ All catalog signs already imported!\n');
    return;
  }

  console.log('📋 Inserting catalog signs...');
  const startTime = Date.now();
  let processed = 0;

  const inserts = [];
  
  for (const row of newRows) {
    // Use codeid as the unique identifier, store newcodesub and graphcode as metadata
    const displayCode = row.newcodesub || row.graphcode || String(row.codeid);
    
    inserts.push({
      sql: `
        INSERT INTO catalog_signs (
          mhd_code, mhd_code_sub, mhd_code_2003,
          thompson_code, thompson_variant, zender_code,
          kettunen_code, kettunen_1999, gronemeyer_code,
          logographic_value, logographic_cvc, syllabic_value,
          english_translation, word_class, calendrical_name,
          picture_description, volume, technique, distribution,
          primary_image_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        String(row.codeid),  // Use codeid as unique mhd_code
        row.newcodesub || null,  // Store display code
        row.code2003 || null,
        row.tno || null,
        row.mtno || null,
        row.zno || null,
        row.kno || null,
        row.k1999 || null,
        row.gno || null,
        row.logographic || null,
        row.logocvc || null,
        row.syllabic || null,
        row.english || null,
        row.wordclass || null,
        row.calendrical || null,
        row.picture || null,
        row.volume || null,
        row.technique || null,
        row.distribution || null,
        row.lpict?.OrgPubLink || null,
        row.note || null
      ]
    });

    if (inserts.length >= 100) {
      await db.batch(inserts, 'write');
      processed += inserts.length;
      inserts.length = 0;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = elapsed > 0 ? Math.round(processed / elapsed) : processed;
      console.log(`   Inserted ${processed.toLocaleString()}/${newRows.length.toLocaleString()} (${Math.round(processed/newRows.length*100)}%) | ${rate}/s`);
    }
  }

  if (inserts.length > 0) {
    await db.batch(inserts, 'write');
    processed += inserts.length;
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ Inserted ${processed.toLocaleString()} catalog signs in ${Math.floor(totalTime/60)}m ${totalTime%60}s\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
