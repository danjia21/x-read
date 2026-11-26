import {renderMarkdown} from './note-markdown.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function noteText(container) {
  for (const math of container.querySelectorAll('.katex')) {
    math.replaceWith(document.createTextNode(math.querySelector('annotation')?.textContent || math.textContent));
  }
  return [...container.children].map(node => node.textContent.trim()).filter(Boolean).join('\n\n');
}

function extensionNotes(entry) {
  return entry.notes.map(note => {
    const body = element('div');
    renderMarkdown({...entry, body: note.body}, body);
    return {heading: note.section, passage: note.passage, title: note.title, text: noteText(body)};
  }).filter(note => note.text);
}

export function renderNotesAction(entry, source) {
  const actions = element('div', '', 'entry-actions');
  const open = element('button', 'Read with notes');
  open.type = 'button';
  const status = element('p', '', 'entry-action-status');
  status.setAttribute('role', 'status');
  actions.append(open, status);
  open.addEventListener('click', () => {
    const notes = extensionNotes(entry);
    if (!notes.length) {
      status.textContent = 'No reading notes for this entry.';
      return;
    }
    open.disabled = true;
    const id = crypto.randomUUID();
    const finish = message => {
      window.removeEventListener('message', handleResult);
      clearTimeout(timeout);
      status.textContent = message;
      open.disabled = false;
    };
    const handleResult = event => {
      if (event.source !== window || event.origin !== location.origin ||
          event.data?.type !== 'x-read:extension-result' || event.data.id !== id) return;
      finish(event.data.ok
        ? 'Click the x-read Notes icon in the article tab to place your notes.'
        : 'The extension could not open this article. You can still open the original.');
    };
    window.addEventListener('message', handleResult);
    const timeout = setTimeout(() => finish('Install or reload the x-read Notes Chrome extension, then refresh this page.'), 2500);
    window.postMessage({type: 'x-read:open-with-notes', id, source: source.href, notes}, location.origin);
  });
  return actions;
}
