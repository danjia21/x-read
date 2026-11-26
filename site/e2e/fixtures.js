import {test as base, expect} from '@playwright/test';
import {createReaderServer} from '../server/server.js';

const articles = [
  {slug:'systems', title:'Understanding systems', topic:'Systems', date:'2026-11-20', published:'2026-10-15'},
  {slug:'browsers', title:'Browser rendering', topic:'Web', date:'2026-11-21', published:'2026-10-01'},
  {slug:'networks', title:'Network fundamentals', topic:'Systems', date:'2026-11-22'},
];
const pathFor = article => `reading-journal/entries/2026/${article.slug}.md`;
const markdown = article => `---
format: notes-v1
title: ${article.title}
authors: [Example Author]
source_url: https://example.org/${article.slug}
read_date: '${article.date}'
published: '${article.published || 'unknown'}'
topics: [${article.topic}]
---
# Reading guide

AI-generated annotation for context. Inline $x^2$ and \\(z_i\\).

\\[
p_i=\\frac{e^{z_i}}{\\sum_{j\\in C}e^{z_j}}
\\]

## Cost context

<!-- x-read-anchor {"heading":"Costs","passage":""} -->

$$\\underbrace{a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a}_{\\text{A wide equation}}$$

Costs $6,500 and $3,000. Literal code: \`$x^2$\`.

\`\`\`js
${'long_code_example_'.repeat(30)}
\`\`\`
`;

export const test = base.extend({
  reader: async ({context}, use) => {
    const github = {calls:[], time:Date.now(), status:200};
    const fetcher = async (input, options={}) => {
      const url = new URL(input);
      github.calls.push(url.pathname);
      expect(new Headers(options.headers).has('authorization')).toBe(false);
      if(github.status !== 200) return new Response('',{status:github.status,headers:{'retry-after':'60'}});
      if(url.pathname.includes('/commits/')) return Response.json({sha:github.commit || 'fixture-commit',commit:{tree:{sha:'fixture-tree'}}});
      if(url.pathname.includes('/git/trees/')) return Response.json({tree:articles.map(article=>({type:'blob',path:pathFor(article)}))});
      const article = articles.find(article=>url.pathname.endsWith(pathFor(article)));
      if(article) return new Response(article.slug === 'browsers' && github.articleMarkdown ? github.articleMarkdown : markdown(article));
      throw new Error(`Unexpected upstream request: ${url}`);
    };
    const server = createReaderServer({fetcher,now:()=>github.time});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    await context.route('**/*',async route=>{
      const url = new URL(route.request().url());
      if(url.origin === origin) return route.continue();
      await route.abort();
      expect(['fonts.googleapis.com','fonts.gstatic.com']).toContain(url.hostname);
    });
    try {await use({origin,github});}
    finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  },
});
export {expect};
export async function openLibrary(page, reader) {
  await page.goto(reader.origin);
  await expect(page.getByRole('heading',{name:'All topics (3)'})).toBeVisible({timeout:10000});
}
export async function noOverflow(page) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
