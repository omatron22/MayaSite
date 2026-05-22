import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tab = String(req.query.tab || 'artefacts');
  const q = String(req.query.q || '').trim().toLowerCase();
  const page = Math.max(1, parseInt(String(req.query.page || '1')));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '48'))));
  const offset = (page - 1) * pageSize;

  try {
    if (tab === 'places') {
      const where = q ? 'WHERE LOWER(label) LIKE ?' : '';
      const args: (string | number)[] = q ? [`%${q}%`] : [];

      const [countRes, rowsRes] = await Promise.all([
        db.execute({ sql: `SELECT COUNT(*) AS n FROM twkm_places ${where}`, args }),
        db.execute({
          sql: `SELECT p.place_id, p.label, p.latitude, p.longitude,
                       (SELECT COUNT(*) FROM blocks b WHERE LOWER(TRIM(b.site_name)) = LOWER(TRIM(p.label))) AS block_count
                FROM twkm_places p ${where}
                ORDER BY p.label LIMIT ? OFFSET ?`,
          args: [...args, pageSize, offset],
        }),
      ]);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ tab, results: rowsRes.rows, total: Number(countRes.rows[0].n), page, pageSize });
    }

    // default: artefacts
    const where = q ? 'WHERE LOWER(label) LIKE ?' : '';
    const args: (string | number)[] = q ? [`%${q}%`] : [];
    const [countRes, rowsRes] = await Promise.all([
      db.execute({ sql: `SELECT COUNT(*) AS n FROM twkm_artefacts ${where}`, args }),
      db.execute({
        sql: `SELECT artefact_id, label, date_start, date_end, places_json
              FROM twkm_artefacts ${where}
              ORDER BY date_start, label
              LIMIT ? OFFSET ?`,
        args: [...args, pageSize, offset],
      }),
    ]);

    // Pre-join place labels for any rows
    const placeIds = new Set<string>();
    rowsRes.rows.forEach((r) => {
      try {
        const arr = r.places_json ? JSON.parse(String(r.places_json)) : [];
        arr.forEach((id: string) => placeIds.add(id));
      } catch { /* ignore */ }
    });
    const placeMap: Record<string, string> = {};
    if (placeIds.size > 0) {
      const ids = Array.from(placeIds);
      const placeholders = ids.map(() => '?').join(',');
      const placeRows = await db.execute({
        sql: `SELECT place_id, label FROM twkm_places WHERE place_id IN (${placeholders})`,
        args: ids,
      });
      placeRows.rows.forEach((r) => { placeMap[String(r.place_id)] = String(r.label); });
    }

    const enriched = rowsRes.rows.map((r) => {
      let placeLabels: string[] = [];
      try {
        const arr = r.places_json ? JSON.parse(String(r.places_json)) : [];
        placeLabels = arr.map((id: string) => placeMap[id] || id);
      } catch { /* ignore */ }
      return {
        artefact_id: r.artefact_id,
        label: r.label,
        date_start: r.date_start,
        date_end: r.date_end,
        places: placeLabels,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ tab, results: enriched, total: Number(countRes.rows[0].n), page, pageSize });
  } catch (err) {
    console.error('TWKM collection error:', err);
    return res.status(500).json({ error: 'Failed to load TWKM data', details: String(err) });
  }
}
