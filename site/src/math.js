import {Marked} from 'marked';
import katex from 'katex';

// Tokenize before Markdown consumes backslashes, emphasis, or underscores.
// Marked keeps fenced and inline code out of these extensions.
export function parseMathMarkdown(source) {
  const equations = [];
  const matchMath = src => {
    const open = ['$$', '\\[', '\\(', '$'].find(delimiter => src.startsWith(delimiter));
    if (!open) return;
    const display = open === '$$' || open === '\\[';
    const close = open === '\\[' ? '\\]' : open === '\\(' ? '\\)' : open;
    if (open === '$' && (/\s|\$/.test(src[1] || ' ') || /^\$\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/.test(src))) return;
    for (let end = src.indexOf(close, open.length); end !== -1; end = src.indexOf(close, end + close.length)) {
      let slashes = 0;
      for (let i = end - 1; src[i] === '\\'; i--) slashes++;
      if (slashes % 2) continue;
      const text = src.slice(open.length, end);
      if (!display && text.includes('\n')) return;
      if (open === '$' && (text.includes('\\$') || /\s$/.test(text) || /\d/.test(src[end + 1] || ''))) return;
      if (!text.trim()) return;
      return {raw:src.slice(0, end + close.length), text, display};
    }
  };
  const extension = level => ({
    name:`math-${level}`, level,
    start:src => level === 'block' ? src.search(/^ {0,3}(?:\$\$|\\\[)/m) : src.search(/\$|\\[([]/),
    tokenizer(src) {
      const match = matchMath(src);
      if (!match || (level === 'block' && !match.display)) return;
      return {type:`math-${level}`, ...match};
    },
    renderer(token) {
      const index = equations.push(token) - 1;
      return `<span data-equation="${index}"></span>${level === 'block' ? '\n' : ''}`;
    },
  });
  return {html:new Marked({extensions:[extension('block'), extension('inline')]}).parse(source), equations};
}

export function renderEquations(root, equations) {
  root.querySelectorAll('[data-equation]').forEach(node => {
    const equation = equations[Number(node.dataset.equation)];
    node.removeAttribute('data-equation');
    if (!equation) return;
    try {
      katex.render(equation.text, node, {displayMode:equation.display, trust:false,
        throwOnError:true, strict:'ignore', maxExpand:1000, maxSize:20});
    } catch {
      node.textContent = equation.raw;
      node.className = 'math-fallback';
      node.title = 'This equation could not be rendered.';
    }
  });
}
