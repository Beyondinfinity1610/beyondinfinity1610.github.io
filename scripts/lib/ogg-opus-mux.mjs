// A minimal, dependency-free Ogg-Opus container muxer (RFC 3533 Ogg +
// RFC 7845 Ogg-Opus mapping). Exists because this build has no ffmpeg/
// opusenc available (checked: `ffmpeg -version` fails in this
// environment) and no native-binding Ogg package is acceptable here
// (node-ogg pulls prebuilt native bindings — a real cross-platform risk
// for a two-line container format). opusscript (pure JS/WASM libopus,
// zero transitive deps, MIT) does the actual audio coding; this file only
// wraps its raw Opus packets in the page/segment framing a browser's
// `decodeAudioData` needs to recognise the stream at all.
//
// Scope deliberately kept to exactly what six short, single-stream, CBR
// mono files need: no continued-packet-across-page-boundary support (our
// packets are always small enough to fit a page), no multi-stream muxing,
// no chained streams.

import { Buffer } from 'node:buffer';

// --- Ogg's CRC-32 (RFC 3533 §6): polynomial 0x04c11db7, NOT reflected,
// initial value 0, no final XOR. This is a different algorithm from the
// common zlib/PNG CRC-32 (which is reflected and inverts init/final) —
// using that one instead silently produces pages every real Ogg demuxer
// (including Chromium's) rejects as corrupt.
const CRC_POLY = 0x04c11db7;
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let r = i << 24;
  for (let j = 0; j < 8; j++) {
    r = (r & 0x80000000) !== 0 ? (((r << 1) ^ CRC_POLY) >>> 0) : ((r << 1) >>> 0);
  }
  CRC_TABLE[i] = r >>> 0;
}

function oggCrc32(bytes) {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    const top = (crc >>> 24) & 0xff;
    crc = (((crc << 8) >>> 0) ^ CRC_TABLE[top ^ bytes[i]]) >>> 0;
  }
  return crc >>> 0;
}

/** Standard Ogg lacing: 255-byte segments, terminated by one segment in
 *  [0,254]. A packet whose length is an exact multiple of 255 still gets
 *  a trailing 0-length segment — that's what marks "packet ends here"
 *  rather than "continues on the next page". */
function segmentsForPacket(len) {
  const segs = [];
  let remaining = len;
  while (remaining >= 255) {
    segs.push(255);
    remaining -= 255;
  }
  segs.push(remaining);
  return segs;
}

const HEADER_BOS = 0x02;
const HEADER_EOS = 0x04;

function buildPage({ headerType, granulePos, serial, seq, packets }) {
  const segmentTable = [];
  let dataLen = 0;
  for (const p of packets) {
    for (const s of segmentsForPacket(p.length)) segmentTable.push(s);
    dataLen += p.length;
  }
  if (segmentTable.length > 255) {
    throw new Error(`page would need ${segmentTable.length} segments (max 255) — split into more pages`);
  }

  const headerLen = 27 + segmentTable.length;
  const buf = Buffer.alloc(headerLen + dataLen);
  buf.write('OggS', 0, 'ascii');
  buf.writeUInt8(0, 4); // stream structure version
  buf.writeUInt8(headerType, 5);
  buf.writeBigUInt64LE(BigInt(granulePos), 6);
  buf.writeUInt32LE(serial >>> 0, 14);
  buf.writeUInt32LE(seq >>> 0, 18);
  buf.writeUInt32LE(0, 22); // checksum placeholder, filled below
  buf.writeUInt8(segmentTable.length, 26);
  segmentTable.forEach((s, i) => buf.writeUInt8(s, 27 + i));

  let off = headerLen;
  for (const p of packets) {
    Buffer.from(p.buffer, p.byteOffset, p.byteLength).copy(buf, off);
    off += p.length;
  }

  const crc = oggCrc32(buf);
  buf.writeUInt32LE(crc, 22);
  return buf;
}

function buildOpusHeadPacket(channels, preSkip, inputSampleRate) {
  const buf = Buffer.alloc(19);
  buf.write('OpusHead', 0, 'ascii');
  buf.writeUInt8(1, 8); // version
  buf.writeUInt8(channels, 9);
  buf.writeUInt16LE(preSkip, 10);
  buf.writeUInt32LE(inputSampleRate, 12);
  buf.writeInt16LE(0, 16); // output gain
  buf.writeUInt8(0, 18); // channel mapping family 0 — mono/stereo, no mapping table
  return buf;
}

function buildOpusTagsPacket(vendor) {
  const vendorBuf = Buffer.from(vendor, 'utf8');
  const buf = Buffer.alloc(8 + 4 + vendorBuf.length + 4);
  let off = 0;
  buf.write('OpusTags', off, 'ascii'); off += 8;
  buf.writeUInt32LE(vendorBuf.length, off); off += 4;
  vendorBuf.copy(buf, off); off += vendorBuf.length;
  buf.writeUInt32LE(0, off); // zero user comments
  return buf;
}

const MAX_PACKETS_PER_PAGE = 48; // segment-count headroom for our small packets

/**
 * Muxes raw Opus packets (each one already a complete encoded frame, in
 * order) into a valid single-stream Ogg-Opus file buffer.
 * @param {{channels:number, inputSampleRate:number, preSkip?:number, packets:Uint8Array[], samplesPerPacket:number, lastPacketSamples?:number, serial?:number, vendor?:string}} opts
 */
export function muxOggOpus({
  channels,
  inputSampleRate,
  preSkip = 0,
  packets,
  samplesPerPacket,
  lastPacketSamples,
  serial = 1,
  vendor = 'portfolio-site gen-audio (opusscript)',
}) {
  const pages = [];
  let seq = 0;

  pages.push(
    buildPage({
      headerType: HEADER_BOS,
      granulePos: 0,
      serial,
      seq: seq++,
      packets: [buildOpusHeadPacket(channels, preSkip, inputSampleRate)],
    }),
  );
  pages.push(
    buildPage({
      headerType: 0,
      granulePos: 0,
      serial,
      seq: seq++,
      packets: [buildOpusTagsPacket(vendor)],
    }),
  );

  let cumulativeSamples = 0;
  for (let i = 0; i < packets.length; i += MAX_PACKETS_PER_PAGE) {
    const chunk = packets.slice(i, i + MAX_PACKETS_PER_PAGE);
    const isLastChunk = i + MAX_PACKETS_PER_PAGE >= packets.length;
    for (let j = 0; j < chunk.length; j++) {
      const isVeryLastPacket = isLastChunk && j === chunk.length - 1;
      cumulativeSamples += isVeryLastPacket && lastPacketSamples != null ? lastPacketSamples : samplesPerPacket;
    }
    pages.push(
      buildPage({
        headerType: isLastChunk ? HEADER_EOS : 0,
        granulePos: cumulativeSamples,
        serial,
        seq: seq++,
        packets: chunk,
      }),
    );
  }

  return Buffer.concat(pages);
}

/** Parses an Ogg-Opus buffer back into its raw Opus packets (skipping the
 *  OpusHead/OpusTags header packets) — used by gen-audio.mjs's own
 *  round-trip verification (decode what we just wrote, with a real Opus
 *  decoder, before trusting the file). Deliberately independent of
 *  muxOggOpus's own page-building code path so a bug shared between
 *  "write" and "read" can't hide from the check. */
export function demuxOggOpus(buf) {
  const packets = [];
  let off = 0;
  let pageIndex = 0;
  let pendingPacket = null;
  while (off < buf.length) {
    if (buf.toString('ascii', off, off + 4) !== 'OggS') {
      throw new Error(`expected OggS capture pattern at byte ${off}`);
    }
    const segmentCount = buf.readUInt8(off + 26);
    const segmentTable = buf.subarray(off + 27, off + 27 + segmentCount);
    let dataOff = off + 27 + segmentCount;

    let i = 0;
    while (i < segmentTable.length) {
      let len = 0;
      let j = i;
      while (j < segmentTable.length && segmentTable[j] === 255) {
        len += 255;
        j++;
      }
      if (j < segmentTable.length) {
        len += segmentTable[j];
        j++;
      }
      const bytes = buf.subarray(dataOff, dataOff + len);
      dataOff += len;
      if (pendingPacket) {
        pendingPacket = Buffer.concat([pendingPacket, bytes]);
      } else {
        pendingPacket = Buffer.from(bytes);
      }
      // A packet segment list element < 255 always terminates the packet
      // (that's the lacing rule) — anything ending in a 255-segment
      // continues on the next page, which none of our own pages do, but
      // demux still has to walk the table correctly either way.
      const lastSegLen = j > i ? segmentTable[j - 1] : 0;
      if (lastSegLen < 255) {
        packets.push(pendingPacket);
        pendingPacket = null;
      }
      i = j;
    }

    off = dataOff;
    pageIndex++;
  }
  // First two packets are OpusHead / OpusTags.
  return { head: packets[0], tags: packets[1], audioPackets: packets.slice(2) };
}
