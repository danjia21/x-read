import {renderNotesAction} from './source-notes.js';

export function renderListEntry(entry) {
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const card = element('div', '', 'entry');
  const meta = element('div', '', 'entry-meta');
  meta.append(element('span', `Read ${entry.date}`), element('span', entry.topics[0] || 'Reading note'));
  card.append(meta, element('h3', entry.title));
  const detail = element('p', entry.authors.join(' · ') || entry.tags.slice(0, 3).join(' · '), 'entry-detail');
  if (detail.textContent) detail.append(document.createTextNode(' · '));
  detail.append(document.createTextNode(`Published ${entry.published || 'date unknown'}`));
  card.append(detail);
  try {
    const source = new URL(entry.source);
    if (['https:', 'http:'].includes(source.protocol) && !source.username && !source.password) {
      const link = element('a', 'Original source', 'entry-source');
      link.href = source.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const actions = entry.notes?.length ? renderNotesAction(entry, source) : element('div', '', 'entry-actions');
      actions.insertBefore(link, actions.querySelector('p'));
      card.append(actions);
    }
  } catch { /* No source link is shown when the entry has no valid source URL. */ }
  return card;
}
