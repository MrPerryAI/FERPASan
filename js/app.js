/*
 * The screens: add files → check names → download. Plus "Put names back".
 */
(function () {
  'use strict';

  const E = window.FEngine, O = window.FOffice, { ZipArchive } = window.FZip;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = {
    files: [], // { id, file, doc, status: 'loading'|'ready'|'error', error }
    keyRows: null,
    keyName: '',
    book: null,
    people: [],
    contacts: [],
    off: new Set(), // ids the teacher unchecked
    results: [],
    outKeyRows: null,
    keyDownloaded: false,
    restoreRows: null,
  };
  let fileSeq = 0;

  // ---------- small UI helpers ----------

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function busy(msg) {
    $('busy-text').textContent = msg || 'Working…';
    $('busy').hidden = !msg;
  }

  const nextFrame = () => new Promise((r) => setTimeout(r, 30));

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function fileIcon(name, bad) {
    const ext = O.extOf(name);
    const t = O.TYPES[ext];
    const cls = bad ? 'bad' : !t ? 'text' : t.label === 'Word' ? 'word' : t.label === 'Excel' ? 'excel' : t.label === 'PowerPoint' ? 'ppt' : 'text';
    const letter = bad ? '!' : { word: 'W', excel: 'X', ppt: 'P', text: 'T' }[cls];
    return `<span class="ficon ${cls}" aria-hidden="true">${letter}</span>`;
  }

  function prettySize(n) {
    return n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  }

  function wireDropzone(zone, input, onFiles) {
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-over'); }));
    zone.addEventListener('drop', (e) => onFiles([...e.dataTransfer.files]));
    input.addEventListener('change', () => { onFiles([...input.files]); input.value = ''; });
  }
  // Don't let a missed drop open the file in the browser tab.
  ['dragover', 'drop'].forEach((ev) => window.addEventListener(ev, (e) => e.preventDefault()));

  // ---------- tabs ----------

  function showMode(mode) {
    const hide = mode === 'hide';
    $('tab-hide').setAttribute('aria-selected', hide);
    $('tab-restore').setAttribute('aria-selected', !hide);
    $('tab-hide').tabIndex = hide ? 0 : -1;
    $('tab-restore').tabIndex = hide ? -1 : 0;
    $('panel-hide').hidden = !hide;
    $('panel-restore').hidden = hide;
    if (!hide) syncRestoreKey();
  }
  $('tab-hide').onclick = () => showMode('hide');
  $('tab-restore').onclick = () => showMode('restore');
  document.querySelector('.mode-switch').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const toRestore = $('tab-hide').getAttribute('aria-selected') === 'true';
    showMode(toRestore ? 'restore' : 'hide');
    $(toRestore ? 'tab-restore' : 'tab-hide').focus();
  });

  function showStep(n) {
    for (let i = 1; i <= 3; i++) $('step-' + i).hidden = i !== n;
    document.querySelectorAll('.stepper li').forEach((li) => {
      const s = +li.dataset.step;
      li.classList.toggle('is-current', s === n);
      li.classList.toggle('is-done', s < n);
      if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- step 1: files ----------

  async function addFiles(files) {
    for (const file of files) {
      const item = { id: ++fileSeq, file, status: 'loading' };
      state.files.push(item);
      renderFiles();
      try {
        item.doc = await O.openFile(file);
        item.status = 'ready';
      } catch (err) {
        item.status = 'error';
        item.error = err.message || String(err);
      }
      renderFiles();
    }
  }

  function renderFiles() {
    $('file-list').innerHTML = state.files.map((f) => {
      const bad = f.status === 'error';
      const sub = f.status === 'loading' ? 'Reading…' : bad ? esc(f.error) : `${O.TYPES[f.doc.ext].label} · ${prettySize(f.file.size)} · ready`;
      return `<li class="file ${bad ? 'is-error' : ''}">${fileIcon(f.file.name, bad)}
        <div class="fmeta"><div class="fname">${esc(f.file.name)}</div><div class="fsub">${sub}</div></div>
        <button class="icon-btn" data-remove="${f.id}" aria-label="Remove ${esc(f.file.name)}" title="Remove">✕</button></li>`;
    }).join('');
    const ready = state.files.filter((f) => f.status === 'ready').length;
    const loading = state.files.some((f) => f.status === 'loading');
    $('btn-find').disabled = !ready || loading;
    $('step1-hint').textContent = loading ? 'Reading your files…' : ready ? `${ready} file${ready > 1 ? 's' : ''} ready.` : 'Add at least one file to continue.';
    $('sample-hint').hidden = state.files.length > 0;
  }

  $('file-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove]');
    if (!b) return;
    state.files = state.files.filter((f) => f.id !== +b.dataset.remove);
    renderFiles();
  });

  wireDropzone($('dropzone'), $('file-input'), addFiles);

  $('try-sample').onclick = () => {
    const text = [
      'Period 3 — Writing conference notes',
      '',
      "Emma Johnson: Strong thesis. Emma's evidence in paragraph 2 needs a citation.",
      'Liam Okafor was absent Tuesday. Mrs. Okafor called (610-555-0142) and will help him catch up.',
      'Sofia Martinez and Noah worked together. Sofia led the discussion; Noah took notes.',
      'Follow up with Johnson, Emma about her late work. Parent email: emma.johnson.parent@example.org',
      'Student ID for Xiomara Delgado is 20451877. Xiomara wants to retake the quiz in May.',
    ].join('\n');
    addFiles([new File([text], 'Sample conference notes.txt', { type: 'text/plain' })]);
  };

  async function loadKeyFile(file, statusEl) {
    try {
      const rows = E.parseKeyCSV(await file.text());
      statusEl.textContent = `✓ Loaded “${file.name}” — ${rows.filter((r) => /^person/i.test(r.type)).length} people.`;
      return rows;
    } catch (err) {
      statusEl.textContent = '⚠ ' + (err.message || 'Could not read that key.');
      return null;
    }
  }

  $('key-input').addEventListener('change', async () => {
    const f = $('key-input').files[0];
    $('key-input').value = '';
    if (!f) return;
    const rows = await loadKeyFile(f, $('key-status'));
    if (rows) { state.keyRows = rows; state.keyName = f.name; }
  });

  const opts = () => ({ emails: $('opt-emails').checked, phones: $('opt-phones').checked, ids: $('opt-ids').checked });

  $('btn-find').onclick = async () => {
    busy('Looking for names…');
    await nextFrame();
    try {
      const docs = state.files.filter((f) => f.status === 'ready').map((f) => f.doc);
      const corpus = { paragraphs: docs.flatMap((d) => d.corpus.paragraphs), tables: docs.flatMap((d) => d.corpus.tables) };
      state.corpus = corpus;
      const book = state.keyRows ? E.AliasBook.fromKeyRows(state.keyRows) : new E.AliasBook();
      for (const p of corpus.paragraphs) for (const w of p.toLowerCase().match(/\p{L}+/gu) || []) book.avoid.add(w);
      state.book = book;
      const found = E.detect(corpus, $('roster').value, state.keyRows ? book : null, opts());
      state.people = found.people;
      state.contacts = found.contacts;
      state.off = new Set(found.people.filter((p) => p.confidence === 'maybe').map((p) => p.id));
      for (const p of state.people) book.aliasFor(p);
      renderReview();
      showStep(2);
    } catch (err) {
      console.error(err);
      toast('Something went wrong: ' + err.message);
    } finally {
      busy(null);
    }
  };

  // ---------- step 2: review ----------

  const SOURCE_TAGS = {
    roster: ['tag-roster', 'Class list'],
    key: ['tag-key', 'From key'],
    column: ['tag-column', 'Name column'],
    text: ['tag-text', 'Found in text'],
    manual: ['tag-manual', 'Added by you'],
  };

  function ctxHtml(c) {
    return c ? `<div class="ctx">${esc(c.before)}<mark>${esc(c.hit)}</mark>${esc(c.after)}</div>` : '';
  }

  function personRow(p) {
    const on = !state.off.has(p.id);
    const src = ['roster', 'key', 'manual', 'column', 'text'].filter((s) => p.sources.has(s));
    const tags = src.slice(0, 2).map((s) => `<span class="tag ${SOURCE_TAGS[s][0]}">${SOURCE_TAGS[s][1]}</span>`).join('');
    const check = p.confidence === 'check' ? '<span class="tag tag-check" title="This is also an everyday word. Make sure it\'s a person.">Double-check</span>' : '';
    const mentions = p.count ? `${p.count} mention${p.count > 1 ? 's' : ''}` : 'not seen in files';
    const name = E.displayName(p);
    return `<div class="row ${on ? '' : 'is-off'}" data-id="${p.id}" data-filter="${esc(name.toLowerCase())}">
      <input type="checkbox" ${on ? 'checked' : ''} aria-label="Hide ${esc(name)}" data-toggle="${p.id}">
      <div class="who"><div class="real-line"><span class="real">${esc(name)}</span>${tags}${check}<span class="mentions">${mentions}</span></div>${ctxHtml(p.contexts[0])}</div>
      <div class="alias-wrap"><span class="arrow" aria-hidden="true">→</span><span class="alias"><span class="alias-text">${esc(state.book.aliasFor(p))}</span></span>
        <button class="icon-btn" data-reroll="${p.id}" title="Pick a different code name" aria-label="New code name for ${esc(name)}">🎲</button></div>
    </div>`;
  }

  function contactRow(c) {
    const on = !state.off.has(c.id);
    const preview = c.kind === 'Email' ? 'fake email' : c.kind === 'Phone' ? '555-555-01xx' : 'ID-0xx';
    return `<div class="row ${on ? '' : 'is-off'}" data-id="${c.id}" data-filter="${esc(c.value.toLowerCase())}">
      <input type="checkbox" ${on ? 'checked' : ''} aria-label="Hide ${esc(c.value)}" data-toggle="${c.id}">
      <div class="who"><div class="real-line"><span class="real">${esc(c.value)}</span><span class="tag tag-text">${c.kind}</span><span class="mentions">${c.count} mention${c.count > 1 ? 's' : ''}</span></div>${ctxHtml(c.contexts[0])}</div>
      <div class="alias-wrap"><span class="arrow" aria-hidden="true">→</span><span class="alias"><span class="alias-text">${preview}</span></span></div>
    </div>`;
  }

  function group(title, desc, rows, cls) {
    if (!rows.length) return '';
    return `<div class="group ${cls || ''}"><div class="group-head"><h3>${title} <span class="g-count">${rows.length}</span></h3>
      <button class="link-btn" data-all="${cls || 'people'}">Select all</button></div>
      ${desc ? `<p class="group-desc">${desc}</p>` : ''}<div class="rows">${rows.join('')}</div></div>`;
  }

  function renderReview() {
    const sure = state.people.filter((p) => p.confidence !== 'maybe');
    const maybe = state.people.filter((p) => p.confidence === 'maybe');
    const nFiles = state.files.filter((f) => f.status === 'ready').length;
    const on = state.people.filter((p) => !state.off.has(p.id)).length;
    $('review-summary').innerHTML = state.people.length || state.contacts.length
      ? `We found <strong>${state.people.length} name${state.people.length === 1 ? '' : 's'}</strong>${state.contacts.length ? ` and <strong>${state.contacts.length} contact detail${state.contacts.length === 1 ? '' : 's'}</strong>` : ''} in ${nFiles} file${nFiles > 1 ? 's' : ''}. <strong>${on}</strong> will be hidden. Uncheck anything that isn't a person.`
      : "We didn't find any names. If your files do have names, paste your class list on the first screen, or add names below.";
    $('groups').innerHTML =
      (sure.length ? group('People', '', sure.map(personRow), 'people') : '') +
      group('Might be names — please check', 'These are also everyday words (like “Will” or “Grace”). Check the ones that are people.', maybe.map(personRow), 'maybe') +
      group('Emails, phone numbers &amp; IDs', '', state.contacts.map(contactRow), 'contacts') +
      (!state.people.length && !state.contacts.length ? '<div class="empty">No names found yet.</div>' : '');
    applyFilter();
  }

  function applyFilter() {
    const q = $('filter').value.trim().toLowerCase();
    document.querySelectorAll('#groups .row').forEach((r) => { r.hidden = q && !r.dataset.filter.includes(q); });
  }
  $('filter').addEventListener('input', applyFilter);

  $('groups').addEventListener('change', (e) => {
    const id = e.target.dataset.toggle;
    if (!id) return;
    if (e.target.checked) state.off.delete(id); else state.off.add(id);
    e.target.closest('.row').classList.toggle('is-off', !e.target.checked);
    const on = state.people.filter((p) => !state.off.has(p.id)).length;
    const strongs = $('review-summary').querySelectorAll('strong');
    if (strongs.length) strongs[strongs.length - 1].textContent = on;
  });

  $('groups').addEventListener('click', (e) => {
    const r = e.target.closest('[data-reroll]');
    if (r) {
      const p = state.people.find((x) => x.id === r.dataset.reroll);
      state.book.reroll(p);
      for (const q of state.people) state.book.aliasFor(q);
      renderReview();
      toast('New code name: ' + state.book.aliasFor(p));
      return;
    }
    const all = e.target.closest('[data-all]');
    if (all) {
      const g = all.dataset.all;
      const list = g === 'contacts' ? state.contacts : state.people.filter((p) => (g === 'maybe') === (p.confidence === 'maybe'));
      const allOn = list.every((x) => !state.off.has(x.id));
      list.forEach((x) => (allOn ? state.off.add(x.id) : state.off.delete(x.id)));
      renderReview();
    }
  });

  function addManualName(raw) {
    const parsed = E.parseName(raw);
    if (!parsed) return false;
    const exists = state.people.find((p) => E.norm(p.first || '') === E.norm(parsed.first) && E.norm(p.last || '') === E.norm(parsed.last || ''));
    if (exists) { state.off.delete(exists.id); return exists; }
    const p = { id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6), ...parsed, middles: parsed.middles || [], title: null, sources: new Set(['manual']), confidence: 'high', count: 0, contexts: [] };
    const m = new E.Matcher(E.personForms(p).map((f) => ({ ...f, replace: '' })));
    for (const para of state.corpus.paragraphs) for (const ed of m.findEdits(para)) {
      p.count++;
      if (p.contexts.length < 2) p.contexts.push(E.contextAround(para, ed.start, ed.end));
    }
    state.people.unshift(p);
    state.book.aliasFor(p);
    return p;
  }

  $('add-name').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('add-name-input').value.trim();
    if (!v) return;
    const p = addManualName(v);
    if (!p) { toast("That doesn't look like a name."); return; }
    $('add-name-input').value = '';
    renderReview();
    toast(p.count ? `Added ${E.displayName(p)} (${p.count} mention${p.count > 1 ? 's' : ''}).` : `Added ${E.displayName(p)}. Not seen in your files, but it'll be hidden if it appears.`);
  });

  $('btn-back-1').onclick = () => showStep(1);

  // ---------- step 3: create files ----------

  async function run() {
    const people = state.people.filter((p) => !state.off.has(p.id));
    const contacts = state.contacts.filter((c) => !state.off.has(c.id));
    if (!people.length && !contacts.length) { toast('Nothing is checked. Check at least one name.'); return; }
    busy('Swapping in code names…');
    await nextFrame();
    try {
      const plan = E.buildSanitizePlan(people, contacts, state.book);
      state.outKeyRows = plan.keyRows;
      state.keyDownloaded = false;
      state.results = [];
      for (const f of state.files.filter((x) => x.status === 'ready')) {
        const { blob, count } = await O.rewrite(f.doc, plan.matcher, { scrubAuthor: $('opt-author').checked });
        state.results.push({ name: O.outputName(f.doc.name, 'sanitized'), blob, count, media: f.doc.media });
      }
      await leftoverCheck(people);
      renderResults();
      showStep(3);
    } catch (err) {
      console.error(err);
      toast('Something went wrong: ' + err.message);
    } finally {
      busy(null);
    }
  }
  $('btn-run').onclick = run;

  /** Re-read the finished files and look for anything that still looks like a name. */
  async function leftoverCheck(people) {
    const aliasWords = new Set();
    for (const r of state.outKeyRows) for (const w of r.code.toLowerCase().match(/\p{L}+/gu) || []) aliasWords.add(w);
    const declined = new Set(state.people.filter((p) => state.off.has(p.id)).map((p) => E.norm(E.displayName(p))));
    const found = [];
    for (const r of state.results) {
      try {
        const doc = await O.openFile(new File([r.blob], r.name));
        const d = E.detect(doc.corpus, '', null, { emails: false, phones: false, ids: false });
        for (const p of d.people) {
          if (p.confidence === 'maybe') continue;
          const words = [p.first, p.last].filter(Boolean).flatMap((x) => x.toLowerCase().match(/\p{L}+/gu) || []);
          if (words.some((w) => aliasWords.has(w))) continue;
          const n = E.displayName(p);
          if (declined.has(E.norm(n)) || found.includes(n)) continue;
          found.push(n);
        }
      } catch (e) { /* the check is a bonus; never block the download */ }
    }
    state.leftovers = found;
  }

  function renderResults() {
    const total = state.results.reduce((n, r) => n + r.count, 0);
    const people = state.outKeyRows.filter((r) => r.type === 'Person').length;
    $('done-summary').textContent = `We made ${total} replacement${total === 1 ? '' : 's'} for ${people} ${people === 1 ? 'person' : 'people'} across ${state.results.length} file${state.results.length > 1 ? 's' : ''}.`;
    $('out-list').innerHTML = state.results.map((r, i) => `<li class="file">${fileIcon(r.name)}
      <div class="fmeta"><div class="fname">${esc(r.name)}</div><div class="fsub">${r.count} replacement${r.count === 1 ? '' : 's'}</div>
      ${r.media ? `<div class="pic-note">⚠ Has ${r.media} picture${r.media > 1 ? 's' : ''} — check them for names yourself.</div>` : ''}</div>
      <button class="btn btn-primary" data-dl="${i}">Download</button></li>`).join('');
    $('btn-zip').hidden = $('zip-note').hidden = state.results.length < 2;
    $('pics-tip').hidden = !state.results.some((r) => r.media);
    $('key-table').querySelector('tbody').innerHTML = state.outKeyRows.filter((r) => r.type !== 'First name' && r.type !== 'Last name')
      .map((r) => `<tr><td>${esc(r.real)}</td><td>${esc(r.code)}</td></tr>`).join('');
    const lo = state.leftovers || [];
    $('leftover-card').hidden = !lo.length;
    $('leftovers').innerHTML = lo.map((n) => `<span class="alias">${esc(n)}</span>`).join('');
  }

  $('out-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dl]');
    if (b) { const r = state.results[+b.dataset.dl]; download(r.blob, r.name); }
  });

  $('btn-zip').onclick = async () => {
    const files = await Promise.all(state.results.map(async (r) => ({ name: r.name, data: new Uint8Array(await r.blob.arrayBuffer()) })));
    download(await ZipArchive.fromFiles(files).toBlob('application/zip'), 'sanitized-files.zip');
  };

  function keyFileName() {
    const d = new Date();
    const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return `FERPA-${stamp}-KEY.csv`;
  }

  $('btn-key').onclick = () => {
    download(new Blob([E.keyToCSV(state.outKeyRows)], { type: 'text/csv;charset=utf-8' }), keyFileName());
    state.keyDownloaded = true;
    toast('Key saved. Keep it private — never upload it to AI.');
  };

  $('btn-print-key').onclick = () => {
    const rows = state.outKeyRows.filter((r) => r.type !== 'First name' && r.type !== 'Last name');
    const w = window.open('', '_blank');
    if (!w) { toast('Please allow pop-ups to print the key.'); return; }
    w.document.write(`<!doctype html><title>FERPA Key</title><style>body{font:14px system-ui,sans-serif;margin:32px}h1{font-size:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:6px 10px;text-align:left}p{color:#a33}</style>
      <h1>FERPA Sanitizer key — ${esc(new Date().toLocaleDateString())}</h1><p>PRIVATE: contains real student names. Do not share or upload.</p>
      <table><tr><th>Real</th><th>Code name</th></tr>${rows.map((r) => `<tr><td>${esc(r.real)}</td><td>${esc(r.code)}</td></tr>`).join('')}</table>`);
    w.document.close();
    w.focus();
    w.print();
    state.keyDownloaded = true;
  };

  $('btn-fix-leftovers').onclick = () => {
    for (const n of state.leftovers || []) addManualName(n);
    renderReview();
    showStep(2);
    toast('Added. Check the list, then hide names again.');
  };

  $('btn-back-2').onclick = () => showStep(2);
  $('go-restore').onclick = () => showMode('restore');

  $('btn-restart').onclick = () => {
    if (!state.keyDownloaded && !confirm("You haven't saved the key. Without it you can't put names back. Start over anyway?")) return;
    state.files = [];
    state.people = [];
    state.contacts = [];
    state.results = [];
    renderFiles();
    showStep(1);
  };

  window.addEventListener('beforeunload', (e) => {
    if (state.results.length && !state.keyDownloaded) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- put names back ----------

  let restoreMode = 'text';

  function syncRestoreKey() {
    const fromSession = !!state.outKeyRows && (!state.restoreRows || state.restoreRows === state.outKeyRows);
    if (fromSession) state.restoreRows = state.outKeyRows;
    $('r-key-session').hidden = !fromSession;
    if (fromSession) $('r-key-session-text').textContent = `Using the key you just made (${state.outKeyRows.filter((r) => r.type === 'Person').length} people). Or drop a different key below.`;
    updateRestore();
  }

  wireDropzone($('r-key-drop'), $('r-key-input'), async (files) => {
    if (!files[0]) return;
    const rows = await loadKeyFile(files[0], $('r-key-status'));
    if (rows) { state.restoreRows = rows; $('r-key-session').hidden = true; updateRestore(); }
  });

  function setRestoreMode(m) {
    restoreMode = m;
    $('r-seg-text').setAttribute('aria-selected', m === 'text');
    $('r-seg-file').setAttribute('aria-selected', m === 'file');
    $('r-text-wrap').hidden = m !== 'text';
    $('r-file-wrap').hidden = m !== 'file';
    updateRestore();
  }
  $('r-seg-text').onclick = () => setRestoreMode('text');
  $('r-seg-file').onclick = () => setRestoreMode('file');

  function updateRestore() {
    const text = $('r-input').value;
    const card = $('r-output-card');
    if (restoreMode !== 'text' || !text.trim()) { card.hidden = true; return; }
    card.hidden = false;
    if (!state.restoreRows) {
      $('r-output').innerHTML = '<span class="hint">Add your key (step 1) to see real names here.</span>';
      $('r-count').textContent = '';
      return;
    }
    const m = E.buildRestoreMatcher(state.restoreRows);
    const edits = m.findEdits(text);
    let html = '', last = 0;
    for (const ed of edits) {
      html += esc(text.slice(last, ed.start)) + `<mark title="was “${esc(text.slice(ed.start, ed.end))}”">${esc(ed.text)}</mark>`;
      last = ed.end;
    }
    $('r-output').innerHTML = html + esc(text.slice(last));
    $('r-count').textContent = `${edits.length} name${edits.length === 1 ? '' : 's'} put back`;
    state.restoredText = m.replace(text).text;
  }
  $('r-input').addEventListener('input', updateRestore);

  $('r-copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(state.restoredText || '');
      toast('Copied! Paste it anywhere.');
    } catch (e) {
      const r = document.createRange();
      r.selectNodeContents($('r-output'));
      getSelection().removeAllRanges();
      getSelection().addRange(r);
      toast('Press Ctrl+C (or ⌘C) to copy.');
    }
  };
  $('r-download').onclick = () => download(new Blob([state.restoredText || ''], { type: 'text/plain;charset=utf-8' }), 'AI-response-restored.txt');

  wireDropzone($('r-file-drop'), $('r-file-input'), async (files) => {
    if (!state.restoreRows) { toast('Add your key first (step 1).'); return; }
    const m = E.buildRestoreMatcher(state.restoreRows);
    for (const file of files) {
      const li = document.createElement('li');
      li.className = 'file';
      li.innerHTML = `${fileIcon(file.name)}<div class="fmeta"><div class="fname">${esc(file.name)}</div><div class="fsub">Working…</div></div>`;
      $('r-file-list').appendChild(li);
      try {
        const doc = await O.openFile(file);
        const { blob, count } = await O.rewrite(doc, m, {});
        const name = O.outputName(file.name.replace(/-sanitized(?=\.[^.]+$)/, ''), 'restored');
        li.querySelector('.fname').textContent = name;
        li.querySelector('.fsub').textContent = `${count} name${count === 1 ? '' : 's'} put back`;
        const b = document.createElement('button');
        b.className = 'btn btn-primary';
        b.textContent = 'Download';
        b.onclick = () => download(blob, name);
        li.appendChild(b);
      } catch (err) {
        li.classList.add('is-error');
        li.querySelector('.fsub').textContent = err.message;
      }
    }
  });

  renderFiles();
})();
