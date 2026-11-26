import {parseMathMarkdown, renderEquations} from './math.js';
import DOMPurify from 'dompurify';
export function renderMarkdown(entry, root) {
  const {html, equations} = parseMathMarkdown(entry.body);
  root.innerHTML = DOMPurify.sanitize(html, {USE_PROFILES: {html: true}, FORBID_TAGS: ['style', 'form', 'input', 'button', 'img', 'video', 'audio', 'source'], FORBID_ATTR: ['style']});
  root.lang = entry.language || 'en';
  root.querySelectorAll('blockquote').forEach(block => {
    const p = block.querySelector('p');
    if (p && /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/.test(p.textContent)) {
      block.classList.add('annotation');
      p.innerHTML = p.innerHTML.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br>\s*)?/, '');
    }
  });
  renderEquations(root, equations);
}
