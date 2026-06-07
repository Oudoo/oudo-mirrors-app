import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { siteId } = await request.json();
    
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const folderPath = path.join(process.cwd(), 'public', 'mirrors', siteId);
    
    // Use macOS 'open' command to reveal in Finder
    exec(`open "${folderPath}"`, (error) => {
      if (error) {
        console.error(`Error opening folder: ${error.message}`);
      }
    });
    
    return NextResponse.json({ success: true, message: 'Revealed in Finder' });
  } catch (error: any) {
    console.error('Reveal error:', error);
    return NextResponse.json(
      { error: 'Failed to reveal folder: ' + error.message },
      { status: 500 }
    );
  }
}
