import { db } from '../src/lib/db';
import { readFileSync } from 'fs';

async function main() {
  console.log('🖼️  Importing block images...\n');
  
  // Add image_url column if it doesn't exist
  try {
    await db.execute(`ALTER TABLE blocks ADD COLUMN image_url TEXT`);
    console.log('✅ Added image_url column to blocks\n');
  } catch (err: any) {
    if (!err.message.includes('duplicate column')) {
      throw err;
    }
    console.log('ℹ️  image_url column already exists\n');
  }
  
  // Load blocks JSON
  const blocks = JSON.parse(readFileSync('data/mhd-blocks-all.json', 'utf-8'));
  const blocksWithImages = blocks.filter((b: any) => 
    b.blimage1 !== null || b.blimage2 !== null
  );
  
  console.log(`📊 Found ${blocksWithImages.length.toLocaleString()} blocks with images\n`);
  
  let updated = 0;
  const updates = [];
  
  for (const block of blocksWithImages) {
    const blockId = `${block.objabbr}-${block.blsort}`;
    
    // Get image URL (prefer blimage1, fallback to blimage2)
    const imageUrl = block.blimage1?.OrgPubLink || 
                     block.blimage1?.ThumbPubLink ||
                     block.blimage2?.OrgPubLink ||
                     block.blimage2?.ThumbPubLink;
    
    if (!imageUrl) continue;
    
    updates.push({
      sql: `UPDATE blocks SET image_url = ? WHERE mhd_block_id = ?`,
      args: [imageUrl, blockId]
    });
    
    // Batch every 500
    if (updates.length >= 500) {
      await db.batch(updates, 'write');
      updated += updates.length;
      updates.length = 0;
      console.log(`   Updated ${updated.toLocaleString()} blocks...`);
    }
  }
  
  // Update remaining
  if (updates.length > 0) {
    await db.batch(updates, 'write');
    updated += updates.length;
  }
  
  console.log(`\n✅ Updated ${updated.toLocaleString()} blocks with images!`);
  
  // Check final coverage
  const stats = await db.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(image_url) as with_images
    FROM blocks
  `);
  
  console.log(`\n📊 Final blocks coverage:`);
  console.log(`   Total: ${stats.rows[0].total}`);
  console.log(`   With images: ${stats.rows[0].with_images}`);
  console.log(`   Coverage: ${Math.round(stats.rows[0].with_images / stats.rows[0].total * 100)}%`);
}

main().catch(console.error);
