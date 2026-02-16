// scripts/import-roboflow-instances.ts
// Imports Roboflow COCO annotations into the database.
// Run with: npx tsx scripts/import-roboflow-instances.ts
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CocoAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  bbox: [number, number, number, number];
  segmentation: number[][];
  area: number;
  iscrowd: number;
}

interface CocoImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
}

interface CocoCategory {
  id: number;
  name: string;
}

interface CocoDataset {
  images: CocoImage[];
  annotations: CocoAnnotation[];
  categories: CocoCategory[];
}

function normalizeCode(label: string): string[] {
  const variations: string[] = [];
  const withoutSpace = label.split(' ')[0];
  variations.push(withoutSpace);

  const match = withoutSpace.match(/^(\d+)([a-z]{2})$/);
  if (match) {
    variations.push(match[1]);
    variations.push(match[1] + match[2]);
  }

  variations.push(label);
  return [...new Set(variations)];
}

async function main() {
  console.log('\nImporting Roboflow instances...');

  // Set image base URL from env or use a default
  const imageBaseUrl = process.env.R2_PUBLIC_URL || '';

  console.log('Loading catalog signs...');
  const catalogResult = await db.execute('SELECT id, mhd_code FROM catalog_signs');
  const catalogMap = new Map<string, number>();

  for (const row of catalogResult.rows) {
    const code = (row.mhd_code as string).toLowerCase();
    catalogMap.set(code, row.id as number);
  }

  console.log(`Loaded ${catalogMap.size} catalog mappings\n`);

  const dataDir = path.join(__dirname, '..', 'data', 'maya-glyphs-yax-w4l6k-6-coco');
  const splits = ['train', 'valid', 'test'];

  let totalImported = 0;
  let totalSkipped = 0;
  const unmatchedCodes = new Set<string>();

  for (const split of splits) {
    const annotationsPath = path.join(dataDir, split, '_annotations.coco.json');

    if (!fs.existsSync(annotationsPath)) {
      console.log(`${split} split not found, skipping...`);
      continue;
    }

    console.log(`\nProcessing ${split} split...`);
    const coco: CocoDataset = JSON.parse(fs.readFileSync(annotationsPath, 'utf-8'));

    console.log(`  Images: ${coco.images.length}`);
    console.log(`  Annotations: ${coco.annotations.length}`);
    console.log(`  Categories: ${coco.categories.length}`);

    const categoryMap = new Map<number, { catalogId: number; code: string }>();

    for (const category of coco.categories) {
      const variations = normalizeCode(category.name.toLowerCase());

      let catalogId: number | undefined;

      for (const variant of variations) {
        if (catalogMap.has(variant)) {
          catalogId = catalogMap.get(variant);
          break;
        }
      }

      if (catalogId) {
        categoryMap.set(category.id, { catalogId, code: category.name });
      } else {
        unmatchedCodes.add(category.name);
      }
    }

    console.log(`  Matched ${categoryMap.size}/${coco.categories.length} categories\n`);

    const inserts = [];

    for (const annotation of coco.annotations) {
      const image = coco.images.find(img => img.id === annotation.image_id);
      if (!image) continue;

      const categoryInfo = categoryMap.get(annotation.category_id);
      if (!categoryInfo) {
        totalSkipped++;
        continue;
      }

      const imageUrl = imageBaseUrl
        ? `${imageBaseUrl}/roboflow/${split}/${image.file_name}`
        : `roboflow/${split}/${image.file_name}`;

      inserts.push({
        sql: `INSERT INTO roboflow_instances (
          catalog_sign_id, image_url,
          bbox_x, bbox_y, bbox_width, bbox_height,
          segmentation_mask, confidence, dataset_split
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          categoryInfo.catalogId,
          imageUrl,
          annotation.bbox[0],
          annotation.bbox[1],
          annotation.bbox[2],
          annotation.bbox[3],
          JSON.stringify(annotation.segmentation),
          1.0,
          split,
        ],
      });

      if (inserts.length >= 100) {
        await db.batch(inserts, 'write');
        totalImported += inserts.length;
        inserts.length = 0;
        console.log(`  Imported ${totalImported} instances...`);
      }
    }

    if (inserts.length > 0) {
      await db.batch(inserts, 'write');
      totalImported += inserts.length;
    }
  }

  console.log(`\nImported ${totalImported} Roboflow instances`);
  console.log(`Skipped ${totalSkipped} instances`);

  if (unmatchedCodes.size > 0) {
    console.log(`\nUnmatched codes (${unmatchedCodes.size}):`);
    Array.from(unmatchedCodes).slice(0, 20).forEach(code => {
      console.log(`  - ${code}`);
    });
  }
}

main().catch(console.error);
