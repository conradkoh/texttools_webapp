import { LiteParse } from '@llamaindex/liteparse';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64 } = req.body;

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    const buffer = Buffer.from(pdfBase64, 'base64');
    const tempFilePath = join(tmpdir(), `pdf-${randomUUID()}.pdf`);

    await writeFile(tempFilePath, buffer);

    const parser = new LiteParse({ ocrEnabled: false });
    const result = await parser.parse(tempFilePath);

    await unlink(tempFilePath).catch(() => {});

    res.status(200).json({ text: result.text });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to parse PDF',
      details: error.message || String(error),
    });
  }
}
