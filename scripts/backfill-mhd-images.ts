import { db } from '../src/lib/db.ts';

async function main() {
  const res = await db.execute(
    `SELECT id, metadata FROM sign_instances WHERE source_type = 'mhd' AND metadata IS NOT NULL`
  );

  let updated = 0;
  for (const row of res.rows) {
    const { id, metadata } = row as any;
    if (!metadata) continue;

    let url: string | null = null;
    try {
      const meta = JSON.parse(metadata);
      url =
        meta?.blimage1?.ThumbPubLink ||
        meta?.blimage1?.OrgPubLink ||
        meta?.blimage2?.ThumbPubLink ||
        meta?.blimage2?.OrgPubLink ||
        null;
    } catch {
      continue;
    }

    if (!url) continue;

    await db.execute({
      sql: `UPDATE sign_instances SET image_url = ? WHERE id = ?`,
      args: [url, id]
    });
    updated++;
    if (updated % 1000 === 0) console.log(`Updated ${updated} instances...`);
  }

  console.log(`✅ Set image_url for ${updated} MHD instances`);
}

main().catch(console.error);
