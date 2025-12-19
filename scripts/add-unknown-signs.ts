import { db } from '../src/lib/db';
import { readFileSync } from 'fs';

async function main() {
  console.log('📝 Creating unknown_signs table...');
  
  // Create table for unknown signs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS unknown_signs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roboflow_code TEXT NOT NULL UNIQUE,
      occurrences INTEGER DEFAULT 1,
      example_image_url TEXT,
      bbox_x REAL,
      bbox_y REAL,
      bbox_width REAL,
      bbox_height REAL,
      segmentation_mask TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ Table created\n');
  console.log('📥 Processing unknown annotations...');
  
  // Process all three splits
  const splits = ['train', 'valid', 'test'];
  const unknownMap = new Map();
  
  for (const split of splits) {
    const annotationsPath = `data/maya-glyphs-yax-w4l6k-6-coco/${split}/_annotations.coco.json`;
    const data = JSON.parse(readFileSync(annotationsPath, 'utf-8'));
    
    // Load catalog mappings
    const catalogResult = await db.execute('SELECT id, mhd_code FROM catalog_signs');
    const catalog = new Map(
      catalogResult.rows.map((r: any) => [r.mhd_code.toLowerCase(), r.id])
    );
    
    for (const ann of data.annotations) {
      const category = data.categories.find((c: any) => c.id === ann.category_id);
      if (!category) continue;
      
      const code = category.name.trim();
      const codeKey = code.toLowerCase();
      
      // Check if it's unknown
      if (!catalog.has(codeKey)) {
        if (!unknownMap.has(code)) {
          const image = data.images.find((i: any) => i.id === ann.image_id);
          unknownMap.set(code, {
            code,
            count: 0,
            example: {
              imagePath: image?.file_name || '',
              bbox: ann.bbox,
              segmentation: ann.segmentation
            }
          });
        }
        unknownMap.get(code).count++;
      }
    }
  }
  
  console.log(`\n📊 Found ${unknownMap.size} unknown sign codes\n`);
  
  // Insert into database
  for (const [code, data] of unknownMap) {
    console.log(`Adding: ${code} (${data.count} occurrences)`);
    
    await db.execute({
      sql: `
        INSERT INTO unknown_signs 
        (roboflow_code, occurrences, bbox_x, bbox_y, bbox_width, bbox_height, segmentation_mask)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        code,
        data.count,
        data.example.bbox[0],
        data.example.bbox[1],
        data.example.bbox[2],
        data.example.bbox[3],
        JSON.stringify(data.example.segmentation)
      ]
    });
  }
  
  console.log('\n✅ Done! Check with:');
  console.log('   SELECT * FROM unknown_signs ORDER BY occurrences DESC;');
}

main().catch(console.error);
