/*
 * Minimal ZIP reader/writer for Office files (.docx/.xlsx/.pptx are ZIP archives).
 * Zero dependencies: uses the browser's built-in CompressionStream/DecompressionStream,
 * so everything stays on this computer and works with no internet connection.
 */
(function (global) {
  'use strict';

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  async function pipeThrough(bytes, stream) {
    const out = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(out).arrayBuffer());
  }

  const inflate = (bytes) => pipeThrough(bytes, new DecompressionStream('deflate-raw'));
  const deflate = (bytes) => pipeThrough(bytes, new CompressionStream('deflate-raw'));

  const utf8 = new TextDecoder('utf-8');
  const cp437ish = new TextDecoder('latin1');
  const enc = new TextEncoder();

  class ZipEntry {
    constructor(name, method, crc, compressed, size) {
      this.name = name;
      this.method = method;
      this.crc = crc;
      this.compressed = compressed; // raw bytes as stored in the archive
      this.size = size;
      this._data = null; // uncompressed bytes once read or replaced
      this.modified = false;
    }
    async bytes() {
      if (this._data) return this._data;
      if (this.method === 0) this._data = this.compressed;
      else if (this.method === 8) this._data = await inflate(this.compressed);
      else throw new Error('Unsupported compression in file part "' + this.name + '"');
      return this._data;
    }
    async text() {
      return utf8.decode(await this.bytes());
    }
    setText(str) {
      this._data = enc.encode(str);
      this.modified = true;
    }
  }

  class ZipArchive {
    constructor(entries) {
      this.entries = entries; // ordered array of ZipEntry
      this.byName = new Map(entries.map((e) => [e.name, e]));
    }

    static async read(buffer) {
      const bytes = new Uint8Array(buffer);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let eocd = -1;
      for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
        if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
      }
      if (eocd < 0) throw new Error('This file does not look like a valid Office document.');
      const count = view.getUint16(eocd + 10, true);
      let p = view.getUint32(eocd + 16, true);
      if (p === 0xffffffff) throw new Error('This file is too large to process (ZIP64).');
      const entries = [];
      for (let i = 0; i < count; i++) {
        if (view.getUint32(p, true) !== 0x02014b50) throw new Error('Damaged file (bad directory).');
        const flags = view.getUint16(p + 8, true);
        const method = view.getUint16(p + 10, true);
        const crc = view.getUint32(p + 16, true);
        const csize = view.getUint32(p + 20, true);
        const usize = view.getUint32(p + 24, true);
        const nlen = view.getUint16(p + 28, true);
        const xlen = view.getUint16(p + 30, true);
        const clen = view.getUint16(p + 32, true);
        const local = view.getUint32(p + 42, true);
        const nameBytes = bytes.subarray(p + 46, p + 46 + nlen);
        const name = (flags & 0x800 ? utf8 : cp437ish).decode(nameBytes);
        const lnlen = view.getUint16(local + 26, true);
        const lxlen = view.getUint16(local + 28, true);
        const start = local + 30 + lnlen + lxlen;
        entries.push(new ZipEntry(name, method, crc, bytes.subarray(start, start + csize), usize));
        p += 46 + nlen + xlen + clen;
      }
      return new ZipArchive(entries);
    }

    get(name) { return this.byName.get(name); }
    names() { return this.entries.map((e) => e.name); }

    async toBlob(mimeType) {
      const chunks = [];
      const central = [];
      let offset = 0;
      const now = new Date();
      const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
      const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

      for (const e of this.entries) {
        let method = e.method, crc = e.crc, data = e.compressed, size = e.size;
        if (e.modified) {
          const raw = e._data;
          crc = crc32(raw);
          size = raw.length;
          data = await deflate(raw);
          method = 8;
        }
        const nameBytes = enc.encode(e.name);
        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true);
        lh.setUint16(4, 20, true);
        lh.setUint16(6, 0x800, true);
        lh.setUint16(8, method, true);
        lh.setUint16(10, dosTime, true);
        lh.setUint16(12, dosDate, true);
        lh.setUint32(14, crc, true);
        lh.setUint32(18, data.length, true);
        lh.setUint32(22, size, true);
        lh.setUint16(26, nameBytes.length, true);
        lh.setUint16(28, 0, true);
        chunks.push(new Uint8Array(lh.buffer), nameBytes, data);

        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true);
        ch.setUint16(4, 20, true);
        ch.setUint16(6, 20, true);
        ch.setUint16(8, 0x800, true);
        ch.setUint16(10, method, true);
        ch.setUint16(12, dosTime, true);
        ch.setUint16(14, dosDate, true);
        ch.setUint32(16, crc, true);
        ch.setUint32(20, data.length, true);
        ch.setUint32(24, size, true);
        ch.setUint16(28, nameBytes.length, true);
        ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), nameBytes);
        offset += 30 + nameBytes.length + data.length;
      }
      const cdSize = central.reduce((n, c) => n + c.length, 0);
      const end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true);
      end.setUint16(8, this.entries.length, true);
      end.setUint16(10, this.entries.length, true);
      end.setUint32(12, cdSize, true);
      end.setUint32(16, offset, true);
      return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: mimeType || 'application/zip' });
    }

    /** Build a brand-new archive from {name: Uint8Array|string} (used for "Download all"). */
    static fromFiles(files) {
      const entries = files.map(({ name, data }) => {
        const e = new ZipEntry(name, 0, 0, new Uint8Array(0), 0);
        e._data = typeof data === 'string' ? enc.encode(data) : data;
        e.modified = true;
        return e;
      });
      return new ZipArchive(entries);
    }
  }

  global.FZip = { ZipArchive, crc32 };
})(typeof window !== 'undefined' ? window : globalThis);
