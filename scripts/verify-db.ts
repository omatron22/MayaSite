import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';

async function main() {
  for (const t of ['catalog_signs', 'blocks', 'graphemes', 'roboflow_instances']) {
    const r = await db.execute('SELECT COUNT(*) as c FROM ' + t);
    console.log(t + ':', r.rows[0].c);
  }
  const linked = await db.execute('SELECT COUNT(*) as c FROM graphemes WHERE catalog_sign_id IS NOT NULL');
  console.log('graphemes linked to catalog:', linked.rows[0].c);
  const imgs = await db.execute("SELECT COUNT(*) as c FROM blocks WHERE block_image1_url IS NOT NULL AND block_image1_url != ''");
  console.log('blocks with images:', imgs.rows[0].c);
  const sites = await db.execute("SELECT COUNT(*) as c FROM blocks WHERE site_name IS NOT NULL AND site_name != ''");
  console.log('blocks with site mapping:', sites.rows[0].c);
}
main().catch(console.error);
