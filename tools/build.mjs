// Bundles index.html + css + js (+ fonts) into self-contained single files:
//   FERPA-Sanitizer.html                     Standard Edition
//   FERPA-Sanitizer-FERPA-san-Edition.html   FERPA-san Edition (PC-98 visual novel mascot)
// Usage: node tools/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const MIME = { woff2: 'font/woff2', woff: 'font/woff', png: 'image/png', svg: 'image/svg+xml' };

function inlineCss(path) {
  const dir = dirname(path);
  return read(path).replace(/url\('?(\.\.\/[^')]+)'?\)/g, (_, rel) => {
    const file = join(dir, rel);
    const ext = rel.split('.').pop();
    return `url(data:${MIME[ext]};base64,${readFileSync(join(root, file)).toString('base64')})`;
  });
}

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, p) => `<style>\n${inlineCss(p)}</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, p) => `<script>\n${read(p).replace(/<\/script/gi, '<\\/script')}</script>`);

const editions = {
  'FERPA-Sanitizer.html': html,
  'FERPA-Sanitizer-FERPA-san-Edition.html': html.replace('<html lang="en">', '<html lang="en" data-edition="ferpasan">'),
};
for (const [name, content] of Object.entries(editions)) {
  writeFileSync(join(root, name), content);
  console.log(`Wrote ${name} (${Math.round(content.length / 1024)} KB)`);
}
