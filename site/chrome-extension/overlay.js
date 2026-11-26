globalThis.placeXReadNotes = function (source, notes) {
  const current = new URL(location.href);
  current.hash = '';
  if (current.href !== source || !document.body) return false;

  for (const host of globalThis.xReadNoteHosts ?? []) host.remove();
  const hosts = [];
  globalThis.xReadNoteHosts = hosts;

  const article = document.querySelector('main article') || document.querySelector('article') ||
    document.querySelector('main, [role="main"]') || document.body;
  const headings = [...article.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  const passages = [...article.querySelectorAll('p, li, blockquote')].filter(node => !node.querySelector('p, li, blockquote'));
  const normalize = text => text.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  const unique = candidates => candidates.length === 1 ? candidates[0] : null;
  const placements = new Map();
  const unplaced = [];

  for (const note of notes) {
    const heading = normalize(note.heading);
    const passage = normalize(note.passage);
    const target = (passage && unique(passages.filter(node => normalize(node.textContent).includes(passage)))) ||
      (heading && unique(headings.filter(node => normalize(node.textContent) === heading))) ||
      (!heading && !passage && (headings.find(node => node.tagName === 'H1') || headings[0]));
    if (!target) {
      unplaced.push(note);
      continue;
    }
    if (!placements.has(target)) placements.set(target, []);
    placements.get(target).push(note);
  }

  function group(title, items) {
    const host = document.createElement('div');
    hosts.push(host);
    const shadow = host.attachShadow({mode: 'closed'});
    const css = new CSSStyleSheet();
    css.replaceSync(`
      :host {
        display: block;
        padding-block: .875rem;
        color-scheme: light dark;
      }

      details {
        box-sizing: border-box;
        background: light-dark(#f2f7f4, #1b2922);
        color: light-dark(#20312a, #e4efe8);
        border: 1px solid light-dark(#c5d8cc, #3e594a);
        border-inline-start: 4px solid light-dark(#418065, #82cba8);
        border-radius: 8px;
        padding: .85rem clamp(.85rem, 3vw, 1.5rem);
        text-align: start;
        font: 1rem/1.75 system-ui, sans-serif;
      }

      summary {
        cursor: pointer;
        color: light-dark(#2c634c, #9cdbba);
        font-size: .875em;
        font-weight: 700;
      }

      summary:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 4px;
        border-radius: 2px;
      }

      .note {
        margin-block-start: .8rem;
        overflow-wrap: anywhere;
      }

      .note + .note {
        margin-block-start: 1rem;
        padding-block-start: 1rem;
        border-block-start: 1px solid light-dark(#c5d8cc, #3e594a);
      }

      .title {
        margin: 0 0 .5em;
        font-size: 1.08em;
        font-weight: 700;
        line-height: 1.45;
      }

      p { margin: 0; white-space: pre-wrap; }
      p + p { margin-block-start: .65em; }
    `);
    shadow.adoptedStyleSheets = [css];
    const details = document.createElement('details');
    details.open = true;
    const label = document.createElement('summary');
    label.textContent = title;
    details.append(label);
    for (const note of items) {
      const content = document.createElement('div');
      content.className = 'note';
      if (note.title) {
        const heading = document.createElement('h3');
        heading.className = 'title';
        heading.textContent = note.title;
        content.append(heading);
      }
      for (const paragraph of note.text.split(/\n{2,}/)) {
        const text = document.createElement('p');
        text.textContent = paragraph;
        content.append(text);
      }
      details.append(content);
    }
    shadow.append(details);
    return host;
  }

  for (const [target, items] of placements) target.after(group('x-read notes', items));
  if (unplaced.length) article.append(group('x-read · Unplaced notes', unplaced));
  return true;
};
