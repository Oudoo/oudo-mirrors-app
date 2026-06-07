import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

async function downloadMissingAsset(liveUrl: string, assetName: string, destPath: string): Promise<boolean> {
  try {
    const url = `${liveUrl}/assets/${assetName}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    return true;
  } catch (err) {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { siteId } = await request.json();
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const mirrorDir = path.join(process.cwd(), 'public', 'mirrors', siteId);
    if (!fs.existsSync(mirrorDir)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const metaPath = path.join(mirrorDir, 'metadata.json');
    let metadata: any = {};
    if (fs.existsSync(metaPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch (e) {}
    }

    const liveUrl = metadata.originalUrl;
    if (!liveUrl) {
      return NextResponse.json({ error: 'Original URL is missing. Please edit the Original URL in the Project Details to run Repair Engine.' }, { status: 400 });
    }

    const assetsDir = path.join(mirrorDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      return NextResponse.json({ error: 'Assets directory not found. Nothing to repair.' }, { status: 404 });
    }

    // STEP 1: De-hash filenames (Playwright appends _[hash] to assets, which breaks SPA dynamic imports)
    const renames = new Map<string, string>();
    const allFiles = fs.readdirSync(assetsDir);
    
    for (const file of allFiles) {
      // Matches _[4 to 8 alphanumeric chars].ext
      const match = file.match(/^(.*)_([a-zA-Z0-9]{4,8})(\.[a-zA-Z0-9]+)$/);
      if (match) {
        const newName = `${match[1]}${match[3]}`;
        renames.set(file, newName);
        fs.renameSync(path.join(assetsDir, file), path.join(assetsDir, newName));
      }
    }

    let unhashedFilesCount = renames.size;

    // STEP 1.5: Dependency Crawler (Download missing chunks dynamically)
    let downloadedCount = 0;
    const scannedFiles = new Set<string>();
    let queue = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
    const cleanLiveUrl = liveUrl.replace(/\/$/, '');

    while (queue.length > 0) {
      const currentFile = queue.shift()!;
      if (scannedFiles.has(currentFile)) continue;
      scannedFiles.add(currentFile);

      const filePath = path.join(assetsDir, currentFile);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');

      // Find dynamic chunks: import("./App3D-f554a111.js")
      const chunkPattern = /"\.\/([^"]+\.js)"/g;
      let match;
      while ((match = chunkPattern.exec(content)) !== null) {
        const chunkName = match[1];
        const chunkPath = path.join(assetsDir, chunkName);
        if (!fs.existsSync(chunkPath)) {
          const success = await downloadMissingAsset(cleanLiveUrl, chunkName, chunkPath);
          if (success) {
            downloadedCount++;
            queue.push(chunkName); // Scan newly downloaded chunk
          }
        }
      }

      // Find web workers: new Worker("/assets/worker.js") or new Worker("assets/worker.js")
      const workerPattern = /Worker\(\s*["'](?:\/)?assets\/([^"']+\.js)["']\s*\)/g;
      while ((match = workerPattern.exec(content)) !== null) {
        const workerName = match[1];
        const workerPath = path.join(assetsDir, workerName);
        if (!fs.existsSync(workerPath)) {
          const success = await downloadMissingAsset(cleanLiveUrl, workerName, workerPath);
          if (success) {
            downloadedCount++;
            queue.push(workerName);
          }
        }
      }
    }

    // STEP 2: Patch references in HTML files
    const htmlFiles = fs.readdirSync(mirrorDir).filter(f => f.endsWith('.html'));
    for (const htmlFile of htmlFiles) {
      const htmlPath = path.join(mirrorDir, htmlFile);
      let content = fs.readFileSync(htmlPath, 'utf8');
      let changed = false;
      for (const [oldName, newName] of Array.from(renames.entries())) {
        if (content.includes(oldName)) {
          content = content.split(oldName).join(newName);
          changed = true;
        }
      }
      // Also patch base paths for Vite/React preloaders if they exist
      if (content.includes('crossorigin href="/assets/')) {
        content = content.replaceAll('crossorigin href="/assets/', 'crossorigin href="assets/');
        changed = true;
      }
      if (changed) fs.writeFileSync(htmlPath, content);
    }

    // STEP 3: Patch references in CSS files
    const currentAssets = fs.readdirSync(assetsDir);
    const cssFiles = currentAssets.filter(f => f.endsWith('.css'));
    for (const cssFile of cssFiles) {
      const cssPath = path.join(assetsDir, cssFile);
      let content = fs.readFileSync(cssPath, 'utf8');
      let changed = false;
      for (const [oldName, newName] of Array.from(renames.entries())) {
        if (content.includes(oldName)) {
          content = content.split(oldName).join(newName);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(cssPath, content);
    }

    // STEP 4: JS File modifications (Web Workers, CORS origins, and renamed references)
    const jsFiles = currentAssets.filter(f => f.endsWith('.js'));
    let patchedWorkersCount = 0;
    let patchedCorsCount = 0;

    for (const file of jsFiles) {
      const filePath = path.join(assetsDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      let isModified = false;

      // 1. Patch Web Workers to use relative paths
      const workerPattern1 = 'new Worker("/assets/';
      const workerPattern2 = "new Worker('/assets/";
      
      if (content.includes(workerPattern1) || content.includes(workerPattern2)) {
        content = content.replaceAll(workerPattern1, 'new Worker("assets/');
        content = content.replaceAll(workerPattern2, "new Worker('assets/");
        patchedWorkersCount++;
        isModified = true;
      }

      // 2. Patch absolute paths and CORS using liveUrl
      const cleanLiveUrl = liveUrl.replace(/\/$/, ''); // Remove trailing slash
      
      const corsPattern1 = 'Oe(this,"absolutePath",window.location.origin)';
      const corsReplacement1 = `Oe(this,"absolutePath","${cleanLiveUrl}")`;
      if (content.includes(corsPattern1)) {
        content = content.replaceAll(corsPattern1, corsReplacement1);
        patchedCorsCount++;
        isModified = true;
      }

      const corsPattern2 = 'this.absolutePath=`${window.location.origin}${this.relativePath!==""?`/${this.relativePath}`:""}`';
      const corsReplacement2 = `this.absolutePath=\`${cleanLiveUrl}\${this.relativePath!==""?\`/\${this.relativePath}\`:""}\``;
      if (content.includes(corsPattern2)) {
        content = content.replaceAll(corsPattern2, corsReplacement2);
        patchedCorsCount++;
        isModified = true;
      }
      
      const fallbackPattern = /this\.absolutePath\s*=\s*`\$\{window\.location\.origin\}([^`]*)`/g;
      if (fallbackPattern.test(content)) {
        content = content.replace(fallbackPattern, `this.absolutePath=\`${cleanLiveUrl}$1\``);
        patchedCorsCount++;
        isModified = true;
      }

      const originPattern = 'window.location.origin+"/assets/"';
      const originReplacement = `"${cleanLiveUrl}/assets/"`;
      if (content.includes(originPattern)) {
        content = content.replaceAll(originPattern, originReplacement);
        patchedCorsCount++;
        isModified = true;
      }
      
      // Vite absolute base fix
      const viteBasePattern = 'base:"/assets/"';
      if (content.includes(viteBasePattern)) {
        content = content.replaceAll(viteBasePattern, 'base:"assets/"');
        patchedCorsCount++;
        isModified = true;
      }

      // Check if it referenced old hashed names
      for (const [oldName, newName] of Array.from(renames.entries())) {
        if (content.includes(oldName)) {
          content = content.split(oldName).join(newName);
          isModified = true;
        }
      }

      if (isModified) {
        fs.writeFileSync(filePath, content);
      }
    }

    if (!metadata.repairHistory) {
      metadata.repairHistory = [];
    }

    if (downloadedCount > 0) {
      metadata.assetsCount = (metadata.assetsCount || 0) + downloadedCount;
    }

    const reportMessage = `Ultimate Repair: Unhashed ${unhashedFilesCount} assets. Crawled and auto-downloaded ${downloadedCount} missing dynamic dependencies from the live server. Scanned ${jsFiles.length} JS chunk(s). Patched CORS paths in ${patchedCorsCount} file(s).`;

    metadata.repairHistory.push({
      timestamp: new Date().toISOString(),
      report: reportMessage
    });

    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({ success: true, message: reportMessage, metadata });
  } catch (error: any) {
    console.error('Repair failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to repair project' }, { status: 500 });
  }
}
