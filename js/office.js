/*
 * Reading and rewriting files: Word (.docx), Excel (.xlsx), PowerPoint (.pptx), and plain text/CSV.
 * Office files are ZIPs of XML. We edit the text inside the XML and keep everything else
 * (formatting, images, formulas) exactly as it was.
 */
(function (global) {
  'use strict';

  const { ZipArchive } = global.FZip;
  const { parseCSV } = global.FEngine;

  const TYPES = {
    docx: { kind: 'office', label: 'Word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    docm: { kind: 'office', label: 'Word', mime: 'application/vnd.ms-word.document.macroEnabled.12' },
    dotx: { kind: 'office', label: 'Word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.template' },
    xlsx: { kind: 'office', label: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    xlsm: { kind: 'office', label: 'Excel', mime: 'application/vnd.ms-excel.sheet.macroEnabled.12' },
    pptx: { kind: 'office', label: 'PowerPoint', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    pptm: { kind: 'office', label: 'PowerPoint', mime: 'application/vnd.ms-powerpoint.presentation.macroEnabled.12' },
    txt: { kind: 'text', label: 'Text', mime: 'text/plain' },
    md: { kind: 'text', label: 'Text', mime: 'text/markdown' },
    csv: { kind: 'csv', label: 'CSV', mime: 'text/csv' },
    pdf: { kind: 'text', label: 'PDF', mime: 'text/plain', outExt: 'txt', pdf: true },
    tsv: { kind: 'csv', label: 'CSV', mime: 'text/tab-separated-values' },
  };

  const OLD_FORMATS = {
    doc: 'This is an older Word file. Open it in Word and choose File → Save As → Word Document (.docx), then add it again.',
    xls: 'This is an older Excel file. Open it in Excel and choose File → Save As → Excel Workbook (.xlsx), then add it again.',
    ppt: 'This is an older PowerPoint file. Open it in PowerPoint and choose File → Save As → PowerPoint Presentation (.pptx), then add it again.',
    odt: 'Save this as a Word Document (.docx) first, then add it again.',
    ods: 'Save this as an Excel Workbook (.xlsx) first, then add it again.',
    odp: 'Save this as a PowerPoint Presentation (.pptx) first, then add it again.',
    rtf: 'Open this in Word and Save As .docx (or .txt), then add it again.',
    pages: 'In Pages, choose File → Export To → Word (.docx), then add that file.',
    numbers: 'In Numbers, choose File → Export To → Excel (.xlsx), then add that file.',
    key: 'In Keynote, choose File → Export To → PowerPoint (.pptx), then add that file.',
    gdoc: 'In Google Docs, choose File → Download → Microsoft Word (.docx), then add that file.',
    gsheet: 'In Google Sheets, choose File → Download → Microsoft Excel (.xlsx), then add that file.',
    gslides: 'In Google Slides, choose File → Download → Microsoft PowerPoint (.pptx), then add that file.',
  };

  function extOf(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name);
    return m ? m[1].toLowerCase() : '';
  }

  // ---------- XML helpers ----------

  const RICH = new Set(['t', 'delText', 'instrText']);
  const ANCHORS = new Set(['p', 'si', 'is', 'rPh', 'text']);
  const PLAIN_LEAVES = new Set(['f', 'definedName', 'text', 'lpstr', 'bstr']);
  const ATTRS = new Set(['descr', 'title', 'tooltip', 'author']);
  const XML_NS = 'http://www.w3.org/XML/1998/namespace';

  function parseXml(str) {
    const doc = new DOMParser().parseFromString(str, 'application/xml');
    return doc.getElementsByTagName('parsererror').length ? null : doc;
  }

  function serialize(doc, original) {
    let out = new XMLSerializer().serializeToString(doc);
    const decl = /^\s*<\?xml[^>]*\?>/.exec(original);
    if (decl && !/^\s*<\?xml/.test(out)) out = decl[0] + '\r\n' + out;
    return out;
  }

  const isLeaf = (el) => el.childElementCount === 0;

  /** Group text runs by their paragraph so names split across formatting runs are still found. */
  function textGroups(doc) {
    const groups = new Map();
    const all = doc.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (!RICH.has(el.localName) || !isLeaf(el)) continue;
      let a = el.parentNode;
      while (a && a.nodeType === 1 && !ANCHORS.has(a.localName)) a = a.parentNode;
      const key = a && a.nodeType === 1 ? a : el;
      const gk = el.localName === 'instrText' ? 'i' : 't';
      let byKind = groups.get(key);
      if (!byKind) groups.set(key, (byKind = {}));
      (byKind[gk] = byKind[gk] || []).push(el);
    }
    const out = [];
    for (const byKind of groups.values()) for (const k in byKind) out.push({ nodes: byKind[k], field: k === 'i' });
    return out;
  }

  function plainTargets(doc, partName) {
    const els = [], attrs = [];
    const isProps = /^docProps\//.test(partName);
    const isChart = /charts?\//.test(partName);
    const isPivot = /pivotCache/.test(partName);
    const isWorkbook = /workbook\.xml$/.test(partName);
    const isSheet = /worksheets\/[^/]+\.xml$/.test(partName);
    const all = doc.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const ln = el.localName;
      if (isLeaf(el) && el.textContent) {
        if (isProps && el !== doc.documentElement && (/core\.xml$/.test(partName) || ['lpstr', 'bstr', 'Company', 'Manager'].includes(ln))) els.push(el);
        else if (PLAIN_LEAVES.has(ln) && !RICH.has(ln)) els.push(el);
        else if (ln === 'v' && (isChart || (isSheet && el.parentNode && el.parentNode.getAttribute('t') === 'str'))) els.push(el);
      }
      for (let j = 0; j < el.attributes.length; j++) {
        const at = el.attributes[j];
        const an = at.localName;
        if (ATTRS.has(an) || (isWorkbook && ln === 'sheet' && an === 'name') || (isPivot && ln === 's' && an === 'v')) attrs.push(at);
      }
    }
    return { els, attrs };
  }

  const isXmlPart = (name) => /\.(xml|rels)$/i.test(name) && name !== '[Content_Types].xml' && !/(^|\/)(theme\d*|fontTable|webSettings|styles|stylesWithEffects|numbering)\.xml$/i.test(name);

  // ---------- opening & reading ----------

  async function openFile(file) {
    const ext = extOf(file.name);
    if (OLD_FORMATS[ext]) throw new Error(OLD_FORMATS[ext]);
    const type = TYPES[ext];
    if (!type) throw new Error('This kind of file isn’t supported yet. Try Word (.docx), Excel (.xlsx), PowerPoint (.pptx), or a text/CSV file.');
    const doc = { name: file.name, ext, type, size: file.size };
    if (type.kind === 'office') {
      doc.zip = await ZipArchive.read(await file.arrayBuffer());
      doc.media = doc.zip.names().filter((n) => /\/media\//.test(n) && /\.(png|jpe?g|gif|bmp|tiff?|emf|wmf|svg|webp)$/i.test(n)).length;
      if (!doc.zip.names().some((n) => /^(word|xl|ppt)\//.test(n))) throw new Error('This file looks damaged or isn’t a real Office document.');
    } else {
      doc.text = type.pdf ? await pdfToText(file) : await file.text();
      doc.media = 0;
    }
    doc.corpus = await extract(doc);
    return doc;
  }

  /** PDFs: pull out the text (pdf.js, bundled, runs on this computer). The result is a .txt file. */
  async function pdfToText(file) {
    const lib = global.pdfjsLib;
    if (!lib) throw new Error('PDF reading isn\u2019t included in this copy. Save the PDF as Word (.docx) or text first.');
    let pdf;
    try {
      pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise;
    } catch (err) {
      throw new Error(/password/i.test(err && err.name + err.message) ? 'This PDF is password-protected. Remove the password, then add it again.' : 'This PDF looks damaged and couldn\u2019t be read.');
    }
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const tc = await (await pdf.getPage(n)).getTextContent();
      let text = '';
      for (const it of tc.items) text += (it.str || '') + (it.hasEOL ? '\n' : '');
      pages.push(text.replace(/[ \t]+\n/g, '\n').trim());
    }
    await pdf.destroy();
    const all = pages.join('\n\n');
    if (all.replace(/\s/g, '').length < 20) throw new Error('This PDF is a scanned picture, so there\u2019s no text to read. If you have the original document, add that instead.');
    return all;
  }

  async function extract(doc) {
    const paragraphs = [], tables = [];
    if (doc.type.kind === 'text') {
      paragraphs.push(...doc.text.split(/\r?\n/).filter((l) => l.trim()));
      return { paragraphs, tables };
    }
    if (doc.type.kind === 'csv') {
      const rows = parseCSV(doc.text);
      tables.push(rows);
      for (const r of rows) for (const c of r) if (c && c.trim()) paragraphs.push(c);
      return { paragraphs, tables };
    }
    const zip = doc.zip;
    let shared = [];
    const ss = zip.get('xl/sharedStrings.xml');
    if (ss) {
      const x = parseXml(await ss.text());
      if (x) shared = [...x.getElementsByTagName('*')].filter((e) => e.localName === 'si').map((si) => [...si.getElementsByTagName('*')].filter((e) => e.localName === 't' && e.parentNode.localName !== 'rPh').map((e) => e.textContent).join(''));
    }
    for (const name of zip.names()) {
      if (!isXmlPart(name)) continue;
      const x = parseXml(await zip.get(name).text());
      if (!x) continue;
      for (const g of textGroups(x)) {
        if (g.field) continue;
        const s = g.nodes.map((n) => n.textContent).join('');
        if (s.trim()) paragraphs.push(s);
      }
      const { els, attrs } = plainTargets(x, name);
      for (const el of els) if (el.localName !== 'f' && el.textContent.trim()) paragraphs.push(el.textContent);
      for (const at of attrs) if (at.value.trim() && !/^\d+$/.test(at.value)) paragraphs.push(at.value);

      // Tables in Word/PowerPoint
      for (const tbl of [...x.getElementsByTagName('*')].filter((e) => e.localName === 'tbl')) {
        const rows = [...tbl.children].filter((e) => e.localName === 'tr').map((tr) =>
          [...tr.children].filter((e) => e.localName === 'tc').map((tc) =>
            [...tc.getElementsByTagName('*')].filter((e) => e.localName === 'p').map((p) =>
              [...p.getElementsByTagName('*')].filter((e) => e.localName === 't').map((t) => t.textContent).join('')).join(' ')));
        if (rows.length) tables.push(rows);
      }
      // Excel sheets
      if (/^xl\/worksheets\/[^/]+\.xml$/.test(name)) {
        const grid = [];
        for (const c of [...x.getElementsByTagName('*')].filter((e) => e.localName === 'c')) {
          const ref = c.getAttribute('r') || '';
          const m = /^([A-Z]+)(\d+)$/.exec(ref);
          if (!m) continue;
          const col = m[1].split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
          const row = parseInt(m[2], 10) - 1;
          if (row > 20000 || col > 200) continue;
          const t = c.getAttribute('t');
          const kids = [...c.children];
          const v = kids.find((e) => e.localName === 'v');
          let val = '';
          if (t === 's' && v) val = shared[parseInt(v.textContent, 10)] || '';
          else if (t === 'inlineStr') val = [...c.getElementsByTagName('*')].filter((e) => e.localName === 't').map((e) => e.textContent).join('');
          else if (v && t !== 'b' && t !== 'e') {
            val = v.textContent;
            if ((!t || t === 'n') && /^\d{6,10}$/.test(val) && !kids.some((e) => e.localName === 'f')) paragraphs.push(val);
          }
          (grid[row] = grid[row] || [])[col] = val;
        }
        if (grid.length) tables.push(Array.from(grid, (r) => (r ? Array.from(r, (v) => v || '') : [])));
      }
    }
    return { paragraphs, tables };
  }

  // ---------- rewriting ----------

  function applyToGroup(nodes, matcher) {
    const texts = nodes.map((n) => n.textContent);
    const full = texts.join('');
    const edits = matcher.findEdits(full);
    if (!edits.length) return 0;
    const starts = [];
    let acc = 0;
    for (const t of texts) { starts.push(acc); acc += t.length; }
    const nodeAt = (pos) => {
      let i = starts.length - 1;
      while (i > 0 && starts[i] > pos) i--;
      return i;
    };
    for (let k = edits.length - 1; k >= 0; k--) {
      const { start, end, text } = edits[k];
      const a = nodeAt(start), b = nodeAt(end - 1);
      if (a === b) texts[a] = texts[a].slice(0, start - starts[a]) + text + texts[a].slice(end - starts[a]);
      else {
        texts[a] = texts[a].slice(0, start - starts[a]) + text;
        for (let i = a + 1; i < b; i++) texts[i] = '';
        texts[b] = texts[b].slice(end - starts[b]);
      }
    }
    nodes.forEach((n, i) => {
      if (n.textContent === texts[i]) return;
      n.textContent = texts[i];
      if (n.namespaceURI && /wordprocessingml/.test(n.namespaceURI) && /^\s|\s$/.test(texts[i])) n.setAttributeNS(XML_NS, 'xml:space', 'preserve');
    });
    return edits.length;
  }

  /** Excel: student ID numbers stored as numbers become text cells holding the code. */
  function convertNumericCells(x, matcher) {
    let n = 0;
    for (const c of [...x.getElementsByTagName('*')].filter((e) => e.localName === 'c')) {
      const t = c.getAttribute('t');
      if (t && t !== 'n') continue;
      const kids = [...c.children];
      const v = kids.find((e) => e.localName === 'v');
      if (!v || kids.some((e) => e.localName === 'f')) continue;
      const r = matcher.replace(v.textContent);
      if (!r.edits.length) continue;
      const ns = c.namespaceURI;
      c.removeChild(v);
      c.setAttribute('t', 'inlineStr');
      const is = x.createElementNS(ns, 'is');
      const te = x.createElementNS(ns, 't');
      te.textContent = r.text;
      is.appendChild(te);
      c.appendChild(is);
      n += r.edits.length;
    }
    return n;
  }

  /** Returns { blob, count } — count is how many replacements were made. */
  async function rewrite(doc, matcher, opts) {
    opts = opts || {};
    if (doc.type.kind !== 'office') {
      const r = matcher.replace(doc.text);
      return { blob: new Blob([r.text], { type: doc.type.mime + ';charset=utf-8' }), count: r.edits.length, text: r.text };
    }
    // Work on a fresh copy so the same file can be processed again.
    const zip = await ZipArchive.read(await (await doc.zip.toBlob()).arrayBuffer());
    let count = 0;
    for (const name of zip.names()) {
      if (!isXmlPart(name)) continue;
      const entry = zip.get(name);
      const original = await entry.text();
      let changed = 0;

      if (/\.rels$/i.test(name)) {
        const x = parseXml(original);
        if (!x) continue;
        for (const el of [...x.getElementsByTagName('*')]) {
          const tg = el.getAttribute('Target');
          if (tg && /^mailto:/i.test(tg)) {
            const dec = decodeURIComponent(tg);
            const r = matcher.replace(dec);
            if (r.edits.length) { el.setAttribute('Target', r.text); changed += r.edits.length; }
          }
        }
        if (changed) { entry.setText(serialize(x, original)); count += changed; }
        continue;
      }

      const x = parseXml(original);
      if (!x) continue;
      for (const g of textGroups(x)) changed += applyToGroup(g.nodes, matcher);
      const { els, attrs } = plainTargets(x, name);
      for (const el of els) {
        const r = matcher.replace(el.textContent);
        if (r.edits.length) { el.textContent = r.text; changed += r.edits.length; }
      }
      for (const at of attrs) {
        const r = matcher.replace(at.value);
        if (!r.edits.length) continue;
        at.value = at.localName === 'name' ? r.text.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) : r.text;
        changed += r.edits.length;
      }
      if (/^xl\/worksheets\/[^/]+\.xml$/.test(name)) changed += convertNumericCells(x, matcher);
      if (opts.scrubAuthor && name === 'docProps/core.xml') {
        for (const el of [...x.getElementsByTagName('*')]) if (['creator', 'lastModifiedBy'].includes(el.localName) && el.textContent) { el.textContent = ''; changed++; }
      }
      if (changed) { entry.setText(serialize(x, original)); count += changed; }
    }
    return { blob: await zip.toBlob(doc.type.mime), count };
  }

  function outputName(name, suffix, newExt) {
    const ext = extOf(name);
    const base = ext ? name.slice(0, -(ext.length + 1)) : name;
    return base + '-' + suffix + (newExt || ext ? '.' + (newExt || ext) : '');
  }

  global.FOffice = { openFile, rewrite, outputName, extOf, TYPES, OLD_FORMATS };
})(typeof window !== 'undefined' ? window : globalThis);
