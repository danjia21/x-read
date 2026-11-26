import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cacheTTLms} from '../src/config.js';
import {createLibraryCache} from '../src/cache.js';
import {notesEntry} from '../src/library-notes.js';

export function createReaderServer({ttlMs = cacheTTLms, fetcher = fetch, now = Date.now,
  dist = fileURLToPath(new URL('../dist', import.meta.url))} = {}) {
  const library = createLibraryCache({fetcher, now, ttlMs,
    prepareEntry: entry => entry.format === 'notes-v1' ? notesEntry(entry) : null});
  const security = {'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-frame-options':'DENY',
    'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
  const send = (res,status,body,type='text/plain; charset=utf-8',extra={})=>{res.writeHead(status,{...security,'content-type':type,...extra});res.end(body);};
  const json = (res,status,value,extra={})=>send(res,status,JSON.stringify(value),'application/json; charset=utf-8',extra);

  return createServer(async(req,res)=>{
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if(req.method !== 'GET') return send(res,405,'Method not allowed');
      if(path==='/healthz') return send(res,200,'ok');
      if(path==='/api/library') {
        try {
          return json(res,200,await library.refresh());
        } catch(error) {
          return json(res,503,{error:'The library could not be loaded from GitHub.',retryAt:error.retryAt});
        }
      }
      if(path.startsWith('/api/')) return send(res,404,'Not found');
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
  const ttlMs = Number(process.env.CACHE_TTL_SECONDS || cacheTTLms / 1000) * 1000;
  if (!Number.isFinite(ttlMs) || ttlMs < 0 || ttlMs > 3600000) {
    throw new Error('CACHE_TTL_SECONDS must be between 0 and 3600.');
  }
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  createReaderServer({ttlMs}).listen(port,host,()=>console.log(`x-read listening on port ${port}`));
}
