globalThis.placeXReadNotes = function (source, notes) {
  const current = new URL(location.href);
  current.hash = '';
  if (current.href !== source || !document.body) return false;

  for (const host of globalThis.xReadNoteHosts ?? []) host.remove();
  const hosts = [];
  globalThis.xReadNoteHosts = hosts;

  const article = document.querySelector('main article') || document.querySelector('article') ||
    document.querySelector('main, [role="main"]') || document.body;
  const isArticleContent = node =>
    !node.closest('aside, nav, [role="complementary"], [role="navigation"], [hidden], [aria-hidden="true"]') &&
    node.getClientRects().length;
  const headings = [...article.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(isArticleContent);
  const passages = [...article.querySelectorAll('p, li, blockquote')].filter(node =>
    isArticleContent(node) && !node.querySelector('p, li, blockquote')
  );
  const paragraphs = passages.filter(node =>
    node.tagName === 'P' && node.textContent.trim() && !node.closest('header, [role="banner"]')
  );
  const headingSet = new Set(headings);
  const follows = (first, second) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
  const normalize = text => text.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  const unique = candidates => candidates.length === 1 ? candidates[0] : null;
  const placements = new Map();
  const unplaced = [];

  function hasBlockFlow(parent) {
    const {display, flexDirection} = getComputedStyle(parent);
    if (display === 'contents' && parent.parentElement) return hasBlockFlow(parent.parentElement);
    return !display.includes('grid') && (!display.includes('flex') || flexDirection.startsWith('column'));
  }

  function gridColumnFor(node) {
    if (!getComputedStyle(node.parentElement).display.includes('grid')) return '';
    const {gridColumnStart, gridColumnEnd} = getComputedStyle(node);
    return gridColumnStart === 'auto' || gridColumnStart.startsWith('span ') ?
      '' : `${gridColumnStart} / ${gridColumnEnd}`;
  }

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

  function group(title, items, sample = paragraphs[0] || article) {
    const {fontSize, fontFamily} = getComputedStyle(sample);
    const host = document.createElement('div');
    hosts.push(host);
    const shadow = host.attachShadow({mode: 'closed'});
    const css = new CSSStyleSheet();
    css.replaceSync(`
      :host {
        display: block;
        color-scheme: light dark;
      }

      .frame { padding-block: .875rem 1.25rem; }

      details {
        box-sizing: border-box;
        background: light-dark(#f2f7f4, #1b2922);
        color: light-dark(#20312a, #e4efe8);
        border: 1px solid light-dark(#c5d8cc, #3e594a);
        border-inline-start: 4px solid light-dark(#418065, #82cba8);
        border-radius: 8px;
        padding: .85rem clamp(.85rem, 3vw, 1.5rem);
        text-align: start;
        line-height: 1.75;
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
    details.style.fontSize = fontSize;
    details.style.fontFamily = fontFamily;
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
    const frame = document.createElement('div');
    frame.className = 'frame';
    frame.append(details);
    shadow.append(frame);
    return host;
  }

  for (const [target, items] of placements) {
    const isHeading = headingSet.has(target);
    const sectionEnd = isHeading && headings.find(node => node.tagName <= target.tagName && follows(target, node));
    const paragraph = isHeading && paragraphs.find(node =>
      follows(target, node) && (!sectionEnd || follows(node, sectionEnd))
    );
    const sample = isHeading ? paragraph || undefined : target;
    const proseColumn = paragraph && gridColumnFor(paragraph);
    const targetColumn = gridColumnFor(target);
    if (target.tagName === 'H1' && proseColumn && target.closest('header')) {
      const host = group('x-read notes', items, paragraph);
      host.style.gridColumn = proseColumn;
      paragraph.before(host);
    } else if (targetColumn) {
      const host = group('x-read notes', items, sample);
      host.style.gridColumn = targetColumn;
      target.after(host);
    } else if (hasBlockFlow(target.parentElement)) {
      target.after(group('x-read notes', items, sample));
    } else if (paragraph && (proseColumn || hasBlockFlow(paragraph.parentElement))) {
      const host = group('x-read notes', items, paragraph);
      if (proseColumn) host.style.gridColumn = proseColumn;
      paragraph.before(host);
    } else {
      unplaced.push(...items);
    }
  }
  if (unplaced.length) {
    const host = group('x-read · Unplaced notes', unplaced);
    if (hasBlockFlow(article)) article.append(host);
    else article.after(host);
  }
  return true;
};
