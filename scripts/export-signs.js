import { createClient } from '@libsql/client';
import fs from 'fs';

const db = createClient({
  url: 'libsql://mayasite-omatron22.aws-us-west-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function exportSigns() {
  console.log('📤 Exporting signs...');
  
  const result = await db.execute(`
    SELECT 
      s.*,
      COUNT(si.id) as instance_count
    FROM signs s
    LEFT JOIN sign_instances si ON s.id = si.sign_id
    GROUP BY s.id
    ORDER BY s.bonn_id
  `);

  const signs = result.rows.map(row => ({
    id: Number(row.id),
    bonn_id: row.bonn_id,
    thompson_id: row.thompson_id,
    mhd_id: row.mhd_id,
    phonetic_value: row.phonetic_value,
    description: row.description,
    primary_image_url: row.primary_image_url,
    created_at: row.created_at,
    instance_count: Number(row.instance_count)
  }));

  fs.writeFileSync('public/signs.json', JSON.stringify(signs, null, 2));
  console.log(`✅ Exported ${signs.length} signs to public/signs.json`);
}

exportSigns();
