import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readConfig, createAuth} from './auth.js';
import {createLibraryCache} from '../src/cache.js';
import {repository} from '../src/content.js';
import {notesEntry} from '../src/library-notes.js';

const loginPage = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>x-read · Sign in</title><link rel="stylesheet" href="/auth/style.css"><main><h1>x-read</h1><p>A private reading collection.</p><a class="sign-in" href="/auth/login">Sign in with GitHub</a><p class="hint">Access is restricted to the collection owner.</p></main></html>`;
const loginCSS = `:root{color-scheme:light dark;font:17px/1.6 system-ui;background:light-dark(#fafbf9,#131c19);color:light-dark(#202d2a,#e6ede7)}body{margin:0;min-height:100dvh;display:grid;place-items:center}main{max-width:28rem;padding:2rem}h1{font-size:2rem;letter-spacing:-.06em}.sign-in{display:inline-block;margin:1rem 0;padding:.65rem 1rem;border:1px solid currentColor;border-radius:6px;color:inherit;text-decoration:none}.hint{font-size:.85rem;opacity:.7}`;

export function createReaderServer(config, {fetcher=fetch, now=Date.now, dist=resolve(fileURLToPath(new URL('../dist/',import.meta.url)))} = {}) {
  const auth=createAuth(config,{fetcher,now});
  const security = {'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-frame-options':'DENY',
    'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",'x-robots-tag':'noindex, nofollow'};
  const send = (res,status,body,type='text/plain; charset=utf-8',extra={})=>{res.writeHead(status,{...security,'content-type':type,...extra});res.end(body);};
  const json = (res,status,value,extra={})=>send(res,status,JSON.stringify(value),'application/json; charset=utf-8',extra);
  const redirect = (res,location,cookies)=>send(res,302,'','text/plain',{location,...(cookies?{'set-cookie':cookies}:{})});

  return createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,config.origin), path=url.pathname;
      if(req.method !== 'GET' && !(req.method==='POST' && path==='/auth/logout')) return send(res,405,'Method not allowed');
      if(path==='/healthz') return send(res,200,'ok');
      if(path==='/auth/style.css') return send(res,200,loginCSS,'text/css');
      if(path==='/auth/login') {const result=auth.start(req);return redirect(res,result.location,result.cookie);}
      if(path==='/auth/callback') {
        try {return redirect(res,'/',await auth.callback(req,url));}
        catch {return send(res,403,'Sign-in failed. This reader is restricted to its owner. Return to /auth/login to try again.','text/plain',{'set-cookie':auth.clearCookies()});}
      }
      const session=auth.session(req);
      if(!session) {
        if(path.startsWith('/api/') || path==='/auth/logout') return json(res,401,{error:'Sign in with GitHub to continue.'});
        if(path==='/' || path==='/index.html') return send(res,200,loginPage,'text/html; charset=utf-8',{'clear-site-data':'"cache", "storage"'});
        return send(res,401,'Sign in with GitHub to continue.');
      }
      if(path==='/auth/logout') {
        if(req.method!=='POST') return send(res,405,'Method not allowed');
        if(req.headers.origin!==config.origin || req.headers['x-csrf-token']!==session.csrf) return json(res,403,{error:'Invalid logout request.'});
        auth.destroy(req);
        return json(res,200,{ok:true},{'set-cookie':auth.clearCookies(),'clear-site-data':'"cache", "storage"'});
      }
      if(path==='/api/session') return json(res,200,{login:session.login,csrf:session.csrf});
      if(path==='/api/library') {
        const authenticatedFetch=async(input,options={})=>{
          let target=new URL(input);
          if(target.hostname==='raw.githubusercontent.com') {
            const prefix=`/${repository}/`;
            if(!target.pathname.startsWith(prefix)) throw new Error('Invalid repository request');
            const [commit,...file]=target.pathname.slice(prefix.length).split('/');
            target=new URL(`https://api.github.com/repos/${repository}/contents/${file.join('/')}?ref=${encodeURIComponent(commit)}`);
            options={...options,headers:{accept:'application/vnd.github.raw+json'}};
          }
          if(target.origin!=='https://api.github.com' || !target.pathname.startsWith(`/repos/${repository}/`)) throw new Error('Invalid GitHub request');
          let token;
          try {token=await auth.token(session);} catch {auth.destroy(req);const error=new Error('Sign-in expired.');error.unauthorized=true;throw error;}
          const response=await fetcher(target.href,{...options,redirect:'error',headers:{accept:'application/vnd.github+json','user-agent':'x-read-private-reader',...options.headers,authorization:`Bearer ${token}`}});
          if(response.status===401 || (response.status===403 && response.headers.get('x-ratelimit-remaining')!=='0' && !response.headers.get('retry-after')) || response.status===404) {
            auth.destroy(req); const error=new Error('Repository access is unavailable. Sign in again and check the GitHub App installation.'); error.unauthorized=true; throw error;
          }
          return response;
        };
        // Cache is server-side and session-scoped, so private data never persists in browser storage.
        session.cache ||= createLibraryCache({fetcher:authenticatedFetch,now,ttlMs:config.ttlMs,prepareEntry:notesEntry});
        try {
          const result=await session.cache.refresh();
          if(auth.session(req)!==session) return json(res,401,{error:'Sign in again to access this repository.'});
          return json(res,200,result);
        } catch(error) {
          if(auth.session(req)!==session) return json(res,401,{error:'Sign in again to access this repository.'});
          return json(res,503,{error:'The collection could not be refreshed. Please try again later.',retryAt:error.retryAt});
        }
      }
      if(path.startsWith('/api/') || path.startsWith('/auth/')) return send(res,404,'Not found');
      let relative;
      try {relative=decodeURIComponent(path).replace(/^\/+/, '') || 'index.html';} catch {return send(res,400,'Bad path');}
      const file=resolve(dist,relative);
      if(!file.startsWith(`${dist}/`) || relative.split('/').some(part=>part.startsWith('.'))) return send(res,404,'Not found');
      const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
      try {return send(res,200,await readFile(file),types[extname(file)]||'application/octet-stream');}
      catch {return send(res,404,'Not found');}
    } catch {if(!res.headersSent) send(res,502,'Request could not be completed. Please try again.');else res.end();}
  });
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const config=readConfig();
  createReaderServer(config).listen(config.port,config.host,()=>console.log(`Private reader listening on port ${config.port}`));
}
