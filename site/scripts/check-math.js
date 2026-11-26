import {readFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
import katex from 'katex';
import {parseEntry} from '../src/content.js';
import {parseMathMarkdown} from '../src/math.js';

const repositoryRoot=fileURLToPath(new URL('../../',import.meta.url));

export function auditMath(source) {
  const {html,equations}=parseMathMarkdown(source);
  const issues=[];
  for(const equation of equations) {
    try {katex.renderToString(equation.text,{displayMode:equation.display,trust:false,throwOnError:true,strict:'ignore',maxExpand:1000,maxSize:20});}
    catch(error) {issues.push(`Invalid equation ${JSON.stringify(equation.text.trim())}: ${error.message}`);}
  }
  const document=new JSDOM(html).window.document;
  document.querySelectorAll('pre,code,[data-equation]').forEach(node=>node.remove());
  const text=document.body.textContent;
  if(/\\(?:frac|mathbb|mathcal|nabla|theta|epsilon|pi|sum|prod|hat|begin)\b/.test(text)) issues.push('TeX commands outside math delimiters; check for flattened or unmatched equations.');
  if(/[πθτϵ∑∏∫∇][^\n]{0,160}\u200b/.test(text)) issues.push('Possible flattened KaTeX copies; recover the original TeX instead of guessing.');
  document.defaultView.close();
  return {equations:equations.length,issues};
}

async function markdownFiles(directory) {
  const files=[];
  for(const item of await readdir(directory,{withFileTypes:true})) {
    const path=resolve(directory,item.name);
    if(item.isDirectory()) files.push(...await markdownFiles(path));
    else if(item.name.endsWith('.md')) files.push(path);
  }
  return files;
}

async function main() {
  const paths=process.argv.slice(2).length ? process.argv.slice(2).map(path=>resolve(repositoryRoot,path)) : await markdownFiles(resolve(repositoryRoot,'reading-journal/entries'));
  let equations=0,failed=0;
  for(const path of paths) {
    const result=auditMath(parseEntry(path,await readFile(path,'utf8')).body);
    equations+=result.equations;
    if(result.issues.length) {failed++;console.error(`${path}\n${result.issues.map(issue=>`  ${issue}`).join('\n')}`);}
  }
  console.log(`Checked ${paths.length} entries and ${equations} equations; ${failed} entries need review.`);
  process.exitCode=failed ? 1 : 0;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();
