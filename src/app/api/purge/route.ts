import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { siteId } = await request.json();
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const indexPath = path.join(process.cwd(), 'public', 'mirrors', siteId, 'index.html');
    
    if (!fs.existsSync(indexPath)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const htmlContent = fs.readFileSync(indexPath, 'utf-8');

    // Use Cheerio for robust DOM manipulation instead of brittle Regex
    const $ = cheerio.load(htmlContent);

    // Remove Framer badge container by ID
    $('#__framer-badge-container').remove();
    
    // Remove any anchor tags linking to framer.com (captures "Use for free" badges and "Made in Framer" badges)
    $('a[href*="framer.com"]').remove();

    // Clean up any remaining framer badge classes just in case
    $('.__framer-badge').remove();

    fs.writeFileSync(indexPath, $.html());

    return NextResponse.json({ success: true, message: 'Project purged successfully' });
  } catch (error: any) {
    console.error('Purge failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to purge project' }, { status: 500 });
  }
}
