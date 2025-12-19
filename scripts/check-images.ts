import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const db = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN!
});

async function check() {
  console.log('Checking image data...\n');

  const blocksWithImages = await db.execute(`
    SELECT COUNT(*) as count 
    FROM blocks 
    WHERE block_image1_url IS NOT NULL AND block_image1_url != ''
  `);
  
  const blocksWithDates = await db.execute(`
    SELECT COUNT(*) as count 
    FROM blocks 
    WHERE event_calendar IS NOT NULL AND event_calendar != ''
  `);
  
  const graphemesWithImages = await db.execute(`
    SELECT COUNT(*) as count 
    FROM graphemes g
    LEFT JOIN blocks b ON g.block_id = b.id
    WHERE b.block_image1_url IS NOT NULL AND b.block_image1_url != ''
  `);

  console.log('Blocks with images:', blocksWithImages.rows[0].count);
  console.log('Blocks with dates:', blocksWithDates.rows[0].count);
  console.log('Graphemes with images:', graphemesWithImages.rows[0].count);
  
  // Sample one with image
  const sample = await db.execute(`
    SELECT block_image1_url, event_calendar 
    FROM blocks 
    WHERE block_image1_url IS NOT NULL 
    LIMIT 1
  `);
  
  console.log('\nSample block image URL:', sample.rows[0]?.block_image1_url);
  console.log('Sample block date:', sample.rows[0]?.event_calendar);
}

check().catch(console.error);
