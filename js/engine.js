/*
 * Core logic: find names, invent code names, build find-and-replace rules, and read/write the key.
 * Pure JavaScript, no network.
 */
(function (global) {
  'use strict';

  const { FIRST_NAMES, COMMON_WORD_NAMES, NOT_NAMES, HONORIFICS, ADJECTIVES, CREATURES } = global.FNames;

  // ---------- text helpers ----------

  const APOS = /[‘’ʼ`´]/g;
  const DASH = /[‐‑‒–]/g;
  const SPACE = /[\s   ]+/g;

  function norm(s) {
    return String(s).normalize('NFC').replace(APOS, "'").replace(DASH, '-').replace(SPACE, ' ').trim().toLowerCase();
  }

  function tidy(s) {
    return String(s).normalize('NFC').replace(APOS, "'").replace(SPACE, ' ').trim();
  }

  const isUpper = (s) => s === s.toUpperCase() && s !== s.toLowerCase();
  const isCap = (s) => /^\p{Lu}/u.test(s);

  function randInt(n) {
    const a = new Uint32Array(1);
    (global.crypto || globalThis.crypto).getRandomValues(a);
    return a[0] % n;
  }
  const pick = (arr) => arr[randInt(arr.length)];

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Turn a literal like "O'Brien  Mary-Kate" into a pattern tolerant of curly quotes,
  // non-breaking spaces, and different hyphens (all common in Word documents).
  function flexPattern(literal) {
    return tidy(literal)
      .split('')
      .map((ch) => {
        if (ch === ' ') return '[\\s\\u00A0\\u2007\\u202F]+';
        if (ch === "'") return "['\\u2018\\u2019\\u02BC]";
        if (ch === '-') return '[-\\u2010\\u2011\\u2012\\u2013]';
        return escapeRe(ch);
      })
      .join('');
  }

  // ---------- Matcher: one compiled regex for many find-and-replace rules ----------

  /**
   * rules: [{ find, replace, careful, meta }]
   *  - careful: only match when Capitalized or ALL CAPS (for names that are also normal words)
   */
  class Matcher {
    constructor(rules) {
      this.lookup = new Map();
      for (const r of rules) {
        if (!r.find || !tidy(r.find)) continue;
        const k = norm(r.find);
        if (!this.lookup.has(k)) this.lookup.set(k, r);
      }
      const finds = [...this.lookup.values()].map((r) => r.find).sort((a, b) => b.length - a.length);
      this.re = finds.length
        ? new RegExp('(?<![\\p{L}\\p{M}\\p{N}_@])(?<![\\p{L}\\p{N}]\\.)(?:' + finds.map(flexPattern).join('|') + ')(?![\\p{L}\\p{M}\\p{N}_]|@|\\.[\\p{L}\\p{N}])', 'giu')
        : null;
    }

    get size() { return this.lookup.size; }

    /** Returns non-overlapping edits [{start, end, text, rule}] in order. */
    findEdits(str) {
      const out = [];
      if (!this.re || !str) return out;
      const re = this.re;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(str))) {
        const hit = m[0];
        const rule = this.lookup.get(norm(hit));
        if (!rule || (rule.careful && !isCap(hit))) {
          re.lastIndex = m.index + 1;
          continue;
        }
        let text = rule.replace;
        if (hit.length > 1 && isUpper(hit) && /\p{L}{2}/u.test(hit)) text = text.toUpperCase();
        out.push({ start: m.index, end: m.index + hit.length, text, rule });
      }
      return out;
    }

    replace(str) {
      const edits = this.findEdits(str);
      if (!edits.length) return { text: str, edits };
      let res = '', last = 0;
      for (const e of edits) {
        res += str.slice(last, e.start) + e.text;
        last = e.end;
      }
      return { text: res + str.slice(last), edits };
    }
  }

  // ---------- parsing a name ----------

  const SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);
  const PARTICLES = new Set(['de', 'del', 'della', 'der', 'la', 'le', 'van', 'von', 'da', 'di', 'du', 'dos', 'das', 'bin', 'ibn', 'al', 'el', 'st.', 'st', 'ten', 'ter']);
  const NAME_CHARS = /^[\p{L}\p{M}][\p{L}\p{M}'.\- ]*$/u;

  function cleanToken(t) {
    return t.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}.]+$/gu, '').replace(/\.$/, (d) => d);
  }

  /** "Johnson, Emma R." | "Emma Rose Johnson" | "Elizabeth (Liz) Smith" | "Maria de la Cruz" */
  function parseName(raw) {
    let s = tidy(raw);
    if (!s) return null;
    let nick = null;
    s = s.replace(/\(([^)]+)\)|"([^"]+)"|“([^”]+)”/g, (_, a, b, c) => {
      nick = tidy(a || b || c);
      return ' ';
    }).replace(/\s+/g, ' ').trim();

    let first, last = null, middles = [];
    if (s.includes(',')) {
      const [l, ...rest] = s.split(',');
      const restTokens = rest.join(' ').split(' ').map(cleanToken).filter(Boolean).filter((t) => !SUFFIXES.has(t.toLowerCase()));
      last = cleanToken(l.trim());
      if (!restTokens.length) { first = last; last = null; }
      else { first = restTokens[0]; middles = restTokens.slice(1); }
    } else {
      const parts = s.split(/\t| {2,}/).map((p) => p.trim()).filter(Boolean);
      let tokens;
      if (parts.length === 2 && !parts[0].includes(' ') && !parts[1].includes(' ')) {
        // pasted from two spreadsheet columns: guess which one is the first name
        const a = FIRST_NAMES.has(parts[0].toLowerCase()), b = FIRST_NAMES.has(parts[1].toLowerCase());
        tokens = b && !a ? [parts[1], parts[0]] : parts;
      } else tokens = s.split(' ');
      tokens = tokens.map(cleanToken).filter(Boolean).filter((t) => !SUFFIXES.has(t.toLowerCase()));
      if (!tokens.length) return null;
      first = tokens[0];
      if (tokens.length > 1) {
        // gather surname particles: "Maria de la Cruz"
        let li = tokens.length - 1;
        while (li - 1 > 0 && PARTICLES.has(tokens[li - 1].toLowerCase())) li--;
        last = tokens.slice(li).join(' ');
        middles = tokens.slice(1, li);
      }
    }
    if (!first || !NAME_CHARS.test(first)) return null;
    if (last && !NAME_CHARS.test(last)) return null;
    first = first.replace(/\.$/, '');
    if (nick && !NAME_CHARS.test(nick)) nick = null;
    return { first, last, middles, nick };
  }

  function looksLikeName(v) {
    const s = tidy(v);
    if (s.length < 2 || s.length > 60) return false;
    if (!/^[\p{L}\p{M}][\p{L}\p{M}'.\-\s,()"“”]*$/u.test(s)) return false;
    const words = s.split(/[\s,]+/).filter(Boolean);
    if (words.length > 5) return false;
    if (words.every((w) => NOT_NAMES.has(w.toLowerCase().replace(/\.$/, '')))) return false;
    return true;
  }

  // ---------- detection ----------

  let personSeq = 0;

  class Detection {
    constructor() {
      this.people = new Map(); // key -> person
      this.contacts = new Map(); // norm value -> contact
    }

    key(p) { return norm(p.first || '') + '|' + norm(p.last || '') + '|' + (p.title ? 'adult' : ''); }

    addPerson(parsed, source, confidence, extra) {
      if (!parsed) return null;
      const p = { first: parsed.first || null, last: parsed.last || null, middles: parsed.middles || [], nick: parsed.nick || null, ...extra };
      if (p.first && NOT_NAMES.has(p.first.toLowerCase()) && !p.last) return null;
      const k = this.key(p);
      let cur = this.people.get(k);
      if (!cur) {
        cur = { id: 'p' + ++personSeq, first: p.first, last: p.last, middles: [], nick: null, title: p.title || null, sources: new Set(), confidence, count: 0, contexts: [] };
        this.people.set(k, cur);
      }
      for (const m of p.middles) if (!cur.middles.some((x) => norm(x) === norm(m))) cur.middles.push(m);
      if (p.nick && !cur.nick) cur.nick = p.nick;
      cur.sources.add(source);
      const rank = { high: 3, check: 2, maybe: 1 };
      if (rank[confidence] > rank[cur.confidence]) cur.confidence = confidence;
      return cur;
    }

    addContact(kind, value, ctx) {
      const k = norm(value);
      let c = this.contacts.get(k);
      if (!c) {
        c = { id: 'c' + ++personSeq, kind, value: tidy(value), count: 0, contexts: [] };
        this.contacts.set(k, c);
      }
      c.count++;
      if (ctx && c.contexts.length < 2) c.contexts.push(ctx);
    }
  }

  const MONTHS = new Set(['may', 'june', 'april', 'august']);
  const MONTH_PREP = new Set(['in', 'on', 'of', 'since', 'until', 'by', 'during', 'next', 'last', 'this', 'early', 'late', 'mid', 'every', 'through', 'before', 'after', 'from', 'to']);
  const HONOR_RE = new RegExp('^(?:' + HONORIFICS.join('|') + ')$', 'i');
  const WORD_RE = /[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu;

  const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
  const PHONE_RE = /(?<![\d\w])(?:\+?1[\s.\-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.\-])\d{3}[\s.\-]\d{4}(?![\d\w])/g;
  const SSN_RE = /(?<![\d\w\-])\d{3}-\d{2}-\d{4}(?![\d\w\-])/g;
  const ID_RE = /(?<![\d\w\-\/.,])(?:[A-Z]{1,3}-?)?\d{6,10}(?![\d\w\-\/]|[.,]\d)/g;

  function isFirstNameWord(w) {
    const l = w.toLowerCase();
    if (FIRST_NAMES.has(l)) return true;
    if (l.includes('-')) return l.split('-').some((x) => FIRST_NAMES.has(x)); // "Mary-Kate", "Emma-Lee"
    return false;
  }

  function contextAround(text, start, end) {
    const a = Math.max(0, start - 45), b = Math.min(text.length, end + 45);
    return { before: (a > 0 ? '…' : '') + text.slice(a, start), hit: text.slice(start, end), after: text.slice(end, b) + (b < text.length ? '…' : '') };
  }

  /** Scan an ordinary sentence/paragraph for likely names. */
  function scanProse(text, det, knownLasts) {
    const tokens = [];
    let m;
    WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(text))) tokens.push({ w: m[0], s: m.index, e: m.index + m[0].length });
    const base = (t) => t.w.replace(/['’]s$/i, '');
    const gap = (i) => text.slice(tokens[i - 1] ? tokens[i - 1].e : 0, tokens[i].s);
    const plainGap = (i) => /^[  ]+$/.test(gap(i));
    const isSentenceStart = (i) => i === 0 || /[.!?:;•\n"“(•\-–—]\s*$/.test(gap(i)) || /^\s*$/.test(text.slice(0, tokens[i].s));
    const surnameOk = (t) => t && isCap(t.w) && !NOT_NAMES.has(base(t).toLowerCase()) && (!FIRST_NAMES.has(base(t).toLowerCase()) || COMMON_WORD_NAMES.has(base(t).toLowerCase()) || knownLasts.has(norm(base(t))));

    const used = new Set();
    for (let i = 0; i < tokens.length; i++) {
      if (used.has(i)) continue;
      const t = tokens[i];
      const b = base(t);

      // Mr. / Mrs. / Ms. / Dr. + Name
      if (HONOR_RE.test(t.w) && tokens[i + 1] && /^\.?\s+$/.test(gap(i + 1)) && isCap(tokens[i + 1].w)) {
        const n1 = tokens[i + 1], n2 = tokens[i + 2];
        let parsed;
        if (n2 && plainGap(i + 2) && isFirstNameWord(base(n1)) && surnameOk(n2)) { parsed = { first: base(n1), last: base(n2) }; used.add(i + 2); }
        else if (!NOT_NAMES.has(base(n1).toLowerCase())) parsed = { first: null, last: base(n1) };
        if (parsed) {
          det.addPerson(parsed, 'text', 'high', parsed.first ? {} : { title: t.w.replace(/\.$/, '') });
          used.add(i + 1);
          continue;
        }
      }

      if (!isCap(t.w) || !isFirstNameWord(b)) {
        // "Xochitl Johnson": an unknown capitalized word right before a last name we already know
        const n = tokens[i + 1];
        if (isCap(t.w) && n && plainGap(i + 1) && knownLasts.has(norm(base(n))) && !NOT_NAMES.has(b.toLowerCase()) && !isSentenceStart(i) && b.length > 1) {
          det.addPerson({ first: b, last: base(n) }, 'text', 'check');
          used.add(i + 1);
        }
        continue;
      }

      const l = b.toLowerCase();
      const careful = COMMON_WORD_NAMES.has(l);
      const prev = tokens[i - 1] ? tokens[i - 1].w.toLowerCase() : '';
      const nextChar = text.slice(t.e).match(/^\s*(\S)/);
      if (MONTHS.has(l) && (MONTH_PREP.has(prev) || (nextChar && /\d/.test(nextChar[1])))) continue;

      // Look for a last name: "Emma Johnson", "Emma R. Johnson", "Maria de la Cruz"
      let j = i + 1, last = null, middles = [];
      if (tokens[j] && /^[  ]+$/.test(gap(j)) && /^\p{Lu}$/u.test(tokens[j].w) && /^\.\s/.test(text.slice(tokens[j].e, tokens[j].e + 2))) {
        middles.push(tokens[j].w + '.');
        j++;
      }
      let k = j;
      const parts = [];
      while (tokens[k] && plainGap(k) && PARTICLES.has(tokens[k].w.toLowerCase()) && tokens[k + 1] && plainGap(k + 1)) { parts.push(tokens[k].w); k++; }
      if (parts.length && !(tokens[k] && isCap(tokens[k].w))) { k = j; parts.length = 0; }
      if (tokens[k] && (k === j ? plainGap(k) || /^\.\s+$/.test(gap(k)) && middles.length : plainGap(k)) && (parts.length ? isCap(tokens[k].w) : surnameOk(tokens[k]))) {
        last = [...parts, base(tokens[k])].join(' ');
        for (let x = i + 1; x <= k; x++) used.add(x);
      }

      if (last) {
        det.addPerson({ first: b, last, middles }, 'text', 'high');
      } else if (careful) {
        det.addPerson({ first: b, last: null }, 'text', isSentenceStart(i) ? 'maybe' : 'check');
      } else {
        det.addPerson({ first: b, last: null }, 'text', 'high');
      }
    }

    // Whole paragraph is "Johnson, Emma" — classic gradebook/roster format.
    const lf = tidy(text).match(/^([\p{Lu}][\p{L}\p{M}'\-]+(?: [\p{Lu}][\p{L}\p{M}'\-]+)?),\s*([\p{Lu}][\p{L}\p{M}'\-]+)(?:\s+[\p{Lu}]\.?)?$/u);
    if (lf && isFirstNameWord(lf[2]) && !NOT_NAMES.has(lf[1].toLowerCase())) det.addPerson(parseName(lf[0]), 'text', 'high');
  }

  const HDR_FIRST = /\b(first|given|preferred|nick)\s*name\b|^\s*(first|given|preferred)\s*$/i;
  const HDR_LAST = /\b(last|family|sur)\s*name\b|^\s*(surname|last)\s*$/i;
  const HDR_FULL = /\b(student|name|learner|pupil|child|parent|guardian|mother|father|contact|emergency)\b/i;
  const HDR_NOT = /\b(teacher|instructor|staff|course|class|school|assignment|file|user\s*name|username|login|e-?mail|id|number|#|grade|period|section|district|book|title|team|group|sheet|tab|date|score)\b/i;

  /** Spreadsheet/table: use column headers like "Student Name", "First Name", "Last Name". */
  function scanTable(rows, det) {
    for (let h = 0; h < Math.min(rows.length, 5); h++) {
      const hdr = rows[h] || [];
      let fC = -1, lC = -1;
      const fullCols = [];
      hdr.forEach((cell, c) => {
        const v = tidy(cell || '');
        if (!v || v.length > 40) return;
        if (HDR_FIRST.test(v)) fC = c;
        else if (HDR_LAST.test(v)) lC = c;
        else if (HDR_FULL.test(v) && !HDR_NOT.test(v)) fullCols.push(c);
      });
      if (fC < 0 && lC < 0 && !fullCols.length) continue;
      for (let r = h + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        if (fC >= 0 || lC >= 0) {
          const f = fC >= 0 ? tidy(row[fC] || '') : '', l = lC >= 0 ? tidy(row[lC] || '') : '';
          if ((f && looksLikeName(f)) || (l && looksLikeName(l))) {
            const pf = f ? parseName(f) : null;
            det.addPerson({ first: pf ? pf.first : null, last: l || null, middles: pf ? pf.middles : [], nick: pf && pf.nick }, 'column', 'high');
          }
        }
        for (const c of fullCols) {
          const v = row[c];
          if (v && looksLikeName(v)) det.addPerson(parseName(v), 'column', 'high');
        }
      }
      return;
    }
  }

  function scanContacts(text, det, opts) {
    const seen = [];
    const take = (re, kind) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const s = m.index, e = s + m[0].length;
        if (seen.some(([a, b]) => s < b && e > a)) continue;
        seen.push([s, e]);
        det.addContact(kind, m[0], contextAround(text, s, e));
      }
    };
    if (opts.emails) take(EMAIL_RE, 'Email');
    if (opts.phones) take(PHONE_RE, 'Phone');
    if (opts.ids) { take(SSN_RE, 'ID'); take(ID_RE, 'ID'); }
  }

  /**
   * corpus: { paragraphs: string[], tables: string[][][] }
   * roster: string (one name per line)
   * keyBook: AliasBook loaded from an earlier key (its people count as a roster)
   */
  function detect(corpus, roster, keyBook, opts) {
    const det = new Detection();
    for (const line of (roster || '').split(/\r?\n/)) {
      if (!tidy(line) || /^(name|student|students|first|last)\b.*$/i.test(tidy(line)) && !line.includes(',')) continue;
      det.addPerson(parseName(line), 'roster', 'high');
    }
    if (keyBook) {
      for (const p of keyBook.people) {
        const hm = p.match(new RegExp('^(' + HONORIFICS.join('|') + ')\\.?\\s+(.+)$', 'i'));
        if (hm) det.addPerson({ first: null, last: hm[2] }, 'key', 'high', { title: hm[1] });
        else det.addPerson(parseName(p), 'key', 'high');
      }
    }
    for (const rows of corpus.tables) scanTable(rows, det);

    const knownLasts = new Set([...det.people.values()].filter((p) => p.last).map((p) => norm(p.last)));
    for (const para of corpus.paragraphs) scanProse(para, det, knownLasts);
    // second pass picks up "Xochitl Johnson" once Johnson is known from anywhere
    const knownLasts2 = new Set([...det.people.values()].filter((p) => p.last).map((p) => norm(p.last)));
    if (knownLasts2.size > knownLasts.size) for (const para of corpus.paragraphs) scanProse(para, det, knownLasts2);

    for (const para of corpus.paragraphs) scanContacts(para, det, opts);

    // Fold "Emma" into "Emma Johnson" when Emma is only one known person.
    const people = [...det.people.values()];
    const fulls = people.filter((p) => p.first && p.last && !p.title);
    const result = [];
    for (const p of people) {
      if (p.first && !p.last) {
        const owners = fulls.filter((f) => norm(f.first) === norm(p.first) || (f.nick && norm(f.nick) === norm(p.first)));
        if (owners.length) {
          for (const o of owners) for (const s of p.sources) o.sources.add(s);
          continue;
        }
      }
      result.push(p);
    }

    // Count mentions and grab a little context for the review screen.
    const counter = new Matcher(result.flatMap((p) => personForms(p).map((f) => ({ ...f, replace: '', meta: p }))));
    const byFind = new Map();
    for (const p of result) for (const f of personForms(p)) {
      const k = norm(f.find);
      if (!byFind.has(k)) byFind.set(k, []);
      byFind.get(k).push(p);
    }
    for (const para of corpus.paragraphs) {
      for (const e of counter.findEdits(para)) {
        for (const p of byFind.get(norm(para.slice(e.start, e.end))) || [e.rule.meta]) {
          p.count++;
          if (p.contexts.length < 2) p.contexts.push(contextAround(para, e.start, e.end));
        }
      }
    }
    const order = { high: 0, check: 1, maybe: 2 };
    result.sort((a, b) => order[a.confidence] - order[b.confidence] || displayName(a).localeCompare(displayName(b)));
    return { people: result, contacts: [...det.contacts.values()] };
  }

  function displayName(p) {
    if (p.title && !p.first) return p.title + '. ' + p.last;
    return [p.first, p.nick ? '(' + p.nick + ')' : null, ...(p.middles || []), p.last].filter(Boolean).join(' ');
  }

  /** Every way a person might be written, with the token pieces each form contains. */
  function personForms(p) {
    const F = p.first, L = p.last, forms = [];
    const add = (find, kind, careful) => find && forms.push({ find, kind, careful: !!careful });
    const firsts = [F, p.nick].filter(Boolean);
    if (L) {
      for (const f of firsts) {
        add(f + ' ' + L, 'full');
        add(L + ', ' + f, 'lastfirst');
        add(L + ' ' + f, 'lastfirst-nocomma-skip');
        if (p.middles.length) {
          add(f + ' ' + p.middles.join(' ') + ' ' + L, 'full');
          add(L + ', ' + f + ' ' + p.middles.join(' '), 'lastfirst');
          const initials = p.middles.map((m) => m[0] + '.').join(' ');
          add(f + ' ' + initials + ' ' + L, 'full');
          add(L + ', ' + f + ' ' + initials, 'lastfirst');
          add(f + ' ' + initials.replace(/\./g, '') + ' ' + L, 'full');
        }
      }
      add(L, 'last', true);
    }
    for (const f of firsts) add(f, 'first', COMMON_WORD_NAMES.has(f.toLowerCase()));
    return forms.filter((f) => f.kind !== 'lastfirst-nocomma-skip');
  }

  // ---------- code names ----------

  class AliasBook {
    constructor() {
      this.firsts = new Map(); // norm real first -> { real, alias }
      this.lasts = new Map(); // norm real last -> { real, alias }
      this.contacts = new Map(); // norm value -> { kind, real, alias }
      this.people = []; // real full names from an imported key (used as a roster)
      this.avoid = new Set();
      this.counters = { Email: 0, Phone: 0, ID: 0 };
    }

    usedAliases() {
      return new Set([...this.firsts.values(), ...this.lasts.values()].map((v) => norm(v.alias)));
    }

    firstAlias(real) {
      const k = norm(real);
      if (this.firsts.has(k)) return this.firsts.get(k).alias;
      const used = new Set([...this.firsts.values()].map((v) => v.alias));
      const pool = ADJECTIVES.filter((a) => !used.has(a) && !this.avoid.has(a.toLowerCase()) && !FIRST_NAMES.has(a.toLowerCase()));
      let alias = pool.length ? pick(pool) : null;
      while (!alias || used.has(alias)) alias = pick(ADJECTIVES) + pick(ADJECTIVES).toLowerCase();
      this.firsts.set(k, { real: tidy(real), alias });
      return alias;
    }

    lastAlias(real) {
      const k = norm(real);
      if (this.lasts.has(k)) return this.lasts.get(k).alias;
      const used = new Set([...this.lasts.values()].map((v) => v.alias));
      const pool = CREATURES.filter((c) => !this.avoid.has(c.toLowerCase()));
      let alias;
      do alias = pick(pool) + ' ' + (10 + randInt(90)); while (used.has(alias));
      this.lasts.set(k, { real: tidy(real), alias });
      return alias;
    }

    reroll(p) {
      for (const f of [p.first, p.nick].filter(Boolean)) this.firsts.delete(norm(f));
      if (p.last) this.lasts.delete(norm(p.last));
      return this.aliasFor(p);
    }

    aliasFor(p) {
      const parts = [];
      if (p.first) {
        const a = this.firstAlias(p.first);
        if (p.nick && !this.firsts.has(norm(p.nick))) this.firsts.set(norm(p.nick), { real: p.nick, alias: a });
        parts.push(a);
      } else if (p.title) parts.push(p.title + '.');
      if (p.last) parts.push(this.lastAlias(p.last));
      return parts.join(' ');
    }

    contactAlias(c, people) {
      const k = norm(c.value);
      if (this.contacts.has(k)) return this.contacts.get(k).alias;
      let alias;
      if (c.kind === 'Email') {
        const local = norm(c.value.split('@')[0]);
        const owner = people.find((p) => (p.first && local.includes(norm(p.first))) || (p.last && local.includes(norm(p.last).replace(/\s/g, ''))));
        alias = owner
          ? this.aliasFor(owner).toLowerCase().replace(/\./g, '').replace(/\s+(\d+)$/, '$1').replace(/\s+/g, '.') + '@example.com'
          : 'contact' + ++this.counters.Email + '@example.com';
        while ([...this.contacts.values()].some((v) => v.alias === alias)) alias = alias.replace('@', ++this.counters.Email + '@');
      } else if (c.kind === 'Phone') {
        alias = '555-555-01' + String(++this.counters.Phone).padStart(2, '0');
      } else {
        alias = 'ID-' + String(++this.counters.ID).padStart(3, '0');
      }
      this.contacts.set(k, { kind: c.kind, real: c.value, alias });
      return alias;
    }

    // ---- key file (CSV) ----

    static fromKeyRows(rows) {
      const b = new AliasBook();
      for (const r of rows) {
        const type = (r.type || '').toLowerCase();
        if (!r.real || !r.code) continue;
        if (type.startsWith('first')) b.firsts.set(norm(r.real), { real: r.real, alias: r.code });
        else if (type.startsWith('last')) b.lasts.set(norm(r.real), { real: r.real, alias: r.code });
        else if (type.startsWith('person') || type.startsWith('student')) b.people.push(r.real);
        else if (['email', 'phone', 'id'].includes(type)) {
          const kind = type === 'id' ? 'ID' : type[0].toUpperCase() + type.slice(1);
          b.contacts.set(norm(r.real), { kind, real: r.real, alias: r.code });
          const n = parseInt((r.code.match(/(\d+)(?=@|$)/) || [])[1], 10);
          if (n > (b.counters[kind] || 0)) b.counters[kind] = n;
        }
      }
      return b;
    }
  }

  /** Build the forward (hide names) matcher and the key rows from the selections. */
  function buildSanitizePlan(people, contacts, book) {
    const rules = [];
    const keyPeople = [];
    for (const p of people) {
      const full = book.aliasFor(p);
      keyPeople.push({ type: 'Person', real: displayName(p), code: full });
      for (const f of personForms(p)) {
        let replace;
        const fa = p.first ? book.firstAlias(p.first) : null;
        const la = p.last ? book.lastAlias(p.last) : null;
        if (f.kind === 'full') replace = fa + ' ' + la;
        else if (f.kind === 'lastfirst') replace = la + ', ' + fa;
        else if (f.kind === 'last') replace = la;
        else replace = fa;
        rules.push({ find: f.find, replace, careful: f.careful, kind: f.kind });
      }
    }
    // Most specific first so "Emma Johnson" wins over "Emma".
    const prio = { full: 0, lastfirst: 0, first: 1, last: 2 };
    rules.sort((a, b) => prio[a.kind] - prio[b.kind]);
    const keyContacts = [];
    for (const c of contacts) {
      const alias = book.contactAlias(c, people);
      rules.unshift({ find: c.value, replace: alias, careful: false, kind: 'contact' });
      keyContacts.push({ type: c.kind, real: c.value, code: alias });
    }
    const tokenRows = [];
    const usedFirst = new Set(people.flatMap((p) => [p.first, p.nick].filter(Boolean).map(norm)));
    const usedLast = new Set(people.filter((p) => p.last).map((p) => norm(p.last)));
    for (const [k, v] of book.firsts) if (usedFirst.has(k)) tokenRows.push({ type: 'First name', real: v.real, code: v.alias });
    for (const [k, v] of book.lasts) if (usedLast.has(k)) tokenRows.push({ type: 'Last name', real: v.real, code: v.alias });
    return { matcher: new Matcher(rules), keyRows: [...keyPeople, ...tokenRows, ...keyContacts] };
  }

  /** Reverse matcher: code names -> real names, from key rows. */
  function buildRestoreMatcher(rows) {
    const rules = [];
    const persons = rows.filter((r) => /^(person|student)/i.test(r.type));
    for (const r of rows) {
      if (!r.code || !r.real) continue;
      const t = r.type.toLowerCase();
      rules.push({ find: r.code, replace: r.real, careful: t.startsWith('first'), kind: t });
      if (t.startsWith('last')) rules.push({ find: r.code.replace(/\s+(\d+)$/, '$1'), replace: r.real, kind: t }); // "Unicorn45"
      if (t.startsWith('person')) {
        // "Fluffy Unicorn" (AI dropped the number) — only if unambiguous
        const short = r.code.replace(/\s+\d+$/, '');
        if (short !== r.code && persons.filter((x) => x.code.replace(/\s+\d+$/, '') === short).length === 1) rules.push({ find: short, replace: r.real, kind: t });
        const m = r.code.match(/^(\S+) (.+?) (\d+)$/);
        if (m) rules.push({ find: m[1] + ' ' + m[2] + m[3], replace: r.real, kind: t });
      }
    }
    return new Matcher(rules);
  }

  // ---------- CSV ----------

  function csvEscape(v) {
    const s = String(v == null ? '' : v);
    return /[",\r\n]/.test(s) || /^[=+\-@]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',' || ch === '\t') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  const KEY_HEADER = ['Type', 'Real name or info', 'Code name'];

  function keyToCSV(rows) {
    const date = new Date().toLocaleString();
    const lines = [
      '# FERPA Sanitizer KEY - PRIVATE. Contains real student names. Do NOT upload this file to AI tools. Created ' + date,
      KEY_HEADER.join(','),
      ...rows.map((r) => [r.type, r.real, r.code].map(csvEscape).join(',')),
    ];
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  function parseKeyCSV(text) {
    const rows = parseCSV(text).filter((r) => r.length >= 3 && !/^#/.test(r[0]) && !/^type$/i.test(r[0].trim()));
    const out = rows.map((r) => ({ type: r[0].trim(), real: tidy(r[1]), code: tidy(r[2]) })).filter((r) => r.real && r.code);
    if (!out.length) throw new Error("That doesn't look like a FERPA Sanitizer key file.");
    return out;
  }

  global.FEngine = {
    norm, tidy, Matcher, parseName, detect, displayName, personForms, AliasBook,
    buildSanitizePlan, buildRestoreMatcher, keyToCSV, parseKeyCSV, parseCSV, contextAround,
  };
})(typeof window !== 'undefined' ? window : globalThis);
