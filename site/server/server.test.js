import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createReaderServer} from './server.js';

const repo = 'danjia21/x-read';
const prefix = 'reading-journal/entries/2026/';
const notesPath = prefix + 'notes.md';
const legacyPath = prefix + 'legacy.md';
const notes = '---\nformat: notes-v1\ntitle: Notes\nsource_url: https://example.org/source\n---\nIgnored preamble\n\n# Reading guide\n\nOriginal analysis';
const sha = 'fixture-commit';

async function fixture(t) {
  const dist = await mkdtemp(join(tmpdir(), 'x-read-test-'));
  await writeFile(join(dist, 'index.html'), '<main>Public library</main>');
  await writeFile(join(dist, 'app.js'), 'export {};');
  let time = Date.now(), status = 200;
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(url);
    assert.equal(new Headers(options.headers).has('authorization'), false);
    if (status !== 200) return new Response('', {status, headers: {'retry-after': '60'}});
    switch (url) {
      case `https://api.github.com/repos/${repo}/commits/HEAD`:
        return Response.json({sha, commit: {tree: {sha: 'fixture-tree'}}});
      case `https://api.github.com/repos/${repo}/git/trees/fixture-tree?recursive=1`:
        return Response.json({tree: [notesPath, legacyPath, 'README.md'].map(path => ({path, type:'blob'}))});
      case `https://raw.githubusercontent.com/${repo}/${sha}/${notesPath}`:
        return new Response(notes);
      case `https://raw.githubusercontent.com/${repo}/${sha}/${legacyPath}`:
        return new Response('# Legacy\n\nLegacy fixture body');
      default:
        assert.fail(`Unexpected upstream URL: ${url}`);
    }
  };
  const server = createReaderServer({dist, fetcher, now: () => time});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(dist, {recursive: true, force: true});
  });
  return {
    get: path => fetch(`http://127.0.0.1:${server.address().port}${path}`),
    calls, advance: ms => { time += ms; }, fail: code => { status = code; },
  };
}

test('serves the landing page and assets publicly and shares an in-flight notes-only load', async t => {
  const {get, calls, advance} = await fixture(t);
  for (const path of ['/', '/app.js', '/healthz']) {
    const response = await get(path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.has('set-cookie'), false);
  }
  for (const path of ['/api/session', '/auth/login', '/auth/callback', '/auth/logout']) {
    assert.equal((await get(path)).status, 404);
  }
  assert.equal(calls.length, 0);
  const responses = await Promise.all([get('/api/library'), get('/api/library')]);
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.has('set-cookie'), false);
    const {entries} = await response.json();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].format, 'notes-v1');
    assert.equal(entries[0].body, undefined);
    assert.deepEqual(entries[0].notes, [{title:'Reading guide', section:'', passage:'', body:'Original analysis'}]);
  }
  assert.equal(calls.length, 4);
  assert.equal((await (await get('/api/library')).json()).fromCache, true);
  assert.equal(calls.length, 4);
  advance(300001);
  assert.equal((await (await get('/api/library')).json()).stale, false);
  assert.equal(calls.length, 5);
});

test('returns a retry deadline during a cold outage and recovers after the cooldown', async t => {
  const {get, calls, advance, fail} = await fixture(t);
  fail(502);
  const unavailable = await get('/api/library');
  assert.equal(unavailable.status, 503);
  const result = await unavailable.json();
  assert.match(result.error, /could not be loaded from GitHub/);
  assert.ok(result.retryAt > Date.now());
  fail(200);
  assert.equal((await get('/api/library')).status, 503);
  assert.equal(calls.length, 1);
  advance(60001);
  assert.equal((await (await get('/api/library')).json()).entries.length, 1);
});
