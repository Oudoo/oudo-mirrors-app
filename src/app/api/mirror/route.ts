import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { url, folderName, deepCrawl } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const parsedUrl = new URL(url);
    const siteId = folderName ? folderName.replace(/[^a-zA-Z0-9_\-]/g, '_') : parsedUrl.hostname.replace(/[^a-zA-Z0-9]/g, '_');
    
    
    const mirrorDir = path.join(process.cwd(), 'public', 'mirrors', siteId);
    const assetsDir = path.join(mirrorDir, 'assets');
    
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const downloadedAssets = new Map<string, string>();

    await page.route('**/*', async (route) => {
      const requestUrl = route.request().url();
      
      try {
        const response = await route.fetch();
        const resourceType = route.request().resourceType();
        
        // Skip analytics, tracking, media streams, etc.
        if (['script', 'stylesheet', 'image', 'font'].includes(resourceType) && !requestUrl.startsWith('data:')) {
          const buffer = await response.body();
          
          const urlObj = new URL(requestUrl);
          let filename = urlObj.pathname.split('/').pop() || 'file';
          
          // Generate a safer filename
          const hash = Buffer.from(requestUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
          const ext = path.extname(filename) || (resourceType === 'script' ? '.js' : resourceType === 'stylesheet' ? '.css' : '');
          const baseName = path.basename(filename, ext);
          
          const finalFilename = `${baseName}_${hash}${ext}`;
          
          fs.writeFileSync(path.join(assetsDir, finalFilename), buffer);
          downloadedAssets.set(requestUrl, `assets/${finalFilename}`);
        }
        
        await route.fulfill({ response });
      } catch (error) {
        await route.continue().catch(() => {});
      }
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    let htmlContent = await page.content();
    
    for (const [originalUrl, localPath] of Array.from(downloadedAssets.entries())) {
      const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedUrl, 'g');
      htmlContent = htmlContent.replace(regex, `./${localPath}`);
      
      // Fix for HTML-encoded ampersands (e.g. in srcset tags for framerusercontent.com)
      const encodedUrl = escapedUrl.replace(/&/g, '&amp;');
      const encodedRegex = new RegExp(encodedUrl, 'g');
      htmlContent = htmlContent.replace(encodedRegex, `./${localPath}`);
    }

    htmlContent = htmlContent.replace(/<base href="[^"]*">/gi, '');

    fs.writeFileSync(path.join(mirrorDir, 'index.html'), htmlContent);

    // FEATURE 2: LLM-Ready Markdown Extraction
    try {
      const { Readability } = require('@mozilla/readability');
      const { JSDOM } = require('jsdom');
      const TurndownService = require('turndown');
      
      const dom = new JSDOM(htmlContent, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (article && article.content) {
        const turndownService = new TurndownService({ headingStyle: 'atx' });
        const markdown = turndownService.turndown(article.content);
        fs.writeFileSync(path.join(mirrorDir, 'content.md'), `# ${article.title}\n\n${markdown}`);
      }
    } catch (err) {
      console.error('Markdown extraction failed:', err);
    }

    // FEATURE 1: Deep Crawl
    let subPagesCount = 0;
    if (deepCrawl) {
      try {
        const links = await page.evaluate((baseUrl) => {
          const anchors = Array.from(document.querySelectorAll('a'));
          return anchors
            .map(a => a.href.split('#')[0])
            .filter(href => href.startsWith(baseUrl) && href !== baseUrl)
            .filter((v, i, a) => a.indexOf(v) === i); // Unique
        }, parsedUrl.origin);

        const pagesToCrawl = links.slice(0, 5); // Limit to 5 for performance
        subPagesCount = pagesToCrawl.length;

        for (const link of pagesToCrawl) {
          try {
            const subPageObj = new URL(link);
            const subPageName = subPageObj.pathname.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'subpage';
            
            const subPageContext = await browser.newPage();
            // We could add the same route interception here for assets, but keeping it simple for the HTML
            await subPageContext.goto(link, { waitUntil: 'networkidle', timeout: 15000 });
            let subHtml = await subPageContext.content();
            
            // Basic link rewriting for subpage
            for (const [originalUrl, localPath] of Array.from(downloadedAssets.entries())) {
              const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              subHtml = subHtml.replace(new RegExp(escapedUrl, 'g'), `./${localPath}`);
            }
            
            fs.writeFileSync(path.join(mirrorDir, `${subPageName}.html`), subHtml);
            await subPageContext.close();
          } catch (err) {
            console.error(`Failed to deep crawl ${link}:`, err);
          }
        }
      } catch (err) {
        console.error('Deep crawl failed:', err);
      }
    }

    await browser.close();

    return NextResponse.json({ 
      success: true, 
      siteId, 
      previewUrl: `/mirrors/${siteId}/index.html`,
      assetsCount: downloadedAssets.size,
      subPagesCount
    });

  } catch (error: any) {
    console.error('Mirroring failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to mirror site' }, { status: 500 });
  }
}
