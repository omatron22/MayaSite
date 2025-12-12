import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// R2 Configuration
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

console.log('Config check:');
console.log('Bucket:', BUCKET_NAME);
console.log('Public URL:', PUBLIC_URL);
console.log('');

// Database connection
const db = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL.replace('libsql://', 'https://'),
  authToken: process.env.VITE_TURSO_AUTH_TOKEN
});

async function uploadImage(localPath, r2Key) {
  const fileContent = fs.readFileSync(localPath);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: r2Key,
    Body: fileContent,
    ContentType: 'image/jpeg',
  });

  await s3Client.send(command);
}

async function uploadAllImages() {
  console.log('📤 Starting R2 upload...\n');
  
  const folders = ['train', 'valid', 'test'];
  let uploaded = 0;
  let updated = 0;

  for (const folder of folders) {
    const folderPath = `./yax-1/${folder}`;
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.jpg'));
    
    console.log(`📁 Processing ${folder} folder (${files.length} images)...`);

    for (const file of files) {
      const localPath = path.join(folderPath, file);
      const r2Key = `roboflow/${folder}/${file}`;
      
      try {
        // Upload to R2
        await uploadImage(localPath, r2Key);
        const publicUrl = `${PUBLIC_URL}/${r2Key}`;
        
        // Update database - match ANY path containing this filename
        const result = await db.execute({
          sql: 'UPDATE sign_instances SET image_url = ? WHERE image_url LIKE ?',
          args: [publicUrl, `%${file}`]
        });
        
        uploaded++;
        updated += Number(result.rowsAffected) || 0;
        
        if (uploaded % 50 === 0) {
          console.log(`   ✓ Uploaded ${uploaded} images...`);
        }
      } catch (error) {
        console.error(`   ✗ Failed to upload ${file}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Upload complete!`);
  console.log(`   📤 Uploaded: ${uploaded} images to R2`);
  console.log(`   📝 Updated: ${updated} database records`);
}

uploadAllImages().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
