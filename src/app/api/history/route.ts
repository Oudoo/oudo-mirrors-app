import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mirrorsDir = path.join(process.cwd(), 'public', 'mirrors');
    
    if (!fs.existsSync(mirrorsDir)) {
      return NextResponse.json({ projects: [] });
    }

    const projects = fs.readdirSync(mirrorsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const siteId = dirent.name;
        // Basic stats, check if index.html exists
        const indexPath = path.join(mirrorsDir, siteId, 'index.html');
        let size = 0;
        let hasIndex = fs.existsSync(indexPath);
        
        try {
          const stat = fs.statSync(path.join(mirrorsDir, siteId));
          // We could recursively calculate size but for now just returning existence
          size = stat.size;
        } catch (e) {}

        return {
          siteId,
          hasIndex,
          previewUrl: `/mirrors/${siteId}/index.html`,
          createdAt: fs.statSync(path.join(mirrorsDir, siteId)).birthtime
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('History fetch failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch history' }, { status: 500 });
  }
}
