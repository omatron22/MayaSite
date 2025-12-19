import { db } from '../src/lib/db';
import { readFileSync } from 'fs';
import { uploadToR2 } from '../src/lib/r2';
import { join } from 'path';

async function main() {
  console.log('🔄 Re-importing variant instances...\n');
  
  const splits = ['train', 'valid', 'test'];
  let imported = 0;
  
  for (const split of splits) {
    const annotationsPath = `data/maya-glyphs-yax-w4l6k-6-coco/${split}/_annotations.coco.json`;
    const data = JSON.parse(readFileSync(annotationsPath, 'utf-8'));
    
    console.log(`📂 Processing ${split} split...`);
    
    // Load ALL catalog mappings (including variants)
    const catalogResult = await db.execute('SELECT id, mhd_code FROM catalog_signs');
    const catalog = new Map(
      catalogResult.rows.map((r: any) => [r.mhd_code.toLowerCase(), r.id])
    );
    
    for (const ann of data.annotations) {
      const category = data.categories.find((c: any) => c.id === ann.category_id);
      if (!category) continue;
      
      const code = category.name.trim();
      const catalogId = catalog.get(code.toLowerCase());
      
      if (!catalogId) continue; // Still couldn't match
      
      // Check if already imported
      const image = data.images.find((i: any) => i.id === ann.image_id);
      const existing = await db.execute({
        sql: `SELECT id FROM roboflow_instances WHERE catalog_sign_id = ? AND image_url LIKE ?`,
        args: [catalogId, `%${image.file_name}%`]
      });
      
      if (existing.rows.length > 0) continue;
      
      // Upload image to R2
      const localPath = join('data/maya-glyphs-yax-w4l6k-6-coco', split, image.file_name);
      const r2Key = `roboflow/${split}/${image.file_name}`;
      const imageUrl = await uploadToR2(localPath, r2Key);
      
      // Insert instance
      await db.execute({
        sql: `
          INSERT INTO roboflow_instances 
          (catalog_sign_id, image_url, bbox_x, bbox_y, bbox_width, bbox_height, segmentation_mask, dataset_split)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          catalogId,
          imageUrl,
          ann.bbox[0],
          ann.bbox[1],
          ann.bbox[2],
          ann.bbox[3],
          JSON.stringify(ann.segmentation),
          split
        ]
      });
      
      imported++;
      if (imported % 50 === 0) {
        console.log(`   ✓ Imported ${imported} variant instances...`);
      }
    }
  }
  
  console.log(`\n✅ Imported ${imported} additional variant instances!`);
  console.log('\n📊 Final stats:');
  
  const stats = await db.execute(`
    SELECT COUNT(*) as total FROM roboflow_instances
  `);
  
  console.log(`   Total instances: ${stats.rows[0].total}`);
}

main().catch(console.error);
