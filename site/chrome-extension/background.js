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

  const tab = await chrome.tabs.create({url: message.source, active: false});
  try {
    await chrome.storage.session.set({['notes:' + tab.id]: {source, notes: message.notes}});
    await chrome.action.setBadgeText({tabId: tab.id, text: 'ON'});
    await chrome.action.setTitle({tabId: tab.id, title: 'Click to place x-read notes on this article'});
    await chrome.tabs.update(tab.id, {active: true});
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

chrome.action.onClicked.addListener(async tab => {
  const key = 'notes:' + tab.id;
  const item = (await chrome.storage.session.get(key))[key];
  if (!item || publisherURL(tab.url) !== item.source) {
    await chrome.action.setTitle({tabId: tab.id, title: 'Open this article with notes from x-read first'});
    return;
  }

  try {
    // Only the active tab receives the annotations, after the toolbar click.
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['overlay.js']});
    const [{result}] = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: (source, notes) => globalThis.placeXReadNotes(source, notes),
      args: [item.source, item.notes],
    });
    if (!result) return;
    await chrome.action.setBadgeText({tabId: tab.id, text: ''});
    await chrome.action.setTitle({tabId: tab.id, title: 'Show x-read notes again'});
  } catch {
    await chrome.action.setTitle({tabId: tab.id, title: 'Could not place notes. Wait for the article to load and try again.'});
  }
});

chrome.tabs.onRemoved.addListener(tabId => chrome.storage.session.remove('notes:' + tabId));
