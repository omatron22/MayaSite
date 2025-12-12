import { createClient } from '@libsql/client';
import fs from 'fs';
import { parseHTML } from 'linkedom';

const db = createClient({
  url: 'libsql://mayasite-omatron22.aws-us-west-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN
});

const html = fs.readFileSync('./src/lib/lmgg-concordance.html', 'utf-8');
const { document } = parseHTML(html);
const rows = document.querySelectorAll('table tr');

let imported = 0;

for (let i = 1; i < rows.length; i++) {
  const cells = rows[i].querySelectorAll('td');
  if (cells.length < 3) continue;
  
  const thompson = cells[0]?.textContent?.trim() || null;
  const bonn = cells[1]?.textContent?.trim() || null;
  const mhd = cells[3]?.textContent?.trim() || null;
  
  if (bonn?.includes('not a Bonn number')) continue;
  if (mhd?.includes('does not give a match')) continue;
  
  if ((bonn && bonn !== '~') || (thompson && thompson !== '~') || (mhd && mhd !== '~')) {
    await db.execute({
      sql: `INSERT INTO signs (thompson_id, bonn_id, mhd_id) VALUES (?, ?, ?)`,
      args: [
        thompson && thompson !== '~' ? thompson : null,
        bonn && bonn !== '~' ? bonn : null,
        mhd && mhd !== '~' ? mhd : null
      ]
    });
    imported++;
  }
}

console.log(`✅ Imported ${imported} signs`);
