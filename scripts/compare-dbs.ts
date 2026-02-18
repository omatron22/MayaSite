import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';

async function safeCount(db: any, sql: string): Promise<number> {
  try {
    const r = await db.execute(sql);
    return Number(r.rows[0].n);
  } catch { return -1; }
}

async function safeQuery(db: any, sql: string, args?: any[]): Promise<any[]> {
  try {
    const r = args ? await db.execute({ sql, args }) : await db.execute(sql);
    return r.rows;
  } catch { return []; }
}

async function main() {
  const db1 = createClient({
    url: process.env.TURSO_DATABASE_URL!.replace('libsql://', 'https://'),
    authToken: process.env.TURSO_AUTH_TOKEN!,
    intMode: 'number',
  });

  const db2 = createClient({
    url: process.env.VITE_TURSO_DATABASE_URL!.replace('libsql://', 'https://'),
    authToken: process.env.VITE_TURSO_AUTH_TOKEN!,
    intMode: 'number',
  });

  const tables = ['catalog_signs', 'blocks', 'graphemes', 'roboflow_instances', 'kerr_vessels', 'cmhi_images'];
  const enrichment: [string, string, string][] = [
    ['has thompson', 'thompson_code IS NOT NULL', 'catalog_signs'],
    ['has bonn', 'bonn_sign_number IS NOT NULL', 'catalog_signs'],
    ['has translation', "english_translation IS NOT NULL AND english_translation != ''", 'catalog_signs'],
    ['has syllabic', "syllabic_value IS NOT NULL AND syllabic_value != ''", 'catalog_signs'],
    ['has site', "site_name IS NOT NULL AND site_name != ''", 'blocks'],
    ['linked to catalog', 'catalog_sign_id IS NOT NULL', 'graphemes'],
  ];

  console.log('Table                          | omatron (local) | omatron22 (vercel)');
  console.log('-------------------------------|-----------------|-------------------');

  for (const t of tables) {
    const n1 = await safeCount(db1, `SELECT COUNT(*) as n FROM ${t}`);
    const n2 = await safeCount(db2, `SELECT COUNT(*) as n FROM ${t}`);
    const v1 = (n1 === -1 ? 'N/A' : String(n1)).padStart(15);
    const v2 = (n2 === -1 ? 'N/A' : String(n2)).padStart(18);
    const diff = (n1 >= 0 && n2 >= 0) ? n2 - n1 : null;
    const marker = diff !== null && diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff})` : '';
    console.log(`${t.padEnd(31)}|${v1} |${v2}${marker}`);
  }

  console.log('-------------------------------|-----------------|-------------------');

  for (const [label, cond, table] of enrichment) {
    const n1 = await safeCount(db1, `SELECT COUNT(*) as n FROM ${table} WHERE ${cond}`);
    const n2 = await safeCount(db2, `SELECT COUNT(*) as n FROM ${table} WHERE ${cond}`);
    const v1 = (n1 === -1 ? 'N/A' : String(n1)).padStart(15);
    const v2 = (n2 === -1 ? 'N/A' : String(n2)).padStart(18);
    const diff = (n1 >= 0 && n2 >= 0) ? n2 - n1 : null;
    const marker = diff !== null && diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff})` : '';
    console.log(`${(table + ' ' + label).padEnd(31)}|${v1} |${v2}${marker}`);
  }

  // Schema check
  console.log('\n--- Schema differences ---');
  for (const t of tables) {
    const s1 = await safeQuery(db1, `PRAGMA table_info(${t})`);
    const s2 = await safeQuery(db2, `PRAGMA table_info(${t})`);
    if (!s1.length && !s2.length) continue;
    if (!s1.length) { console.log(`${t}: only exists in omatron22`); continue; }
    if (!s2.length) { console.log(`${t}: only exists in omatron`); continue; }
    const cols1 = s1.map(r => r.name as string).sort();
    const cols2 = s2.map(r => r.name as string).sort();
    const only1 = cols1.filter(c => !cols2.includes(c));
    const only2 = cols2.filter(c => !cols1.includes(c));
    if (only1.length || only2.length) {
      console.log(`${t}:`);
      if (only1.length) console.log(`  only in omatron: ${only1.join(', ')}`);
      if (only2.length) console.log(`  only in omatron22: ${only2.join(', ')}`);
    }
  }

  // Cross-check extra signs
  const sample2 = await safeQuery(db2, `SELECT mhd_code FROM catalog_signs ORDER BY id DESC LIMIT 20`);
  console.log('\n--- Latest 20 signs in omatron22 ---');
  for (const row of sample2) {
    const exists = await safeCount(db1, `SELECT COUNT(*) as n FROM catalog_signs WHERE mhd_code = '${row.mhd_code}'`);
    console.log(`  ${row.mhd_code} ${exists > 0 ? '(exists in both)' : '** ONLY in omatron22 **'}`);
  }

  // Check what's unique to omatron (kerr, cmhi)
  const kerrCount = await safeCount(db1, 'SELECT COUNT(*) as n FROM kerr_vessels');
  const cmhiCount = await safeCount(db1, 'SELECT COUNT(*) as n FROM cmhi_images');
  console.log(`\n--- Unique to omatron ---`);
  console.log(`  kerr_vessels: ${kerrCount}`);
  console.log(`  cmhi_images: ${cmhiCount}`);
}

main().catch(console.error);
