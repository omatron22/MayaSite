import { createClient } from '@libsql/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const db = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!.replace('libsql://', 'https://'),
  authToken: process.env.VITE_TURSO_AUTH_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  try {
    const signResult = await db.execute({
      sql: 'SELECT * FROM signs WHERE id = ?',
      args: [id as string]
    });

    const instancesResult = await db.execute({
      sql: 'SELECT * FROM sign_instances WHERE sign_id = ?',
      args: [id as string]
    });

    res.status(200).json({
      sign: signResult.rows[0] || null,
      instances: instancesResult.rows || []
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: String(error) });
  }
}
