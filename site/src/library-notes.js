import {marked} from 'marked';

function tokenText(token) {
  return token.tokens?.map(part => part.text || part.raw).join('') || token.text || '';
}

function notesV1(body) {
  const groups = [];
  let group = null;
  for (const token of marked.lexer(body)) {
    if (token.type === 'heading' && token.depth === 1) {
      group = {title: tokenText(token).trim(), section: '', passage: '', parts: []};
      groups.push(group);
      continue;
    }
    if (token.type === 'heading' && token.depth === 2) {
      group = {title: tokenText(token).trim(), section: '', passage: '', parts: []};
      groups.push(group);
      continue;
    }
    if (!group) continue;
    if (token.type === 'html') {
      const match = token.raw.trim().match(/^<!--\s*x-read-anchor\s+([\s\S]*?)\s*-->$/);
      if (match) {
        try {
          const anchor = JSON.parse(match[1]);
          group.section = typeof anchor.heading === 'string' ? anchor.heading : '';
          group.passage = typeof anchor.passage === 'string' ? anchor.passage : '';
        } catch { /* Invalid anchors are ignored and caught by entry validation. */ }
        continue;
      }
    }
    group.parts.push(token.raw);
  }
  return groups.map(({parts, ...note}) => ({...note, body: parts.join('').trim()})).filter(note => note.body);
}


export function notesEntry({body, ...entry}) {
  const notes = entry.format === 'notes-v1' ? notesV1(body) : [];
  return {...entry, notes};
}
