import { db } from '../src/lib/db';
import { readFileSync } from 'fs';

async function main() {
  console.log('🖼️  Importing grapheme images...\n');
  
  // Add image_url column if it doesn't exist
  try {
    await db.execute(`ALTER TABLE graphemes ADD COLUMN image_url TEXT`);
    console.log('✅ Added image_url column to graphemes\n');
  } catch (err: any) {
    if (!err.message.includes('duplicate column')) {
      throw err;
    }
    console.log('ℹ️  image_url column already exists\n');
  }
  
  // Load graphemes JSON
  const graphemes = JSON.parse(readFileSync('data/mhd-graphemes-all.json', 'utf-8'));
  const graphemesWithImages = graphemes.filter((g: any) => 
    g.blimage1 !== null || g.blimage2 !== null
  );
  
  console.log(`📊 Found ${graphemesWithImages.length.toLocaleString()} graphemes with images\n`);
  
  let updated = 0;
  const updates = [];
  
  for (const grapheme of graphemesWithImages) {
    // Get image URL (prefer blimage1, fallback to blimage2)
    const imageUrl = grapheme.blimage1?.OrgPubLink || 
                     grapheme.blimage1?.ThumbPubLink ||
                     grapheme.blimage2?.OrgPubLink ||
                     grapheme.blimage2?.ThumbPubLink;
    
    if (!imageUrl) continue;
    
    // Match by artifact_code + blsort to find the grapheme
    const blockId = `${grapheme.objabbr}-${grapheme.blsort}`;
    
    updates.push({
      sql: `
        UPDATE graphemes 
        SET image_url = ? 
        WHERE artifact_code = ? 
        AND EXISTS (
          SELECT 1 FROM blocks b 
          WHERE b.id = graphemes.block_id 
          AND b.mhd_block_id = ?
        )
      `,
      args: [imageUrl, grapheme.objabbr, blockId]
    });
    
    // Batch every 500
    if (updates.length >= 500) {
      await db.batch(updates, 'write');
      updated += updates.length;
      updates.length = 0;
      console.log(`   Updated ${updated.toLocaleString()} graphemes...`);
    }
  }
  
  // Update remaining
  if (updates.length > 0) {
    await db.batch(updates, 'write');
    updated += updates.length;
  }
  
  console.log(`\n✅ Updated ${updated.toLocaleString()} graphemes with images!`);
  
  // Check final coverage
  const stats = await db.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(image_url) as with_images
    FROM graphemes
  `);
  
  console.log(`\n📊 Final graphemes coverage:`);
  console.log(`   Total: ${stats.rows[0].total}`);
  console.log(`   With images: ${stats.rows[0].with_images}`);
  console.log(`   Coverage: ${Math.round(stats.rows[0].with_images / stats.rows[0].total * 100)}%`);
}

main().catch(console.error);
