import { createClient } from '@libsql/client';
import fs from 'fs';

const db = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL.replace('libsql://', 'https://'),
  authToken: process.env.VITE_TURSO_AUTH_TOKEN
});

async function importRoboflowInstances() {
  console.log('📥 Importing Roboflow instances...');
  
  const folders = ['train', 'valid', 'test'];
  let imported = 0;
  let skipped = 0;
  const skippedClasses = new Set();
  
  for (const folder of folders) {
    const annotationPath = `./yax-1/${folder}/_annotations.coco.json`;
    if (!fs.existsSync(annotationPath)) continue;
    
    const annotations = JSON.parse(fs.readFileSync(annotationPath, 'utf-8'));
    
    console.log(`\n📁 Processing ${folder} folder...`);
    console.log(`   Images: ${annotations.images.length}`);
    console.log(`   Annotations: ${annotations.annotations.length}`);
    
    for (const image of annotations.images) {
      const imageAnnotations = annotations.annotations.filter(
        ann => ann.image_id === image.id
      );
      
      for (const ann of imageAnnotations) {
        const category = annotations.categories.find(c => c.id === ann.category_id);
        const className = category?.name;
        
        if (className === 'glyphs') continue;
        
        // Extract Bonn ID number (leading digits)
        const match = className?.match(/^(\d+)/);
        const bonnIdNum = match ? match[1] : null;
        
        if (!bonnIdNum) {
          skippedClasses.add(className);
          skipped++;
          continue;
        }
        
        // Pad to 4 digits to match database format: 501 -> 0501
        const paddedBonnId = bonnIdNum.padStart(4, '0');
        
        // Try multiple matching patterns since database has variants like "0001bhmore", "0005st"
        const signResult = await db.execute({
          sql: `SELECT id, bonn_id FROM signs WHERE bonn_id LIKE ? LIMIT 1`,
          args: [`${paddedBonnId}%`]
        });
        
        if (signResult.rows.length > 0) {
          const signId = signResult.rows[0].id;
          const dbBonnId = signResult.rows[0].bonn_id;
          
          // Insert sign instance
          await db.execute({
            sql: `INSERT INTO sign_instances 
                  (sign_id, source_type, source_id, source_url, image_url, notes) 
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              signId,
              'roboflow',
              String(image.id),
              `https://universe.roboflow.com/maya-glyphs/yax-w4l6k`,
              `yax-1/${folder}/${image.file_name}`,
              JSON.stringify({
                class_name: className,
                bbox: ann.bbox,
                split: folder,
                matched_bonn_id: dbBonnId
              })
            ]
          });
          imported++;
          
          if (imported % 50 === 0) {
            console.log(`   Imported ${imported}...`);
          }
        } else {
          skippedClasses.add(`${className} (${bonnIdNum} -> ${paddedBonnId} not found)`);
          skipped++;
        }
      }
    }
  }
  
  console.log(`\n✅ Imported ${imported} sign instances`);
  console.log(`⚠️  Skipped ${skipped} instances`);
  
  if (skippedClasses.size > 0) {
    console.log(`\n📋 Skipped classes (first 15):`);
    Array.from(skippedClasses).slice(0, 15).forEach(c => console.log(`   - ${c}`));
  }
}

importRoboflowInstances();
