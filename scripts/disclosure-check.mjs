#!/usr/bin/env node
// Disclosure checker — spec §7.3.
//
// A literal deny-list file is itself a disclosure, and this repo is public.
// So disclosure/redlist.sha256 stores SHA-256 hashes of normalised terms,
// never the terms themselves. This script normalises scanned text, enumerates
// every 1-6-word n-gram, hashes each, and compares against the stored set.
// On a hit it reports a location and NEVER prints the matched term.
//
// Usage:
//   node scripts/disclosure-check.mjs                 scan the working tree
//   node scripts/disclosure-check.mjs --dist           scan dist/ as well
//   node scripts/disclosure-check.mjs --commit-msg <f>  scan a commit message file
//   node scripts/disclosure-check.mjs --add             read a term from stdin,
//                                                        hash it, append it —
//                                                        never echoes the term

import { createHash } from 'node:crypto';
import { readFileSync, appendFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REDLIST_PATH = join(ROOT, 'disclosure', 'redlist.sha256');
const ALLOW_PATH = join(ROOT, 'disclosure', 'allow.txt');

// ── category regexes — publishable, because they describe shapes of
// information rather than the information itself (spec §7.3) ──
const REGEXES = [
  [/\bAUROC\b/i, 'AUROC mention'],
  [/\bevent[- ]?F1\b/i, 'event-F1 mention'],
  [/\bablation\b/i, 'ablation mention'],
  [/\bsensitivity\s*(of|=|:)?\s*\d/i, 'sensitivity figure'],
  [/\d+(\.\d+)?\s*%\s*(precision|recall|F1|AUROC)/i, 'attributed-looking percentage'],
  [/\b(kernel|layers?|hidden|embedding|heads?)\s*[:=]\s*\d+/i, 'architecture-shaped config'],
  [/\bgap\s*\d\b/i, 'numbered research gap'],
  [/CGPA/i, 'CGPA'],
  // Deliberately NOT a bare \d{10} — numeric-literal hash constants, sample
  // rates and byte budgets in source code are indistinguishable from a bare
  // 10-digit phone number. Real phone numbers, as written in prose or a
  // tel: link, carry a separator or a country-code +; source-code magic
  // numbers never do. Requiring that shape is what keeps this pattern from
  // flagging every large integer literal in the codebase.
  [/\+\d{1,3}[\s-]?\d{9,10}\b/, 'phone-number shape'],            // with country code
  [/\b\d{3,4}[\s-]\d{3,4}[\s-]\d{3,4}\b/, 'phone-number shape'],  // three separated groups
];

// The checker's own source necessarily names these categories to implement
// the check (e.g. the label 'AUROC mention' above) — that is not a
// disclosure, it is the tool. Never self-scan.
const SELF_PATH = fileURLToPath(import.meta.url);

function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function loadRedlist() {
  if (!existsSync(REDLIST_PATH)) return new Set();
  return new Set(
    readFileSync(REDLIST_PATH, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  );
}

function loadAllow() {
  if (!existsSync(ALLOW_PATH)) return [];
  return readFileSync(ALLOW_PATH, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map(normalize);
}

// Tokenise a whole file into {word, line} pairs so n-grams can span line
// breaks (a phrase wrapped across two lines of prose must still be caught)
// while still reporting a useful line number.
function tokenize(content) {
  const tokens = [];
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const norm = normalize(line);
    if (!norm) return;
    for (const w of norm.split(' ')) {
      if (w) tokens.push({ w, line: idx + 1 });
    }
  });
  return tokens;
}

// Word-index ranges covered by an allow-listed sentence, so hash matches
// inside them are permitted.
function allowedRanges(tokens, allowList) {
  const words = tokens.map((t) => t.w);
  const full = words.join(' ');
  // cumulative char-start offset of each word within `full`
  const starts = [];
  let pos = 0;
  for (const w of words) {
    starts.push(pos);
    pos += w.length + 1;
  }
  const ranges = [];
  for (const entry of allowList) {
    let from = 0;
    let idx;
    while ((idx = full.indexOf(entry, from)) !== -1) {
      // map char offset -> word index by linear scan (files are small)
      let wi = 0;
      while (wi < starts.length && starts[wi] < idx) wi++;
      if (wi > 0 && starts[wi] !== idx) wi--;
      let endChar = idx + entry.length;
      let wj = wi;
      while (wj < starts.length && starts[wj] < endChar) wj++;
      ranges.push([wi, wj]);
      from = idx + 1;
    }
  }
  return ranges;
}

function isCovered(ranges, i, j) {
  return ranges.some(([a, b]) => i >= a && j <= b);
}

function collectFiles(patterns) {
  const files = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else files.push(full);
    }
  }
  for (const p of patterns) {
    const full = join(ROOT, p.dir);
    if (existsSync(full) && statSync(full).isDirectory()) walk(full);
    else if (existsSync(full)) files.push(full);
  }
  return files.filter((f) => {
    const ext = extname(f).toLowerCase();
    return ['.html', '.ts', '.css', '.glsl', '.md', '.json', '.js', '.mjs'].includes(ext);
  });
}

function scanFile(filePath, redlist, allowList, matches) {
  if (filePath === SELF_PATH) return;
  const content = readFileSync(filePath, 'utf8');
  const rel = relative(ROOT, filePath);

  // regex category layer. Prose wraps across lines, so an allow-listed
  // sentence can straddle a line break — check a 3-line window (prev +
  // current + next) normalised together, not just the single line.
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const window = normalize([lines[idx - 1] ?? '', line, lines[idx + 1] ?? ''].join(' '));
    const allowedLine = allowList.some((a) => window.includes(a));
    if (allowedLine) return;
    for (const [re, label] of REGEXES) {
      if (re.test(line)) matches.push({ file: rel, line: idx + 1, kind: `pattern: ${label}` });
    }
  });

  // hash n-gram layer
  if (redlist.size === 0) return;
  const tokens = tokenize(content);
  const ranges = allowedRanges(tokens, allowList);
  for (let n = 1; n <= 6; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      if (isCovered(ranges, i, i + n)) continue;
      const gram = tokens.slice(i, i + n).map((t) => t.w).join(' ');
      const hash = sha256(gram);
      if (redlist.has(hash)) {
        matches.push({ file: rel, line: tokens[i].line, kind: 'redlist hash match' });
      }
    }
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').trim();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--add')) {
    const term = await readStdin();
    if (!term) {
      console.error('no term read from stdin');
      process.exit(1);
    }
    const hash = sha256(normalize(term));
    appendFileSync(REDLIST_PATH, hash + '\n');
    console.log('term hashed and appended — not echoed');
    return;
  }

  const commitMsgIdx = args.indexOf('--commit-msg');
  const redlist = loadRedlist();
  const allowList = loadAllow();
  const matches = [];

  if (commitMsgIdx !== -1) {
    const msgFile = args[commitMsgIdx + 1];
    scanFile(msgFile, redlist, allowList, matches);
  } else {
    const scope = [
      { dir: 'index.html' },
      { dir: 'src' },
      { dir: 'scripts' },
      { dir: 'README.md' },
      { dir: 'package.json' },
      { dir: 'disclosure/allow.txt' },
    ];
    if (args.includes('--dist')) scope.push({ dir: 'dist' });
    const files = collectFiles(scope);
    for (const f of files) scanFile(f, redlist, allowList, matches);
  }

  if (matches.length > 0) {
    console.error(`disclosure check FAILED — ${matches.length} match(es):`);
    matches.forEach((m, idx) => {
      console.error(`  ${m.kind} #${idx + 1} at ${m.file}:${m.line}`);
    });
    process.exit(1);
  }

  console.log(`disclosure check passed (${redlist.size} redlist hashes, ${allowList.length} allow entries)`);
}

main();
