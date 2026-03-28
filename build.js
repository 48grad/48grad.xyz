import { readdir, readFile, writeFile, cp } from 'fs/promises';
import { join, relative, extname } from 'path';

const GUIDES_DIR = 'guides';
const SITE_DIR   = 'site';
const OUTPUT     = join(SITE_DIR, 'data.json');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files   = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

async function build() {
  const start = performance.now();

  // 1. Scan all files in guides/
  const allFiles = await walk(GUIDES_DIR);
  const tree     = [];
  const contents = {};

  for (const file of allFiles) {
    const path = relative(GUIDES_DIR, file).replace(/\\/g, '/');
    tree.push({ path, type: 'blob' });
    contents[path] = await readFile(file, 'utf-8');
  }

  // 2. Read README.md + LICENSE from root
  for (const name of ['README.md', 'LICENSE']) {
    try {
      contents[name] = await readFile(name, 'utf-8');
    } catch { /* optional files */ }
  }

  // 3. Sort tree alphabetically
  tree.sort((a, b) => a.path.localeCompare(b.path));

  // 4. Write data.json into site/
  const data = {
    tree,
    contents,
    buildTime: new Date().toISOString(),
    fileCount: tree.length,
  };

  await writeFile(OUTPUT, JSON.stringify(data));

  const ms = (performance.now() - start).toFixed(0);
  console.log(`Built ${tree.length} files → ${OUTPUT} (${ms}ms)`);
}

build().catch(err => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
