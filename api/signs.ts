import { createClient } from '@libsql/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const db = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!.replace('libsql://', 'https://'),
  authToken: process.env.VITE_TURSO_AUTH_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = (req.query.q as string) || '';

  try {
    const result = await db.execute({
      sql: `
        SELECT 
          s.*,
          COUNT(si.id) as instance_count
        FROM signs s
        LEFT JOIN sign_instances si ON s.id = si.sign_id
        WHERE 
          s.bonn_id LIKE ? OR
          s.thompson_id LIKE ? OR
          s.mhd_id LIKE ? OR
          s.phonetic_value LIKE ?
        GROUP BY s.id
        ORDER BY s.bonn_id
      `,
      args: [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    });

    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
