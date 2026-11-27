function publisherURL(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

async function openArticle(message) {
  const source = publisherURL(message.source);
  if (!source || !Array.isArray(message.notes) || !message.notes.length || message.notes.length > 250 ||
      message.notes.some(note => typeof note?.heading !== 'string' || note.heading.length > 500 ||
        typeof note.passage !== 'string' || note.passage.length > 250 ||
        (note.title !== undefined && (typeof note.title !== 'string' || note.title.length > 500)) ||
        typeof note.text !== 'string' || !note.text.trim() || note.text.length > 16000)) return {ok: false};

  const tab = await chrome.tabs.create({active: false});
  try {
    await chrome.storage.session.set({['notes:' + tab.id]: {source, notes: message.notes}});
    await chrome.action.setBadgeText({tabId: tab.id, text: 'ON'});
    await chrome.action.setTitle({tabId: tab.id, title: 'Click to place x-read notes on this article'});
    await chrome.tabs.update(tab.id, {url: message.source, active: true});
    return {ok: true};
  } catch {
    await chrome.storage.session.remove('notes:' + tab.id);
    await chrome.tabs.remove(tab.id).catch(() => {});
    return {ok: false};
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!sender.tab || sender.frameId !== 0 || message?.type !== 'x-read:open-with-notes') return;
  openArticle(message).then(respond, () => respond({ok: false}));
  return true;
});

async function placeNotes(tabId, item) {
  await chrome.scripting.executeScript({target: {tabId}, files: ['overlay.js']});
  const [{result}] = await chrome.scripting.executeScript({
    target: {tabId},
    func: (source, notes) => globalThis.placeXReadNotes(source, notes),
    args: [item.source, item.notes],
  });
  if (result) {
    await chrome.action.setBadgeText({tabId, text: ''});
    await chrome.action.setTitle({tabId, title: 'Show x-read notes again'});
  }
}

async function autoPlace(tab, requestAccess = false) {
  const key = 'notes:' + tab.id;
  const item = (await chrome.storage.session.get(key))[key];
  if (!item) return;

  const source = new URL(item.source);
  const pattern = `${source.protocol}//${source.hostname}/*`;
  if (await chrome.permissions.contains({origins: [pattern]})) {
    if (publisherURL(tab.url) === item.source) await placeNotes(tab.id, item);
  } else if (requestAccess && (!tab.url || publisherURL(tab.url) === item.source)) {
    await chrome.permissions.addHostAccessRequest?.({tabId: tab.id, pattern});
  }
}

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === 'complete') autoPlace(tab, true).catch(() => {});
});

chrome.permissions.onAdded.addListener(async ({origins}) => {
  if (!origins?.length) return;
  const tabs = await chrome.tabs.query({status: 'complete'});
  await Promise.allSettled(tabs.map(tab => autoPlace(tab)));
});

chrome.action.onClicked.addListener(async tab => {
  const key = 'notes:' + tab.id;
  const item = (await chrome.storage.session.get(key))[key];
  if (!item || publisherURL(tab.url) !== item.source) {
    await chrome.action.setTitle({tabId: tab.id, title: 'Open this article with notes from x-read first'});
    return;
  }

  try {
    await placeNotes(tab.id, item);
  } catch {
    await chrome.action.setTitle({tabId: tab.id, title: 'Could not place notes. Wait for the article to load and try again.'});
  }
});

chrome.tabs.onRemoved.addListener(tabId => chrome.storage.session.remove('notes:' + tabId));
