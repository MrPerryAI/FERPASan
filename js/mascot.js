/*
 * FERPA-san Edition: a PC-98 style visual-novel mascot. Only active when
 * <html data-edition="ferpasan"> (the build makes that file) or with ?edition=ferpasan.
 *
 * The character is vector art (MASCOT_SVG) drawn over a backdrop (BACKDROP_SVG), then shrunk and
 * reduced to a 16-color palette with ordered dithering at runtime, so it looks like a PC-98 CG.
 *
 * Want custom art? Replace MASCOT_SVG (keep the mood groups), or set MASCOT_IMAGES to
 * { happy: 'data:image/png;base64,...', ... } to use your own pictures per mood (also dithered).
 */
(function (global) {
  'use strict';

  const MASCOT_IMAGES = null;

  const MASCOT_SVG = `
<svg class="fs-svg" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="FERPA-san">
  <defs>
    <linearGradient id="fsHair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3cc7b8"/><stop offset="1" stop-color="#127a70"/></linearGradient>
    <linearGradient id="fsHairBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f9c8f"/><stop offset="1" stop-color="#0c5a53"/></linearGradient>
    <linearGradient id="fsIris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a6e"/><stop offset=".55" stop-color="#6d4ae0"/><stop offset="1" stop-color="#c8b6ff"/></linearGradient>
    <linearGradient id="fsBlazer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#36406b"/><stop offset="1" stop-color="#232a4a"/></linearGradient>
    <linearGradient id="fsGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#e0a526"/></linearGradient>
  </defs>

  <!-- back hair -->
  <path d="M46 98C40 52 70 20 100 20s60 32 54 78c4 34 8 66-2 92-10-10-14-34-16-62H64c-2 28-6 52-16 62-10-26-6-58-2-92Z" fill="url(#fsHairBack)"/>
  <!-- side ponytail -->
  <path d="M146 54c22 8 34 30 32 58-2 22-10 40-4 58-16-10-24-30-22-52 2-20-2-38-14-50Z" fill="url(#fsHair)"/>
  <path d="M160 80c6 16 6 34 2 50" fill="none" stroke="#0c5a53" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
  <!-- ribbon on ponytail -->
  <g transform="translate(148 52) rotate(20)">
    <path d="M0 0-14-9-12 9Z" fill="#ff6fa8"/><path d="M0 0 14-9 12 9Z" fill="#ff6fa8"/><circle r="4" fill="#e04a8a"/>
  </g>

  <!-- body -->
  <path d="M36 220c2-34 26-54 56-58h16c30 4 54 24 56 58Z" fill="url(#fsBlazer)"/>
  <path d="M86 162 100 196 114 162Z" fill="#fff"/>
  <path d="M86 162 74 176 92 200 100 196Z M114 162 126 176 108 200 100 196Z" fill="#2c3559"/>
  <!-- neck -->
  <path d="M90 136h20v24c-6 6-14 6-20 0Z" fill="#f6cdb8"/>
  <!-- ribbon tie with key charm -->
  <path d="M100 176 84 168 86 186Z M100 176 116 168 114 186Z" fill="#ff6fa8"/>
  <circle cx="100" cy="176" r="4.5" fill="#e04a8a"/>
  <g class="fs-key" transform="translate(100 182)">
    <path d="M0 0v6" stroke="#e0a526" stroke-width="1.6"/>
    <circle cx="0" cy="11" r="5" fill="none" stroke="url(#fsGold)" stroke-width="3"/>
    <path d="M0 16v14m0-5h5m-5 4h4" stroke="url(#fsGold)" stroke-width="3" stroke-linecap="round"/>
  </g>
  <!-- school crest -->
  <path d="M136 186l10-3 10 3v6c0 6-5 9-10 11-5-2-10-5-10-11Z" fill="#127a70" stroke="#ffe08a" stroke-width="1.5"/>
  <path d="M141 192l3 3 6-6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- face -->
  <path d="M62 94c0 30 18 50 38 58 20-8 38-28 38-58 0-26-18-40-38-40S62 68 62 94Z" fill="#ffe6d6"/>
  <!-- ears -->
  <path d="M62 100c-6-2-8 6-4 12 2 4 5 5 7 4Z M138 100c6-2 8 6 4 12-2 4-5 5-7 4Z" fill="#f6cdb8"/>

  <!-- blush -->
  <g class="fs-blush" fill="#ff8fb4" opacity=".45"><ellipse cx="76" cy="124" rx="8" ry="4.5"/><ellipse cx="124" cy="124" rx="8" ry="4.5"/></g>

  <!-- eyes: open -->
  <g class="fs-eyes fs-eyes-open">
    <g class="fs-eye-l">
      <path d="M70 108c0-9 6-15 13-15s13 6 13 15-6 15-13 15-13-6-13-15Z" fill="#fff"/>
      <ellipse class="fs-iris" cx="83" cy="109" rx="9" ry="12" fill="url(#fsIris)"/>
      <ellipse class="fs-iris" cx="83" cy="110" rx="4" ry="6" fill="#20123f"/>
      <circle class="fs-iris" cx="79.5" cy="104" r="3.4" fill="#fff"/><circle class="fs-iris" cx="87" cy="115" r="1.6" fill="#fff"/>
      <path d="M68 103c4-9 18-13 29-5" fill="none" stroke="#2a1d3d" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M68 103l-4-3" stroke="#2a1d3d" stroke-width="2.4" stroke-linecap="round"/>
    </g>
    <g class="fs-eye-r">
      <path d="M104 108c0-9 6-15 13-15s13 6 13 15-6 15-13 15-13-6-13-15Z" fill="#fff"/>
      <ellipse class="fs-iris" cx="117" cy="109" rx="9" ry="12" fill="url(#fsIris)"/>
      <ellipse class="fs-iris" cx="117" cy="110" rx="4" ry="6" fill="#20123f"/>
      <circle class="fs-iris" cx="113.5" cy="104" r="3.4" fill="#fff"/><circle class="fs-iris" cx="121" cy="115" r="1.6" fill="#fff"/>
      <path d="M132 103c-4-9-18-13-29-5" fill="none" stroke="#2a1d3d" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M132 103l4-3" stroke="#2a1d3d" stroke-width="2.4" stroke-linecap="round"/>
    </g>
  </g>
  <!-- eyes: happy ^ ^ -->
  <g class="fs-eyes fs-eyes-happy" fill="none" stroke="#2a1d3d" stroke-width="3.6" stroke-linecap="round">
    <path d="M72 112c3-9 18-9 22 0"/><path d="M106 112c3-9 18-9 22 0"/>
  </g>
  <!-- eyes: wink -->
  <g class="fs-eyes fs-eyes-wink">
    <path d="M70 108c0-9 6-15 13-15s13 6 13 15-6 15-13 15-13-6-13-15Z" fill="#fff"/>
    <ellipse cx="83" cy="109" rx="9" ry="12" fill="url(#fsIris)"/><ellipse cx="83" cy="110" rx="4" ry="6" fill="#20123f"/>
    <circle cx="79.5" cy="104" r="3.4" fill="#fff"/><circle cx="87" cy="115" r="1.6" fill="#fff"/>
    <path d="M68 103c4-9 18-13 29-5" fill="none" stroke="#2a1d3d" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M106 106l20 4-20 6" fill="none" stroke="#2a1d3d" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <!-- eyes: serious (half-lidded) -->
  <g class="fs-eyes fs-eyes-serious">
    <path d="M70 110c0-6 6-10 13-10s13 4 13 10-6 12-13 12-13-6-13-12Z" fill="#fff"/>
    <ellipse cx="83" cy="111" rx="8.5" ry="10" fill="url(#fsIris)"/><circle cx="83" cy="112" r="4" fill="#20123f"/><circle cx="80" cy="107" r="2.6" fill="#fff"/>
    <path d="M104 110c0-6 6-10 13-10s13 4 13 10-6 12-13 12-13-6-13-12Z" fill="#fff"/>
    <ellipse cx="117" cy="111" rx="8.5" ry="10" fill="url(#fsIris)"/><circle cx="117" cy="112" r="4" fill="#20123f"/><circle cx="114" cy="107" r="2.6" fill="#fff"/>
    <path d="M68 100q14-3 29 3M132 100q-14-3-29 3" fill="none" stroke="#2a1d3d" stroke-width="3.4" stroke-linecap="round"/>
  </g>

  <!-- eyebrows -->
  <g class="fs-brows" fill="none" stroke="#0c5a53" stroke-width="2.2" stroke-linecap="round">
    <path class="fs-brow-n" d="M74 88q9-4 17 0M109 88q8-4 17 0"/>
    <path class="fs-brow-worry" d="M74 86q9 0 17 4M109 90q8-4 17-4"/>
    <path class="fs-brow-serious" d="M74 86q9 2 17 6M109 92q8-4 17-6"/>
  </g>

  <!-- nose -->
  <path d="M99 121l2 2" stroke="#e0a58e" stroke-width="1.6" stroke-linecap="round"/>

  <!-- mouths -->
  <path class="fs-mouth fs-mouth-smile" d="M93 131q7 6 14 0" fill="none" stroke="#a8384f" stroke-width="2.2" stroke-linecap="round"/>
  <g class="fs-mouth fs-mouth-open"><path d="M91 130q9 1 18 0-2 11-9 11t-9-11Z" fill="#b8324f"/><path d="M95 137q5-3 10 0-2 3-5 3t-5-3Z" fill="#ff8fa3"/></g>
  <ellipse class="fs-mouth fs-mouth-o" cx="100" cy="134" rx="3.6" ry="4.2" fill="#b8324f"/>
  <path class="fs-mouth fs-mouth-flat" d="M94 134h12" stroke="#a8384f" stroke-width="2.4" stroke-linecap="round"/>
  <path class="fs-mouth fs-mouth-wavy" d="M92 135q2-3 4 0t4 0 4 0 4 0" fill="none" stroke="#a8384f" stroke-width="2.2" stroke-linecap="round"/>

  <!-- side locks framing the face -->
  <path d="M64 70c-10 22-10 52-2 80 4-10 6-20 6-30 2-18 2-34-4-50Z" fill="url(#fsHair)"/>
  <path d="M136 70c10 22 10 52 2 80-4-10-6-20-6-30-2-18-2-34 4-50Z" fill="url(#fsHair)"/>
  <!-- bangs -->
  <path d="M58 98C54 56 76 32 100 32s46 24 42 66l-8-20-6 16-8-26-8 22-6-26-6 26-8-22-8 26-6-16Z" fill="url(#fsHair)"/>
  <path d="M84 44q-6 14-8 30M112 42q6 14 8 30" fill="none" stroke="#7fe8dc" stroke-width="2" stroke-linecap="round" opacity=".7"/>
  <!-- ahoge -->
  <path d="M100 34c-6-14 4-26 16-22-8 2-12 10-10 22Z" fill="url(#fsHair)"/>
  <!-- padlock hair clip -->
  <g transform="translate(70 60) rotate(-18)">
    <path d="M-5-2v-4a5 5 0 0 1 10 0v4" fill="none" stroke="url(#fsGold)" stroke-width="2.4"/>
    <rect x="-8" y="-2" width="16" height="13" rx="3" fill="url(#fsGold)"/>
    <circle cx="0" cy="4" r="1.8" fill="#9a6a10"/><path d="M0 5v3" stroke="#9a6a10" stroke-width="1.6"/>
  </g>

  <!-- Fluffy Unicorn #45 on her shoulder -->
  <g class="fs-uni" transform="translate(18 170)">
    <ellipse cx="22" cy="30" rx="20" ry="15" fill="#fff" stroke="#e7d9f7" stroke-width="2"/>
    <circle cx="30" cy="14" r="13" fill="#fff" stroke="#e7d9f7" stroke-width="2"/>
    <path d="M33 2l4-14 2 14Z" fill="url(#fsGold)"/>
    <path d="M18 6c-6 2-10 10-6 16 0-6 4-8 8-8M21 3c-3-4 0-9 6-8-2 2-2 5-1 7" fill="#ffb3d1"/>
    <path d="M17 12c-4 4-4 10-1 14" fill="none" stroke="#b6a4ff" stroke-width="4" stroke-linecap="round"/>
    <circle cx="34" cy="15" r="2.2" fill="#2a1d3d"/><circle cx="34.7" cy="14.2" r=".8" fill="#fff"/>
    <ellipse cx="38" cy="20" rx="3" ry="1.6" fill="#ff8fb4" opacity=".6"/>
    <rect x="8" y="34" width="16" height="10" rx="3" fill="#ffe08a"/>
    <text x="16" y="42" text-anchor="middle" font-size="8" font-weight="800" fill="#7a5200" font-family="system-ui,sans-serif">45</text>
  </g>

  <!-- extras -->
  <g class="fs-sparkles" fill="#ffd34d">
    <path d="M30 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/><path d="M172 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/><path d="M182 160l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/>
  </g>
  <path class="fs-sweat" d="M140 76c-6 8-8 13-4 16s9-2 4-16Z" fill="#9fd8ff" stroke="#5aa9e6" stroke-width="1.2"/>
  <g class="fs-think" fill="#6d4ae0"><circle cx="160" cy="44" r="4"/><circle cx="172" cy="30" r="6"/><text x="180" y="22" font-size="22" font-weight="900" font-family="system-ui,sans-serif">?</text></g>
  <g class="fs-alert"><text x="158" y="44" font-size="34" font-weight="900" fill="#e0a526" font-family="system-ui,sans-serif">!</text></g>
</svg>`;

  // A dusk library seen through a big window: gradients dither into classic PC-98 skies.
  const BACKDROP_SVG = `
  <g class="fs-backdrop">
    <defs>
      <linearGradient id="bdSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1a1033"/><stop offset=".45" stop-color="#3a2a6e"/>
        <stop offset=".75" stop-color="#b8326f"/><stop offset="1" stop-color="#e07a2e"/>
      </linearGradient>
      <linearGradient id="bdWall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1033"/><stop offset="1" stop-color="#232a4a"/></linearGradient>
      <radialGradient id="bdGlow" cx=".5" cy=".9" r=".6"><stop offset="0" stop-color="#ffd34d" stop-opacity=".9"/><stop offset="1" stop-color="#ffd34d" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="200" height="220" fill="url(#bdWall)"/>
    <rect x="24" y="8" width="152" height="150" fill="url(#bdSky)"/>
    <circle cx="150" cy="128" r="20" fill="#ffd34d" opacity=".85"/>
    <rect x="24" y="8" width="152" height="150" fill="url(#bdGlow)"/>
    <path d="M24 158v-22l14-6 10 8 16-14 14 10 12-8 18 12 14-10 16 8 14-6 14 4 14-6v34Z" fill="#1a1033"/>
    <g fill="#ffd34d" opacity=".9"><rect x="40" y="146" width="2" height="2"/><rect x="66" y="142" width="2" height="2"/><rect x="118" y="148" width="2" height="2"/><rect x="150" y="144" width="2" height="2"/></g>
    <g fill="#ffffff"><rect x="40" y="22" width="1.5" height="1.5"/><rect x="88" y="14" width="1.5" height="1.5"/><rect x="62" y="40" width="1.5" height="1.5"/><rect x="160" y="26" width="1.5" height="1.5"/><rect x="132" y="48" width="1.5" height="1.5"/></g>
    <path d="M24 8h152v150H24Z M98 8h4v150h-4Z M24 80h152v4H24Z" fill="none" stroke="#9aa0c8" stroke-width="4"/>
    <rect x="0" y="0" width="22" height="220" fill="#232a4a"/><rect x="178" y="0" width="22" height="220" fill="#232a4a"/>
    <g fill="#3a2a6e"><rect x="2" y="30" width="18" height="3"/><rect x="2" y="80" width="18" height="3"/><rect x="2" y="130" width="18" height="3"/><rect x="180" y="30" width="18" height="3"/><rect x="180" y="80" width="18" height="3"/><rect x="180" y="130" width="18" height="3"/></g>
    <g><rect x="3" y="14" width="4" height="16" fill="#b8324f"/><rect x="8" y="17" width="3" height="13" fill="#0c5a53"/><rect x="12" y="12" width="4" height="18" fill="#ffd34d"/><rect x="16" y="18" width="3" height="12" fill="#6d4ae0"/>
       <rect x="3" y="64" width="3" height="16" fill="#2bb3a6"/><rect x="7" y="66" width="5" height="14" fill="#ff6fa8"/><rect x="13" y="62" width="3" height="18" fill="#9aa0c8"/>
       <rect x="182" y="16" width="4" height="14" fill="#6d4ae0"/><rect x="187" y="12" width="3" height="18" fill="#e07a2e"/><rect x="191" y="18" width="5" height="12" fill="#2bb3a6"/>
       <rect x="182" y="64" width="3" height="16" fill="#ffd34d"/><rect x="186" y="66" width="4" height="14" fill="#b8324f"/><rect x="191" y="62" width="4" height="18" fill="#0c5a53"/></g>
  </g>`;

  // 16 colors, PC-98 style (it showed 16 at a time from a 4096-color range).
  const PALETTE = [
    '#000000', '#1a1033', '#3a2a6e', '#6d4ae0', '#232a4a', '#9aa0c8', '#ffffff', '#0c5a53',
    '#2bb3a6', '#8ff0e2', '#ffe6d6', '#e9a98f', '#ff6fa8', '#b8324f', '#ffd34d', '#e07a2e',
  ].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));

  // 4x4 Bayer matrix for ordered dithering
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);

  const PIXEL_W = 150, PIXEL_H = 165; // CG resolution before scaling up 2x

  // mood -> which parts show
  const MOODS = {
    happy:   { eyes: 'open', mouth: 'smile', brow: 'n' },
    cheer:   { eyes: 'happy', mouth: 'open', brow: 'n', extra: ['sparkles'] },
    think:   { eyes: 'open', mouth: 'o', brow: 'n', extra: ['think'], look: 'up' },
    proud:   { eyes: 'happy', mouth: 'open', brow: 'n', extra: ['sparkles'] },
    serious: { eyes: 'serious', mouth: 'flat', brow: 'serious', extra: ['alert'] },
    oops:    { eyes: 'open', mouth: 'wavy', brow: 'worry', extra: ['sweat'] },
    wink:    { eyes: 'wink', mouth: 'open', brow: 'n', extra: ['sparkles'] },
  };

  const params = new URLSearchParams(global.location ? global.location.search : '');
  const active = (document.documentElement.dataset.edition || params.get('edition')) === 'ferpasan';
  const reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function moodSvg(mood) {
    const m = MOODS[mood] || MOODS.happy;
    const doc = new DOMParser().parseFromString(MASCOT_SVG.trim(), 'image/svg+xml');
    const svg = doc.documentElement;
    const hide = (el, show) => { if (!show) el.setAttribute('display', 'none'); };
    svg.querySelectorAll('.fs-eyes').forEach((g) => hide(g, g.classList.contains('fs-eyes-' + m.eyes)));
    svg.querySelectorAll('.fs-mouth').forEach((g) => hide(g, g.classList.contains('fs-mouth-' + m.mouth)));
    svg.querySelectorAll('.fs-brows path').forEach((g) => hide(g, g.classList.contains('fs-brow-' + m.brow)));
    for (const x of ['sparkles', 'sweat', 'think', 'alert']) hide(svg.querySelector('.fs-' + x), (m.extra || []).includes(x));
    if (m.look === 'up') svg.querySelectorAll('.fs-eyes-open .fs-iris').forEach((g) => g.setAttribute('transform', 'translate(2 -2)'));
    const bd = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + BACKDROP_SVG + '</svg>', 'image/svg+xml').documentElement.firstElementChild;
    svg.insertBefore(doc.importNode(bd, true), svg.firstChild);
    svg.setAttribute('width', 200);
    svg.setAttribute('height', 220);
    return new XMLSerializer().serializeToString(svg);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /** Shrink, then snap every pixel to the 16-color palette with ordered dithering. */
  function dither(img) {
    const c = document.createElement('canvas');
    c.width = PIXEL_W;
    c.height = PIXEL_H;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, PIXEL_W, PIXEL_H);
    const data = ctx.getImageData(0, 0, PIXEL_W, PIXEL_H); // throws if the canvas is tainted
    const px = data.data;
    for (let y = 0; y < PIXEL_H; y++) {
      for (let x = 0; x < PIXEL_W; x++) {
        const i = (y * PIXEL_W + x) * 4;
        const t = BAYER[(y & 3) * 4 + (x & 3)] * 30;
        const r = px[i] + t, g = px[i + 1] + t, b = px[i + 2] + t;
        let best = 0, bd = Infinity;
        for (let k = 0; k < PALETTE.length; k++) {
          const p = PALETTE[k];
          const dr = r - p[0], dg = g - p[1], db = b - p[2];
          const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
          if (d < bd) { bd = d; best = k; }
        }
        px[i] = PALETTE[best][0]; px[i + 1] = PALETTE[best][1]; px[i + 2] = PALETTE[best][2]; px[i + 3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);
    return c.toDataURL('image/png');
  }

  const cache = {};
  async function cg(mood) {
    if (!cache[mood]) {
      cache[mood] = (async () => {
        const src = MASCOT_IMAGES ? MASCOT_IMAGES[mood] || MASCOT_IMAGES.happy
          : URL.createObjectURL(new Blob([moodSvg(mood)], { type: 'image/svg+xml' }));
        const img = await loadImage(src);
        try { return dither(img); } catch (e) { return src; } // fall back to smooth art if the browser blocks pixel access
      })();
    }
    return cache[mood];
  }

  async function render(el, mood) {
    let img = el.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'fs-img';
      img.alt = '';
      el.appendChild(img);
    }
    img.src = await cg(mood);
    el.dataset.mood = mood;
  }

  // ---- dialogue box with typewriter text ----
  function typeInto(box, text) {
    clearInterval(box._typing);
    const out = box.querySelector('.vn-text');
    const sr = box.querySelector('.vn-sr');
    sr.textContent = 'FERPA-san: ' + text;
    box.classList.remove('is-done');
    if (reduceMotion) { out.textContent = text; box.classList.add('is-done'); return; }
    let n = 0;
    out.textContent = '';
    box._typing = setInterval(() => {
      n += 1;
      out.textContent = text.slice(0, n);
      if (n >= text.length) { clearInterval(box._typing); box.classList.add('is-done'); }
    }, 22);
    box.onclick = () => { clearInterval(box._typing); out.textContent = text; box.classList.add('is-done'); };
  }

  /** Show FERPA-san saying something in the given panel ('hide' or 'restore'). No-op in the standard edition. */
  function say(mood, text, panel) {
    if (!active) return;
    const stage = document.querySelector('.fs-stage[data-panel="' + (panel || 'hide') + '"]');
    if (!stage || stage.dataset.said === mood + text) return;
    stage.dataset.said = mood + text;
    render(stage.querySelector('.vn-cg'), mood);
    typeInto(stage.querySelector('.vn-box'), text);
  }

  function init() {
    if (!active) return;
    document.documentElement.dataset.edition = 'ferpasan';
    document.title = 'FERPA-san — FERPA Sanitizer';
    const logo = document.querySelector('.logo');
    if (logo) {
      const face = document.createElement('div');
      face.className = 'logo fs-avatar';
      face.setAttribute('aria-hidden', 'true');
      logo.replaceWith(face);
      render(face, 'happy');
    }
    const h1 = document.querySelector('.brand h1');
    if (h1) h1.innerHTML = 'FERPA-san <span class="fs-edition">FERPA SANITIZER ― FERPA-san Edition</span>';
    Object.keys(MOODS).forEach((m) => cg(m)); // warm the cache so expressions swap instantly
  }

  global.FMascot = { active, say, init, MOODS };
})(window);
