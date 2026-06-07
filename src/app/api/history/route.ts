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
        const projectDir = path.join(mirrorsDir, siteId);
        const indexPath = path.join(projectDir, 'index.html');
        const metaPath = path.join(projectDir, 'metadata.json');
        
        let hasIndex = fs.existsSync(indexPath);
        let metadata = null;
        
        if (fs.existsSync(metaPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          } catch (e) {
            console.error('Failed to parse metadata for', siteId);
          }
        }

        let createdAt = new Date();
        try {
          createdAt = fs.statSync(projectDir).birthtime;
        } catch (e) {}

        return {
          siteId,
          hasIndex,
          previewUrl: `/mirrors/${siteId}/index.html`,
          createdAt,
          metadata
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('History fetch failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch history' }, { status: 500 });
  }
}
