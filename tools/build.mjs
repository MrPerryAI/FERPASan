// Bundles index.html + css + js into one self-contained file: FERPA-Sanitizer.html
// Usage: node tools/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, p) => `<style>\n${read(p)}</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, p) => `<script>\n${read(p).replace(/<\/script/gi, '<\\/script')}</script>`);
writeFileSync(join(root, 'FERPA-Sanitizer.html'), html);
console.log('Wrote FERPA-Sanitizer.html (' + Math.round(html.length / 1024) + ' KB)');
