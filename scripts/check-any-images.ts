import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function check() {
  // Check for ANY non-null image URLs
  const withImages = await db.execute(`
    SELECT COUNT(*) as count 
    FROM blocks 
    WHERE block_image1_url IS NOT NULL 
       OR block_image2_url IS NOT NULL 
       OR image_url IS NOT NULL
  `);
  console.log('Blocks with any image URL:', withImages.rows[0].count);
  
  // Get one example if it exists
  const example = await db.execute(`
    SELECT * FROM blocks 
    WHERE block_image1_url IS NOT NULL 
       OR block_image2_url IS NOT NULL 
       OR image_url IS NOT NULL
    LIMIT 1
  `);
  
  if (example.rows.length > 0) {
    console.log('\nExample block with image:', example.rows[0]);
  } else {
    console.log('\nNo blocks have images in the database.');
  }
}

check().catch(console.error);
