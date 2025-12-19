import { db } from '../src/lib/db.ts';

async function main() {
  console.log('🖼️  Starting MHD image backfill...\n');
  
  const res = await db.execute(
    `SELECT id, metadata FROM sign_instances WHERE source_type = 'mhd' AND metadata IS NOT NULL`
  );

  console.log(`📊 Found ${res.rows.length.toLocaleString()} MHD instances\n`);

  let updated = 0;
  const startTime = Date.now();
  const updates = [];
  
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

    updates.push({
      sql: `UPDATE sign_instances SET image_url = ? WHERE id = ?`,
      args: [url, id]
    });

    // Batch every 500
    if (updates.length >= 500) {
      await db.batch(updates, 'write');
      updated += updates.length;
      updates.length = 0;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`   Updated ${updated.toLocaleString()} instances... (${elapsed}s)`);
    }
  }

  // Update remaining
  if (updates.length > 0) {
    await db.batch(updates, 'write');
    updated += updates.length;
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ Set image_url for ${updated.toLocaleString()} instances in ${totalTime}s`);
}

main().catch(console.error);
