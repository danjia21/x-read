import {entryPattern, loadLibrary, repository} from './content.js';
import {cacheTTLms} from './config.js';

const key = `x-read:library:v1:${repository}`;
const retryKey = `${key}:retry`;

function validSnapshot(value) {
  return value && typeof value.commit === 'string' && value.commit.length > 0 &&
    Number.isFinite(value.checkedAt) && value.checkedAt > 0 && Array.isArray(value.entries) &&
    value.entries.every(entry => entry && entryPattern.test(entry.path) &&
      ['title', 'body', 'date', 'language', 'source'].every(field => typeof entry[field] === 'string') &&
      ['topics', 'tags', 'authors'].every(field => Array.isArray(entry[field]) && entry[field].every(item => typeof item === 'string')));
}

export function createLibraryCache({storage, fetcher = fetch, now = Date.now, ttlMs = cacheTTLms,
  prepareEntry, withLock = action => action()} = {}) {
  let memory = null;
  let retry = null;
  let inFlight = null;
  const readJSON = name => {try {return JSON.parse(storage?.getItem(name) || 'null');} catch {return null;}};
  const writeJSON = (name, value) => {try {storage?.setItem(name, JSON.stringify(value));} catch { /* Memory caching still works. */ }};

  function read() {
    const stored = readJSON(key);
    if (validSnapshot(stored) && stored.checkedAt <= now() && (!memory || stored.checkedAt >= memory.checkedAt)) memory = stored;
    return memory;
  }

  function readRetry() {
    const stored = readJSON(retryKey);
    if (stored && Number.isFinite(stored.until) && typeof stored.message === 'string') retry = stored;
    return retry?.until > now() ? retry : null;
  }

  async function performRefresh() {
    const cached = read();
    if (cached && now() - cached.checkedAt < ttlMs) return {...cached, stale: false, fromCache: true};
    const cooldown = readRetry();
    if (cooldown) {
      if (cached) return {...cached, stale: true, message: cooldown.message, retryAt: cooldown.until};
      const error = new Error(cooldown.message); error.retryAt = cooldown.until; throw error;
    }
    try {
      const result = await loadLibrary({fetcher, cached, prepareEntry});
      if (result.failed) {
        const error = new Error(`${result.failed} of ${result.total} readings could not load.`);
        error.partial = result; error.retryAt = result.retryAt; throw error;
      }
      memory = {commit: result.commit, entries: result.entries, checkedAt: now()};
      writeJSON(key, memory);
      retry = null; writeJSON(retryKey, null);
      return {...memory, stale: false, fromCache: false};
    } catch (error) {
      retry = {until: Math.max(error.retryAt || 0, now() + 60000), message: error.message};
      writeJSON(retryKey, retry);
      if (cached) return {...cached, stale: true, message: error.message, retryAt: retry.until};
      if (error.partial) return {...error.partial, checkedAt: null, stale: true, message: error.message, retryAt: retry.until};
      error.retryAt = retry.until; throw error;
    }
  }

  function refresh() {
    if (!inFlight) inFlight = Promise.resolve().then(() => withLock(performRefresh)).finally(() => {inFlight = null;});
    return inFlight;
  }
  return {read, refresh};
}
