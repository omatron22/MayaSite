// scripts/migrate-from-omatron22.ts
// Copies missing signs, blocks, and roboflow instances from omatron22 → omatron.
// Run with: npx tsx scripts/migrate-from-omatron22.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';

const omatron = createClient({
  url: process.env.TURSO_DATABASE_URL!.replace('libsql://', 'https://'),
  authToken: process.env.TURSO_AUTH_TOKEN!,
  intMode: 'number',
});

const omatron22 = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!.replace('libsql://', 'https://'),
  authToken: process.env.VITE_TURSO_AUTH_TOKEN!,
  intMode: 'number',
});

async function safeCount(db: any, sql: string): Promise<number> {
  const r = await db.execute(sql);
  return Number(r.rows[0].n);
}

async function main() {
  console.log('=== Migration: omatron22 → omatron ===\n');

  // Phase 1: Add missing schema columns to omatron
  console.log('Phase 1: Adding missing columns to omatron schema...');
  const alterStatements = [
    'ALTER TABLE catalog_signs ADD COLUMN variant_code TEXT',
    'ALTER TABLE catalog_signs ADD COLUMN phonetic_value TEXT',
    'ALTER TABLE catalog_signs ADD COLUMN base_thompson_number INTEGER',
    'ALTER TABLE catalog_signs ADD COLUMN former_mhd_code TEXT',
    'ALTER TABLE blocks ADD COLUMN image_url TEXT',
    'ALTER TABLE blocks ADD COLUMN site_code TEXT',
    'ALTER TABLE blocks ADD COLUMN latitude REAL',
    'ALTER TABLE blocks ADD COLUMN longitude REAL',
  ];
  for (const sql of alterStatements) {
    try {
      await omatron.execute(sql);
      console.log(`  OK: ${sql}`);
    } catch (e: any) {
      if (e.message?.includes('duplicate column')) {
        console.log(`  SKIP (already exists): ${sql}`);
      } else {
        console.log(`  WARN: ${e.message}`);
      }
    }
  }
  console.log();

  // Phase 2: Migrate catalog signs
  console.log('Phase 2: Migrating catalog signs...');
  const existingSigns = await omatron.execute('SELECT mhd_code FROM catalog_signs');
  const existingSignCodes = new Set(existingSigns.rows.map(r => String(r.mhd_code)));
  console.log(`  omatron has ${existingSignCodes.size} signs`);

  const allSigns22 = await omatron22.execute('SELECT * FROM catalog_signs');
  const missingSigns = allSigns22.rows.filter(r => !existingSignCodes.has(String(r.mhd_code)));
  console.log(`  omatron22 has ${allSigns22.rows.length} signs, ${missingSigns.length} missing from omatron`);

  if (missingSigns.length > 0) {
    const inserts = [];
    for (const s of missingSigns) {
      inserts.push({
        sql: `INSERT INTO catalog_signs (
          mhd_code, mhd_code_sub, mhd_code_2003, graphcode,
          thompson_code, thompson_variant, zender_code,
          kettunen_code, kettunen_1999, gronemeyer_code,
          logographic_value, logographic_cvc, syllabic_value,
          english_translation, word_class, calendrical_name,
          picture_description, volume, technique, distribution,
          primary_image_url, notes,
          variant_code, phonetic_value, base_thompson_number, former_mhd_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          s.mhd_code, s.mhd_code_sub, s.mhd_code_2003, s.graphcode,
          s.thompson_code, s.thompson_variant, s.zender_code,
          s.kettunen_code, s.kettunen_1999, s.gronemeyer_code,
          s.logographic_value, s.logographic_cvc, s.syllabic_value,
          s.english_translation, s.word_class, s.calendrical_name,
          s.picture_description, s.volume, s.technique, s.distribution,
          s.primary_image_url, s.notes,
          s.variant_code || null, s.phonetic_value || null,
          s.base_thompson_number || null, s.former_mhd_code || null,
        ],
      });
    }
    // Batch in groups of 100
    for (let i = 0; i < inserts.length; i += 100) {
      await omatron.batch(inserts.slice(i, i + 100), 'write');
      console.log(`  Inserted signs: ${Math.min(i + 100, inserts.length)}/${inserts.length}`);
    }
  }

  const newSignCount = await safeCount(omatron, 'SELECT COUNT(*) as n FROM catalog_signs');
  console.log(`  omatron now has ${newSignCount} signs\n`);

  // Phase 3: Migrate blocks (large — need pagination from omatron22)
  console.log('Phase 3: Migrating blocks...');
  const existingBlocks = await omatron.execute('SELECT mhd_block_id FROM blocks');
  const existingBlockIds = new Set(existingBlocks.rows.map(r => String(r.mhd_block_id)));
  console.log(`  omatron has ${existingBlockIds.size} blocks`);

  const PAGE = 5000;
  let offset = 0;
  let totalMigrated = 0;
  let totalScanned = 0;

  while (true) {
    const page = await omatron22.execute({
      sql: `SELECT * FROM blocks ORDER BY id LIMIT ? OFFSET ?`,
      args: [PAGE, offset],
    });

    if (page.rows.length === 0) break;
    totalScanned += page.rows.length;

    const missing = page.rows.filter(r => !existingBlockIds.has(String(r.mhd_block_id)));

    if (missing.length > 0) {
      const inserts = missing.map(b => ({
        sql: `INSERT INTO blocks (
          mhd_block_id, artifact_code, surface_page, orientation_frame, coordinate,
          transcription_logosyll, transcription_hyphen, transcription_1, transcription_2, block_english,
          block_graphcodes, event_calendar, event_long_count, event_260_day, event_365_day,
          person_code, notes, semantic_context, sort_order,
          block_image1_url, block_image2_url, site_name, region,
          image_url, site_code, latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          b.mhd_block_id, b.artifact_code, b.surface_page, b.orientation_frame, b.coordinate,
          b.transcription_logosyll, b.transcription_hyphen, b.transcription_1, b.transcription_2, b.block_english,
          b.block_graphcodes, b.event_calendar, b.event_long_count, b.event_260_day, b.event_365_day,
          b.person_code, b.notes, b.semantic_context, b.sort_order,
          b.block_image1_url, b.block_image2_url, b.site_name, b.region,
          b.image_url || null, b.site_code || null, b.latitude || null, b.longitude || null,
        ],
      }));

      // Batch in groups of 100
      for (let i = 0; i < inserts.length; i += 100) {
        await omatron.batch(inserts.slice(i, i + 100), 'write');
      }
      totalMigrated += missing.length;
    }

    console.log(`  Scanned ${totalScanned} blocks from omatron22, migrated ${totalMigrated} so far`);
    offset += PAGE;
  }

  const newBlockCount = await safeCount(omatron, 'SELECT COUNT(*) as n FROM blocks');
  console.log(`  omatron now has ${newBlockCount} blocks\n`);

  // Phase 4: Migrate roboflow instances
  console.log('Phase 4: Migrating roboflow instances...');
  const existingRobo = await omatron.execute('SELECT image_url, bbox_x, bbox_y FROM roboflow_instances');
  const existingRoboKeys = new Set(existingRobo.rows.map(r => `${r.image_url}|${r.bbox_x}|${r.bbox_y}`));
  console.log(`  omatron has ${existingRoboKeys.size} roboflow instances`);

  offset = 0;
  let roboMigrated = 0;
  while (true) {
    const page = await omatron22.execute({
      sql: 'SELECT * FROM roboflow_instances ORDER BY id LIMIT ? OFFSET ?',
      args: [PAGE, offset],
    });
    if (page.rows.length === 0) break;

    const missing = page.rows.filter(r => !existingRoboKeys.has(`${r.image_url}|${r.bbox_x}|${r.bbox_y}`));

    if (missing.length > 0) {
      // Need to map catalog_sign_id from omatron22 to omatron
      // First, build a mapping of omatron22 sign id → mhd_code
      const inserts = [];
      for (const r of missing) {
        // For roboflow, we need the catalog_sign_id in omatron's ID space
        // We'll need to resolve this by looking up the sign
        inserts.push({
          sql: `INSERT INTO roboflow_instances (
            catalog_sign_id, image_url, bbox_x, bbox_y, bbox_width, bbox_height,
            segmentation_mask, confidence, dataset_split
          ) VALUES (
            (SELECT cs.id FROM catalog_signs cs
             JOIN (SELECT mhd_code FROM catalog_signs WHERE id = ? LIMIT 0) dummy ON 1=0),
            ?, ?, ?, ?, ?, ?, ?, ?
          )`,
          args: [
            r.catalog_sign_id,
            r.image_url, r.bbox_x, r.bbox_y, r.bbox_width, r.bbox_height,
            r.segmentation_mask, r.confidence, r.dataset_split,
          ],
        });
      }

      // Actually, the catalog_sign_id mapping is more complex.
      // Let me handle roboflow separately with a sign-id map.
      // For now, insert with NULL catalog_sign_id and fix after.
      const simpleInserts = missing.map(r => ({
        sql: `INSERT INTO roboflow_instances (
          image_url, bbox_x, bbox_y, bbox_width, bbox_height,
          segmentation_mask, confidence, dataset_split
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          r.image_url, r.bbox_x, r.bbox_y, r.bbox_width, r.bbox_height,
          r.segmentation_mask, r.confidence, r.dataset_split,
        ],
      }));

      for (let i = 0; i < simpleInserts.length; i += 100) {
        await omatron.batch(simpleInserts.slice(i, i + 100), 'write');
      }
      roboMigrated += missing.length;
    }

    console.log(`  Scanned roboflow, migrated ${roboMigrated} so far`);
    offset += PAGE;
  }

  const newRoboCount = await safeCount(omatron, 'SELECT COUNT(*) as n FROM roboflow_instances');
  console.log(`  omatron now has ${newRoboCount} roboflow instances\n`);

  // Phase 5: Fix roboflow catalog_sign_id mapping
  // Build omatron22 sign id → mhd_code map, then resolve to omatron sign id
  console.log('Phase 5: Fixing roboflow catalog_sign_id mapping...');
  const sign22Map = new Map<number, string>();
  const signs22 = await omatron22.execute('SELECT id, mhd_code FROM catalog_signs');
  for (const r of signs22.rows) {
    sign22Map.set(Number(r.id), String(r.mhd_code));
  }

  const omatronSignMap = new Map<string, number>();
  const omatronSigns = await omatron.execute('SELECT id, mhd_code FROM catalog_signs');
  for (const r of omatronSigns.rows) {
    omatronSignMap.set(String(r.mhd_code), Number(r.id));
  }

  // Get all omatron22 roboflow with their sign IDs
  const robo22All = await omatron22.execute('SELECT id, catalog_sign_id, image_url, bbox_x, bbox_y FROM roboflow_instances');
  const robo22Map = new Map<string, number>(); // key → omatron catalog_sign_id
  for (const r of robo22All.rows) {
    if (r.catalog_sign_id == null) continue;
    const mhdCode = sign22Map.get(Number(r.catalog_sign_id));
    if (!mhdCode) continue;
    const omatronId = omatronSignMap.get(mhdCode);
    if (!omatronId) continue;
    robo22Map.set(`${r.image_url}|${r.bbox_x}|${r.bbox_y}`, omatronId);
  }

  // Update omatron roboflow instances that have NULL catalog_sign_id
  const nullRobos = await omatron.execute('SELECT id, image_url, bbox_x, bbox_y FROM roboflow_instances WHERE catalog_sign_id IS NULL');
  let fixed = 0;
  const updates = [];
  for (const r of nullRobos.rows) {
    const key = `${r.image_url}|${r.bbox_x}|${r.bbox_y}`;
    const signId = robo22Map.get(key);
    if (signId) {
      updates.push({
        sql: 'UPDATE roboflow_instances SET catalog_sign_id = ? WHERE id = ?',
        args: [signId, r.id],
      });
    }
  }
  for (let i = 0; i < updates.length; i += 100) {
    await omatron.batch(updates.slice(i, i + 100), 'write');
    fixed += Math.min(100, updates.length - i);
  }
  console.log(`  Fixed ${fixed}/${nullRobos.rows.length} roboflow sign IDs\n`);

  // Final counts
  console.log('=== Final omatron counts ===');
  for (const t of ['catalog_signs', 'blocks', 'graphemes', 'roboflow_instances', 'kerr_vessels', 'cmhi_images']) {
    const n = await safeCount(omatron, `SELECT COUNT(*) as n FROM ${t}`);
    console.log(`  ${t}: ${n.toLocaleString()}`);
  }
  console.log('\nDone! Next steps:');
  console.log('  1. npx tsx scripts/import-mhd-graphemes.ts  (re-import graphemes for new blocks)');
  console.log('  2. npx tsx scripts/import-lmgg-crossref.ts  (enrich new signs)');
  console.log('  3. npx tsx scripts/update-site-mapping.ts   (map sites for new blocks)');
  console.log('  4. npx tsx scripts/import-classicmayan.ts   (Bonn enrichment for new signs)');
}

main().catch(console.error);
