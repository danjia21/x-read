import { parse } from 'yaml';
export const repository = 'danjia21/x-read';
export const entryPattern = /^reading-journal\/entries\/\d{4}\/.+\.md$/;
export function parseEntry(path, raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const meta = match ? parse(match[1]) : {};
  const body = match ? raw.slice(match[0].length) : raw;
  const format = meta?.format === 'notes-v1' ? 'notes-v1' : 'unknown';
  return {path, body, format, title: String(meta?.title || body.match(/^# (.+)$/m)?.[1] || path.split('/').pop()),
    date: String(meta?.read_date || ''), published: /^\d{4}-\d{2}-\d{2}$/.test(String(meta?.published || '')) ? String(meta.published) : '', topics: Array.isArray(meta?.topics) ? meta.topics.map(String) : [],
    tags: Array.isArray(meta?.tags) ? meta.tags.map(String) : [], language: String(meta?.entry_language || ''),
    source: String(meta?.source_url || ''), authors: Array.isArray(meta?.authors) ? meta.authors.map(String) : []};
}
export function selectEntries(entries, query = '', topic = '', sort = 'newest') {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter(e => (!topic || e.topics.includes(topic)) && terms.every(t =>
    [e.title, e.body, ...e.authors, ...e.topics, ...e.tags, ...(e.notes || []).map(note => note.body)].join(' ').toLocaleLowerCase().includes(t)))
    .sort((a,b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      const field = sort.startsWith('published-') ? 'published' : 'date';
      const left = a[field] || '', right = b[field] || '';
      // Unknown dates belong last in both directions.
      if (!left || !right) return Number(!left) - Number(!right) || a.title.localeCompare(b.title);
      return (sort.endsWith('oldest') ? left.localeCompare(right) : right.localeCompare(left)) || a.title.localeCompare(b.title);
    });
}
export async function request(url, fetcher = fetch) {
  const response = await fetcher(url, {cache: 'no-store', signal: AbortSignal.timeout(20000)});
  if (!response.ok) {
    const limited = response.status === 403 || response.status === 429;
    const error = new Error(limited ? 'GitHub is limiting requests.' : `GitHub returned ${response.status}.`);
    if (limited) {
      const retry = response.headers.get('retry-after');
      const delay = retry && /^\d+$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry || '');
      const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
      error.retryAt = Math.max(Date.now() + 60000, Number.isFinite(delay) ? delay : 0, reset || 0);
    }
    throw error;
  }
  return response;
}
export async function loadLibrary({fetcher = fetch, onEntry = () => {}, cached = null, prepareEntry = entry => entry} = {}) {
  const commit = await (await request(`https://api.github.com/repos/${repository}/commits/HEAD`, fetcher)).json();
  if (cached?.commit === commit.sha) return {...cached, failed: 0, total: cached.entries.length};
  const tree = await (await request(`https://api.github.com/repos/${repository}/git/trees/${commit.commit.tree.sha}?recursive=1`, fetcher)).json();
  if (tree.truncated) throw new Error('The repository listing is incomplete. Please try again later.');
  const files = tree.tree.filter(f => f.type === 'blob' && entryPattern.test(f.path));
  const entries = []; let failed = 0; let cursor = 0; let retryAt = 0;
  await Promise.all(Array.from({length: Math.min(6, files.length)}, async () => {
    while (cursor < files.length) {
      if (retryAt > Date.now()) break;
      const file = files[cursor++];
      try {
        const raw = await (await request(`https://raw.githubusercontent.com/${repository}/${commit.sha}/${file.path.split('/').map(encodeURIComponent).join('/')}`, fetcher)).text();
        const entry = prepareEntry(parseEntry(file.path, raw)); entries.push(entry); onEntry(entry);
      } catch (error) { failed++; retryAt = Math.max(retryAt, error.retryAt || 0); }
    }
  }));
  failed = files.length - entries.length;
  if (files.length && !entries.length) {
    const error = new Error('The articles could not be downloaded. Check your connection and try again.');
    error.retryAt = retryAt; throw error;
  }
  return {entries, failed, total: files.length, commit: commit.sha, retryAt};
}
