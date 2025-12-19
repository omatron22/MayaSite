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

async function getFilterOptions() {
  console.log('Fetching filter options from database...\n');

  // Get unique artifact codes (sites)
  const sites = await db.execute(`
    SELECT DISTINCT artifact_code 
    FROM blocks 
    WHERE artifact_code IS NOT NULL 
    ORDER BY artifact_code 
    LIMIT 50
  `);
  
  // Get unique word classes
  const wordClasses = await db.execute(`
    SELECT DISTINCT word_class 
    FROM catalog_signs 
    WHERE word_class IS NOT NULL 
    ORDER BY word_class
  `);

  // Get unique volumes (Classic/Codices)
  const volumes = await db.execute(`
    SELECT DISTINCT volume 
    FROM catalog_signs 
    WHERE volume IS NOT NULL 
    ORDER BY volume
  `);

  // Get unique techniques
  const techniques = await db.execute(`
    SELECT DISTINCT technique 
    FROM catalog_signs 
    WHERE technique IS NOT NULL 
    ORDER BY technique
  `);

  console.log('SITES (sample):', sites.rows.slice(0, 20).map(r => r.artifact_code));
  console.log('\nWORD CLASSES:', wordClasses.rows.map(r => r.word_class));
  console.log('\nVOLUMES:', volumes.rows.map(r => r.volume));
  console.log('\nTECHNIQUES:', techniques.rows.map(r => r.technique));
}

getFilterOptions().catch(console.error);
