import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const mirrorDir = path.join(process.cwd(), 'public', 'mirrors', siteId);
    
    if (!fs.existsSync(mirrorDir)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create a PassThrough stream to pipe the archive data
    const stream = new Readable({
      read() {}
    });

    const archive = new ZipArchive({
      zlib: { level: 9 } // maximum compression
    });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      stream.destroy(err);
    });

    archive.on('data', (chunk) => {
      stream.push(chunk);
    });

    archive.on('end', () => {
      stream.push(null);
    });

    // Add the directory to the archive
    archive.directory(mirrorDir, false);
    
    // Finalize the archive (this will trigger the streaming)
    archive.finalize();

    // Return the stream as the response with appropriate headers
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${siteId}.zip"`,
      },
    });

  } catch (error: any) {
    console.error('Compress failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to compress project' }, { status: 500 });
  }
}
