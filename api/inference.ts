import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Roboflow API key not configured' });
  }

  const { image } = req.body as { image?: string };
  if (!image) {
    return res.status(400).json({ error: 'Missing image field (base64 encoded)' });
  }

  try {
    const roboflowRes = await fetch(
      `https://detect.roboflow.com/yax-w4l6k/6?api_key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: image,
      }
    );

    if (!roboflowRes.ok) {
      const errText = await roboflowRes.text();
      return res.status(roboflowRes.status).json({ error: 'Roboflow API error', details: errText });
    }

    const data = await roboflowRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Inference error:', err);
    return res.status(500).json({ error: 'Inference failed', details: String(err) });
  }
}
