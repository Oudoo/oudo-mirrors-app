import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { siteId, originalUrl } = await request.json();
    
    if (!siteId || !originalUrl) {
      return NextResponse.json({ error: 'siteId and originalUrl are required' }, { status: 400 });
    }

    const mirrorDir = path.join(process.cwd(), 'public', 'mirrors', siteId);
    if (!fs.existsSync(mirrorDir)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const metaPath = path.join(mirrorDir, 'metadata.json');
    let metadata: any = {
      isDeepCrawl: false,
      subPagesCount: 0,
      assetsCount: 0,
      timestamp: new Date().toISOString()
    };

    if (fs.existsSync(metaPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch (e) {}
    }

    metadata.originalUrl = originalUrl;

    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({ success: true, metadata });
  } catch (error: any) {
    console.error('Failed to update metadata:', error);
    return NextResponse.json({ error: error.message || 'Failed to update metadata' }, { status: 500 });
  }
}
