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

    // Track removals
    let removedBadges = 0;
    let removedLinks = 0;
    let removedClasses = 0;

    const badgeContainer = $('#__framer-badge-container');
    if (badgeContainer.length) {
      removedBadges += badgeContainer.length;
      badgeContainer.remove();
    }
    
    const framerLinks = $('a[href*="framer.com"]');
    if (framerLinks.length) {
      removedLinks += framerLinks.length;
      framerLinks.remove();
    }

    const badgeClasses = $('.__framer-badge');
    if (badgeClasses.length) {
      removedClasses += badgeClasses.length;
      badgeClasses.remove();
    }

    fs.writeFileSync(indexPath, $.html());

    // Write to metadata.json
    const metaPath = path.join(process.cwd(), 'public', 'mirrors', siteId, 'metadata.json');
    let metadata: any = {};
    if (fs.existsSync(metaPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch (e) {}
    }
    
    if (!metadata.purgeHistory) {
      metadata.purgeHistory = [];
    }

    const reportMessage = `Removed ${removedBadges} Framer badge containers, ${removedLinks} Framer tracking/promo links, and ${removedClasses} lingering badge classes. Reason: Automatically cleaned up intrusive third-party watermarks to preserve pure site representation.`;

    metadata.purgeHistory.push({
      timestamp: new Date().toISOString(),
      report: reportMessage
    });

    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({ success: true, message: reportMessage, metadata });
  } catch (error: any) {
    console.error('Purge failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to purge project' }, { status: 500 });
  }
}
