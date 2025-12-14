// scripts/import-mhd.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDatabase } from '../src/lib/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type MhdRow = {
  objabbr: string;
  objstralmpg: string;
  blsort: number;
  bltag: string;
  objorienfr: string;
  blcoord: string;
  bllogosyll: string;
  blhyphen: string;
  blmaya1: string;
  blmaya2: string;
  blengl: string;
  blgraphcodes: string;
  blevcal: string;
  blevlc: string;
  blev260: string;
  blev365: string;
  pncode: string;
  grlogosyll: string;
  grhyphen: string;
  grmaya: string;
  grengl: string;
  grgraphcode: string;
  dictionary: string;
  evidence: string;
  substitution: string;
  blnotes: string;
  blsem: string;
  blsurfpgfr: string;
  imgfr: string | null;
  blimage1: string | null;
  blimage2: string | null;
  blimagenotes: string | null;
};

async function main() {
  await initDatabase();

  // Make re-runs safe: no duplicate instances for same source_id
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sign_instances_source
    ON sign_instances (source_type, source_id)
  `);

  const filePath = path.join(__dirname, '..', 'data', 'mhd-graphemes-all.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  const rows: MhdRow[] = JSON.parse(raw);

  // Map from MHD grapheme code to signs.id (per run) to avoid repeated lookups
  const signIdByCode = new Map<string, number>();

  for (const row of rows) {
    const code = row.grgraphcode || row.blgraphcodes || '';
    if (!code || code === 'UNKNOWN') continue;

    let signId = signIdByCode.get(code);

    if (!signId) {
      // Try to find an existing sign with this MHD code
      const existing = await db.execute({
        sql: `SELECT id FROM signs WHERE mhd_id = ? LIMIT 1`,
        args: [code]
      });

      if (existing.rows.length > 0) {
        signId = Number(existing.rows[0].id);
      } else {
        const res = await db.execute({
          sql: `
            INSERT INTO signs (
              bonn_id,
              thompson_id,
              mhd_id,
              phonetic_value,
              description,
              primary_image_url
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          args: [
            null,
            null,
            code,
            row.grmaya && row.grmaya !== '_' ? row.grmaya : null,
            row.grengl && row.grengl !== '_' ? row.grengl : null,
            null
          ]
        });

        signId = Number(
          (res as any).lastInsertRowid ?? (res as any).rows?.[0]?.id
        );
      }

      signIdByCode.set(code, signId);
    }

    const sourceId = `${row.objabbr}-${row.blsurfpgfr}-${row.objorienfr}-${row.blsort}`;
    const location = `${row.objabbr} ${row.blsurfpgfr}`;

    const notesParts = [
      row.blnotes,
      row.dictionary,
      row.evidence,
      row.substitution,
      row.blsem,
      row.blimagenotes
    ].filter((x) => x && x !== '_' && x !== '?');

    const notes = notesParts.join(' | ') || null;

    const metadata = {
      objabbr: row.objabbr,
      objstralmpg: row.objstralmpg,
      blsort: row.blsort,
      bltag: row.bltag,
      objorienfr: row.objorienfr,
      blcoord: row.blcoord,
      bllogosyll: row.bllogosyll,
      blhyphen: row.blhyphen,
      blmaya1: row.blmaya1,
      blmaya2: row.blmaya2,
      blengl: row.blengl,
      blgraphcodes: row.blgraphcodes,
      blevcal: row.blevcal,
      blevlc: row.blevlc,
      blev260: row.blev260,
      blev365: row.blev365,
      pncode: row.pncode,
      grlogosyll: row.grlogosyll,
      grhyphen: row.grhyphen,
      grmaya: row.grmaya,
      grengl: row.grengl,
      grgraphcode: row.grgraphcode,
      imgfr: row.imgfr,
      blimage1: row.blimage1,
      blimage2: row.blimage2,
      blimagenotes: row.blimagenotes
    };

    await db.execute({
      sql: `
        INSERT OR IGNORE INTO sign_instances
          (sign_id, source_type, source_id, source_url, image_url,
           date_start, date_end, location, artifact_type, notes, metadata)
        VALUES (?, 'mhd', ?, ?, ?, NULL, NULL, ?, 'codex', ?, ?)
      `,
      args: [
        signId,
        sourceId,
        '',       // placeholder for future real MHD URL
        null,     // image_url left null for now
        location,
        notes,
        JSON.stringify(metadata)
      ]
    });

  }

  console.log(`Imported ${rows.length} MHD rows into signs/sign_instances`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
