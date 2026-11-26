import {readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import process from 'node:process';
import {execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {marked} from 'marked';
import {parse as parseYaml} from 'yaml';

const root = resolve(import.meta.dirname, '../..');
const calloutPattern = /^ {0,3}>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:\n|$)/;
const execFile = promisify(execFileCallback);

function splitEntry(raw, path) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`${path}: missing YAML frontmatter`);
  return {frontmatter: match[1], meta: parseYaml(match[1]), body: raw.slice(match[0].length)};
}

function withNotesFormat(frontmatter) {
  if (/^format:\s*/m.test(frontmatter)) {
    return frontmatter.replace(/^format:\s*.*$/m, 'format: notes-v1');
  }
  return `format: notes-v1\n${frontmatter}`;
}

function plainText(value) {
  return String(value || '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function passageAnchor(token) {
  if (token?.type !== 'paragraph') return '';
  const text = plainText(token.text);
  if (text.length < 20) return '';
  const firstSentence = text.match(/^.{20,120}?(?:[.!?。！？](?=\s|$)|$)/u)?.[0];
  return (firstSentence || text.slice(0, 120)).trim();
}

function calloutContent(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n').map(line => line.replace(/^ {0,3}> ?/, ''));
  if (!/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/.test(lines[0] || '')) {
    throw new Error('Unrecognized callout opening');
  }
  lines.shift();
  while (!lines[0]?.trim()) lines.shift();

  let label = '';
  const bold = lines[0]?.match(/^\*\*(.+?)\*\*(?:\s*(.*))?$/);
  const heading = lines[0]?.match(/^#{1,6}\s+(.+)$/);
  if (bold) {
    label = plainText(bold[1]);
    lines.shift();
    if (bold[2]) lines.unshift(bold[2]);
  } else if (heading) {
    label = plainText(heading[1]);
    lines.shift();
  }
  while (!lines[0]?.trim()) lines.shift();
  while (!lines.at(-1)?.trim()) lines.pop();

  const parts = label.split(/\s*[|｜]\s*/);
  const title = (parts.length > 1 ? parts.slice(1).join(' | ') : label) || 'Note';
  return {
    title,
    isGuide: /(?:导读|reading guide|^guide(?:\s*[|｜]|$))/i.test(label),
    body: normalizeBodyHeadings(lines.join('\n').trim()),
  };
}

function normalizeBodyHeadings(body) {
  const lines = body.split('\n');
  return lines.map((line, index) => {
    const heading = line.match(/^#{1,2}\s+(.*)$/);
    if (!heading) return line;
    const next = lines.slice(index + 1).find(candidate => candidate.trim());
    return line === '# Reading guide' || (line.startsWith('## ') && /^<!--\s*x-read-anchor\s+/.test(next || ''))
      ? line : `### ${heading[1]}`;
  }).join('\n');
}

function migrateBody(body, path) {
  const notes = [];
  let section = '';
  let previous = null;

  for (const token of marked.lexer(body)) {
    if (token.type === 'heading' && token.depth > 1) section = plainText(token.text);
    if (token.type === 'blockquote' && calloutPattern.test(token.raw)) {
      notes.push({...calloutContent(token.raw), section, passage: passageAnchor(previous)});
    }
    if (token.type !== 'space') previous = token;
  }

  if (!notes.length) throw new Error(`${path}: no journal callouts found`);
  const guideIndex = notes.findIndex(note => note.isGuide);
  if (guideIndex < 0) throw new Error(`${path}: no reading guide callout found`);
  const [guide] = notes.splice(guideIndex, 1);
  if (!guide.body) throw new Error(`${path}: empty reading guide`);

  const output = ['# Reading guide', '', guide.body];
  for (const note of notes) {
    if (!note.body) throw new Error(`${path}: empty note ${note.title}`);
    const anchor = {heading: note.section, passage: note.passage};
    output.push('', `## ${note.title}`, '', `<!-- x-read-anchor ${JSON.stringify(anchor)} -->`, '', note.body);
  }
  return {body: `${output.join('\n').trim()}\n`, noteCount: notes.length + 1};
}

function validateNotesBody(body, path) {
  if (/!\[[^\]]*\]\([^)]*\)|<\s*(?:img|picture|video|audio|source)\b/i.test(body)) {
    throw new Error(`${path}: embedded media is not allowed`);
  }
  const tokens = marked.lexer(body);
  const headings = tokens.filter(token => token.type === 'heading');
  if (headings[0]?.depth !== 1 || plainText(headings[0].text) !== 'Reading guide' ||
      headings.filter(token => token.depth === 1).length !== 1) {
    throw new Error(`${path}: expected exactly one top-level Reading guide`);
  }

  let notes = 1;
  let awaitingAnchor = false;
  for (const token of tokens) {
    if (token.type === 'image') throw new Error(`${path}: embedded images are not allowed`);
    if (token.type === 'heading' && token.depth === 2) {
      if (awaitingAnchor) throw new Error(`${path}: note is missing an anchor`);
      awaitingAnchor = true;
      notes++;
      continue;
    }
    if (!awaitingAnchor || token.type === 'space') continue;
    const match = token.type === 'html' && token.raw.trim().match(/^<!--\s*x-read-anchor\s+([\s\S]*?)\s*-->$/);
    if (!match) throw new Error(`${path}: anchor must immediately follow its note heading`);
    let anchor;
    try { anchor = JSON.parse(match[1]); } catch { throw new Error(`${path}: invalid anchor JSON`); }
    if (Object.keys(anchor).some(key => !['heading', 'passage'].includes(key)) ||
        typeof anchor.heading !== 'string' || typeof anchor.passage !== 'string') {
      throw new Error(`${path}: anchor must contain only heading and passage strings`);
    }
    if (anchor.heading.length > 200 || anchor.passage.length > 160) throw new Error(`${path}: anchor exceeds its length limit`);
    awaitingAnchor = false;
  }
  if (awaitingAnchor) throw new Error(`${path}: note is missing an anchor`);
  return notes;
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const compareRef = process.argv.find(argument => argument.startsWith('--compare-ref='))?.split('=', 2)[1];
  const sourceRef = process.argv.find(argument => argument.startsWith('--source-ref='))?.split('=', 2)[1];
  if (checkOnly && sourceRef) throw new Error('--source-ref cannot be combined with --check');
  const entriesRoot = resolve(root, 'reading-journal/entries');
  const files = [];
  for (const year of await readdir(entriesRoot, {withFileTypes: true})) {
    if (!year.isDirectory()) continue;
    for (const entry of await readdir(resolve(entriesRoot, year.name), {withFileTypes: true})) {
      if (entry.isFile() && entry.name.endsWith('.md')) files.push(`reading-journal/entries/${year.name}/${entry.name}`);
    }
  }
  files.sort();
  let totalNotes = 0;
  const sourceUrls = new Map();

  for (const path of files) {
    const absolute = resolve(root, path);
    const raw = sourceRef
      ? (await execFile('git', ['show', `${sourceRef}:${path}`], {cwd: root, maxBuffer: 10 * 1024 * 1024})).stdout
      : await readFile(absolute, 'utf8');
    const {frontmatter, meta, body: parsedBody} = splitEntry(raw, path);
    let body = parsedBody;
    if (/^format:\s*notes-v1\s*$/m.test(frontmatter)) {
      const normalizedAnchors = body.replace(/<!--\s*x-read-anchor\s+([\s\S]*?)\s*-->/g, (comment, json) => {
        let anchor;
        try { anchor = JSON.parse(json); } catch { return comment; }
        return `<!-- x-read-anchor ${JSON.stringify({heading: typeof anchor.heading === 'string' ? anchor.heading : '', passage: typeof anchor.passage === 'string' ? anchor.passage : ''})} -->`;
      });
      const normalized = normalizeBodyHeadings(normalizedAnchors);
      if (normalized !== body) {
        if (checkOnly) throw new Error(`${path}: anchors are not normalized`);
        body = normalized;
        await writeFile(absolute, `---\n${frontmatter}\n---\n${body}`);
      }
      for (const field of ['title', 'source_title', 'source_url', 'source_language', 'entry_language', 'read_date']) {
        if (!meta?.[field]) throw new Error(`${path}: missing ${field}`);
      }
      if (sourceUrls.has(meta.source_url)) throw new Error(`${path}: duplicates source_url from ${sourceUrls.get(meta.source_url)}`);
      sourceUrls.set(meta.source_url, path);
      totalNotes += validateNotesBody(body, path);
      if (compareRef) {
        const {stdout: original} = await execFile('git', ['show', `${compareRef}:${path}`], {cwd: root, maxBuffer: 10 * 1024 * 1024});
        const originalBody = splitEntry(original, `${compareRef}:${path}`).body;
        const expected = migrateBody(originalBody, `${compareRef}:${path}`).body;
        if (body.trim() !== expected.trim()) throw new Error(`${path}: notes differ from the exact migration of ${compareRef}`);
      }
      continue;
    }
    if (checkOnly) throw new Error(`${path}: still uses the archived-text format`);
    const migrated = migrateBody(body, path);
    totalNotes += migrated.noteCount;
    await writeFile(absolute, `---\n${withNotesFormat(frontmatter)}\n---\n\n${migrated.body}`);
  }

  const comparison = compareRef ? ` against ${compareRef}` : '';
  console.log(`${checkOnly ? 'Validated' : 'Migrated'} ${files.length} entries with ${totalNotes} notes${comparison}.`);
}

await main();
