import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function check() {
  const withImages = await db.execute(`
    SELECT COUNT(*) as count 
    FROM graphemes g
    INNER JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
    WHERE cs.primary_image_url IS NOT NULL AND cs.primary_image_url != ''
  `);
  
  console.log('Graphemes with linked catalog sign images:', withImages.rows[0].count);
  
  const total = await db.execute(`SELECT COUNT(*) as count FROM graphemes`);
  console.log('Total graphemes:', total.rows[0].count);
}

check().catch(console.error);
