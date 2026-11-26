import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {auditMath} from '../scripts/check-math.js';
import {parseEntry, selectEntries, loadLibrary} from '../src/content.js';
const dom = new JSDOM('<!doctype html><article></article><nav></nav>',{url:'https://reader.example/'});
globalThis.window=dom.window; globalThis.document=dom.window.document;
import {notesEntry} from '../src/library-notes.js';
const {renderMarkdown}=await import('../src/note-markdown.js');
const sample='---\nformat: notes-v1\ntitle: "中文 reading"\nsource_title: "Source"\nsource_url: "https://example.com/source"\nsource_language: en\nentry_language: en\nread_date: "2026-11-21"\ntopics:\n  - "AI Agents"\ntags: [harness]\n---\n# Reading guide\n\n中文 Context.\n\n## Details\n\n<!-- x-read-anchor {"heading":"Details","passage":""} -->\n\n> [!NOTE]\n> **Commentary**\n> Context.\n\n| A | B |\n| - | - |\n| 1 | 2 |';
const notesV1Sample=`---
format: notes-v1
title: Structured notes
source_url: https://example.com/article
read_date: '2026-11-22'
topics: [Systems]
---

# Reading guide

Read the architecture first, then evaluate the performance evidence.

## Hidden costs

<!-- x-read-anchor {"heading":"Architecture","passage":"The service keeps a warm replica for each tenant."} -->

The warm replicas improve latency while increasing idle capacity.

Second paragraph with $x_t$.

## Evidence quality

<!-- x-read-anchor {"heading":"","passage":""} -->

The benchmark does not describe its request distribution.
`;
test('all repository entries parse and render with headings and annotations preserved',async()=>{
  let count=0;
  for(const year of await readdir('../reading-journal/entries')) for(const file of await readdir(`../reading-journal/entries/${year}`)) {
    if(!file.endsWith('.md')) continue;
    const entry=parseEntry(`reading-journal/entries/${year}/${file}`,await readFile(`../reading-journal/entries/${year}/${file}`,'utf8'));
    assert.deepEqual(auditMath(entry.body).issues,[],file);
    assert.ok(entry.title); assert.match(entry.date,/^\d{4}-\d{2}-\d{2}$/);
    renderMarkdown(entry,document.querySelector('article'));
    assert.ok(document.querySelector('article h1')); count++;
  }
  assert.ok(count>20);
});
test('search matches content in both languages and combines with topic filters',()=>{
 const a=notesEntry(parseEntry('a',sample)), b={...a,path:'b',title:'Another',notes:[],topics:['Robotics'],date:'2026-01-01',tags:[]};
 assert.deepEqual(selectEntries([a,b],'中文 context','AI Agents').map(e=>e.path),['a']);
 assert.equal(selectEntries([a,b],'中文','Robotics').length,0);
 assert.equal(selectEntries([a,b],'','','oldest')[0].path,'b');
});
test('notes-v1 keeps Markdown bodies and parses explicit placement anchors',()=>{
 const entry=notesEntry(parseEntry('structured.md',notesV1Sample));
 assert.equal(entry.format,'notes-v1');
 assert.deepEqual(entry.notes.map(({title,section,passage})=>({title,section,passage})),[
  {title:'Reading guide',section:'',passage:''},
  {title:'Hidden costs',section:'Architecture',passage:'The service keeps a warm replica for each tenant.'},
  {title:'Evidence quality',section:'',passage:''},
 ]);
 assert.match(entry.notes[0].body,/Read the architecture/);
 assert.match(entry.notes[1].body,/idle capacity\.\n\nSecond paragraph/);
 assert.doesNotMatch(entry.notes[1].body,/x-read-anchor/);
 assert.deepEqual(selectEntries([entry],'warm replicas').map(item=>item.path),['structured.md']);
});
test('rendering sanitizes active HTML, supports tables and note callouts, and drops remote media',()=>{
 const entry=parseEntry('reading-journal/entries/2026/sample.md',sample+'\n\n<script>alert(1)</script><img src="x" onerror="alert(1)">\n\n[bad](javascript:alert)\n\n[other](other.md)\n\n[asset](../../assets/test.pdf)');
 const root=document.querySelector('article'); renderMarkdown(entry,root);
 assert.equal(root.querySelector('script'),null); assert.equal(root.querySelector('[onerror]'),null);
 assert.equal(root.querySelector('[href^="javascript:"]'),null);
 assert.ok(root.querySelector('table')); assert.ok(root.querySelector('.annotation'));
 assert.equal(root.querySelector('img'),null);
});
function fakeFetch({partial=false,truncated=false,rateLimit=false}={}) {
 const urls=[];
 const fetcher=async(url,options)=>{
   urls.push(url); assert.equal(options.cache,'no-store');
   if(rateLimit) return new Response('',{status:403});
   if(url.includes('/commits/'))return Response.json({sha:'commit-id',commit:{tree:{sha:'tree-id'}}});
   if(url.includes('/git/trees/'))return Response.json({truncated,tree:[{type:'blob',path:'reading-journal/entries/2026/a.md'},{type:'blob',path:'reading-journal/entries/2026/b.md'},{type:'blob',path:'README.md'}]});
   assert.ok(url.includes('/commit-id/'));
   return new Response(sample,{status:partial&&url.endsWith('b.md')?404:200});
 };
 return {fetcher,urls};
}
test('live loading pins all article downloads to the latest commit and excludes documentation',async()=>{
 const {fetcher,urls}=fakeFetch(); const result=await loadLibrary({fetcher});
 assert.equal(result.entries.length,2); assert.equal(urls.length,4);
});
test('partial downloads remain usable; incomplete listing and rate limits are explicit errors',async()=>{
 const result=await loadLibrary(fakeFetch({partial:true})); assert.equal(result.failed,1); assert.equal(result.entries.length,1);
 await assert.rejects(loadLibrary(fakeFetch({truncated:true})),/incomplete/);
 await assert.rejects(loadLibrary(fakeFetch({rateLimit:true})),/limiting requests/);
});
test('list entries link to the publisher and reject unsafe URLs',async()=>{
 const {renderListEntry}=await import('../src/render.js');
 const entry=notesEntry({...parseEntry('reading-journal/entries/2026/sample.md',sample),authors:['Original Author'],source:'https://example.com/source'});
 const card=renderListEntry(entry);
 assert.equal(card.querySelectorAll('a').length,1);
 assert.equal(card.querySelector('button').textContent,'Read with notes');
 const source=card.querySelector('.entry-source');
 assert.equal(source.href,entry.source); assert.equal(source.target,'_blank');
 assert.equal(card.querySelector('.entry-detail').textContent,'Original Author · Published date unknown');
 assert.equal(renderListEntry({...entry,source:'javascript:alert(1)'}).querySelector('.entry-actions'),null);
});

test('publication dates parse independently and sort with unknown dates last',()=>{
 const a={...parseEntry('a',sample+'\n'),published:'2026-10-15'};
 const b={...a,path:'b',title:'Earlier publication',date:'2026-11-22',published:'2026-10-01'};
 const c={...a,path:'c',title:'Unknown publication',published:''};
 assert.equal(parseEntry('p','---\npublished: "2026-10-01"\n---\n').published,'2026-10-01');
 assert.equal(parseEntry('p','---\npublished: unknown\n---\n').published,'');
 const paths=sort=>selectEntries([c,a,b],'','',sort).map(e=>e.path);
 assert.deepEqual(paths('published-newest'),['a','b','c']);
 assert.deepEqual(paths('published-oldest'),['b','a','c']);
 assert.equal(paths('newest')[0],'b');
});

test('math supports all delimiters, annotation blocks, and accessible MathML',()=>{
 const body=String.raw`# Equations

Inline $s_1^2$ and \(z_i\).

$$
\frac{a}{b}
$$

> [!NOTE]
> Conditional distribution:
>
> \[
> p_i=\frac{e^{z_i}}{\sum_{j\in C}e^{z_j}}
> \]
`;
 const root=document.querySelector('article');
 renderMarkdown(parseEntry('math',body),root);
 assert.equal(root.querySelectorAll('.katex').length,4);
 assert.equal(root.querySelectorAll('.katex-display').length,2);
 assert.equal(root.querySelectorAll('math').length,4);
 assert.ok(root.querySelector('.annotation .katex-display'));
 assert.equal(root.querySelector('.math-fallback'),null);
});

test('math leaves currency, escaped dollars, code, and unmatched delimiters alone',()=>{
 const body=String.raw`# Literal text

Costs $6,500 and $3,000; $HOME is a variable. Escaped \$x$ stays literal.

\`$x^2$\` and \`\(x\)\`.

\`\`\`tex
$$x^2$$
\[x\]
\`\`\`

Unmatched $x and \(y.
`.replaceAll('\\`','`');
 const root=document.querySelector('article');
 renderMarkdown(parseEntry('literal',body),root);
 assert.equal(root.querySelector('.katex'),null);
 assert.ok(root.textContent.includes('Costs $6,500 and $3,000; $HOME'));
 assert.ok(root.textContent.includes('Escaped $x$ stays literal.'));
 assert.ok(root.querySelector('pre').textContent.includes('$$x^2$$'));
});

test('invalid formulas remain readable and math cannot inject links or HTML',()=>{
 const root=document.querySelector('article');
 renderMarkdown(parseEntry('invalid',String.raw`# Safety

$\notARealCommand{x}$

$\href{javascript:alert(1)}{click}$

$\htmlClass{evil}{x}$

<span style="position:fixed">Original text</span>`),root);
 assert.ok(root.querySelector('.math-fallback').textContent.includes('notARealCommand'));
 assert.equal(root.querySelector('a[href^="javascript:"]'),null);
 assert.equal(root.querySelector('.evil'),null);
 assert.equal([...root.querySelectorAll('span')].find(node=>node.textContent==='Original text').getAttribute('style'),null);
});

test('migrated RL post-training entry exposes only structured notes',async()=>{
 const path='reading-journal/entries/2026/2026-11-23-llm-post-training-algorithms.md';
 const raw=await readFile(`../${path}`,'utf8');
 const entry=notesEntry(parseEntry(path,raw));
 assert.equal(entry.format,'notes-v1');
 assert.equal(entry.notes[0].title,'Reading guide');
 assert.ok(entry.notes.length >= 2);
 assert.ok(entry.notes.slice(1).every(note=>note.title && (note.section || note.passage)));
 assert.doesNotMatch(raw,/\n> \[!NOTE\]/);
});

test('math audit detects flattened or undelimited TeX without flagging literal code and currency',()=>{
 assert.ok(auditMath(String.raw`J(πθ)=Eτ∼πθ[R(τ)]J(\pi_\theta) = \mathbb{E}_{\tau \sim \pi_\theta}[R(\tau)]J(πθ​)`).issues.length);
 assert.ok(auditMath(String.raw`$\notARealCommand{x}$`).issues.length);
 assert.deepEqual(auditMath('Costs $6,500. Code: `\\frac{a}{b}`.').issues,[]);
 assert.equal(auditMath('$0.8$ and $x_t$').equations,2);
});
