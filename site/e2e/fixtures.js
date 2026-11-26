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
    const github = {userID:123, calls:[], time:Date.now(), limited:false, revoked:false};
    const fetcher = async (input, options={}) => {
      const url = new URL(input);
      github.calls.push(url.pathname);
      if(url.pathname === '/login/oauth/access_token') {
        const body = new URLSearchParams(options.body);
        expect(body.get('code_verifier')).toBeTruthy();
        return Response.json({access_token:'TEST-PRIVATE-TOKEN',token_type:'bearer',expires_in:28800});
      }
      expect(options.headers.authorization).toBe('Bearer TEST-PRIVATE-TOKEN');
      if(url.pathname === '/user') return Response.json({id:github.userID,login:'test-owner'});
      if(github.revoked) return new Response('',{status:401});
      if(github.limited) return new Response('',{status:429,headers:{'retry-after':'60'}});
      if(url.pathname.includes('/commits/')) return Response.json({sha:github.commit || 'fixture-commit',commit:{tree:{sha:'fixture-tree'}}});
      if(url.pathname.includes('/git/trees/')) return Response.json({tree:articles.map(article=>({type:'blob',path:pathFor(article)}))});
      const article = articles.find(article=>url.pathname.endsWith(pathFor(article)));
      if(article) return new Response(article.slug === 'browsers' && github.articleMarkdown ? github.articleMarkdown : markdown(article));
      throw new Error(`Unexpected upstream request: ${url}`);
    };
    const config = {origin:'http://127.0.0.1',secure:false,clientID:'test-client',clientSecret:'test-secret',allowedUserID:'123',ttlMs:300000};
    const server = createReaderServer(config,{fetcher,now:()=>github.time});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    config.origin = `http://127.0.0.1:${server.address().port}`;
    // Execute the real login endpoint, then replace only the provider hop.
    // Playwright routing does not intercept subsequent hops in a redirect chain.
    await context.route('**/*',async route=>{
      const url = new URL(route.request().url());
      if(url.origin !== config.origin) {
        await route.abort();
        if (github.articleMarkdown && route.request().resourceType() === 'image') return;
        expect(['fonts.googleapis.com','fonts.gstatic.com']).toContain(url.hostname);
        return;
      }
      if(url.pathname !== '/auth/login') return route.continue();
      const response = await route.fetch({maxRedirects:0});
      const provider = new URL(response.headers().location);
      expect(provider.origin+provider.pathname).toBe('https://github.com/login/oauth/authorize');
      expect(provider.searchParams.get('code_challenge_method')).toBe('S256');
      expect(provider.searchParams.get('redirect_uri')).toBe(`${config.origin}/auth/callback`);
      const callback=`${config.origin}/auth/callback?code=fixture-code&state=${provider.searchParams.get('state')}`;
      // A tiny simulated consent page also works in WebKit, which cannot fulfill
      // an intercepted request with a synthetic redirect status.
      await route.fulfill({status:200,headers:{'content-type':'text/html','set-cookie':response.headers()['set-cookie']},
        body:`<!doctype html><meta http-equiv="refresh" content="0;url=${callback.replaceAll('&','&amp;')}"><title>Simulated GitHub consent</title>`});
    });
    try {await use({origin:config.origin,github});}
    finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  },
});
export {expect};
export async function signIn(page, reader) {
  await page.goto(reader.origin);
  await page.getByRole('link',{name:'Sign in with GitHub'}).click();
  await expect(page.getByRole('heading',{name:'All topics (3)'})).toBeVisible({timeout:10000});
}
export async function noOverflow(page) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
