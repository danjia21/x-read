import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAuth,readConfig} from './auth.js';
import {createReaderServer} from './server.js';

const config={origin:'https://reader.example',secure:true,clientID:'client',clientSecret:'secret',allowedUserID:'123',ttlMs:300000};
const cookieFrom=response=>response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
function fixture() {
  let userID=123, denied=false, time=Date.now();
  const calls=[];
  const fetcher=async(url,options={})=>{
    calls.push({url,options});
    if(url.endsWith('/login/oauth/access_token')) {
      const body=new URLSearchParams(options.body);
      assert.equal(body.get('client_secret'),'secret');
      if(body.get('grant_type')==='refresh_token') return Response.json({access_token:'new-token',token_type:'bearer',refresh_token:'new-refresh',expires_in:28800});
      return Response.json({access_token:'private-token',token_type:'bearer',refresh_token:'refresh',expires_in:28800});
    }
    if(url.endsWith('/user')) return Response.json({id:userID,login:'owner'});
    if(denied) return new Response('',{status:401});
    assert.match(options.headers.authorization,/^Bearer /);
    if(url.includes('/commits/')) return Response.json({sha:'commit',commit:{tree:{sha:'tree'}}});
    if(url.includes('/git/trees/')) return Response.json({tree:[{type:'blob',path:'reading-journal/entries/2026/test.md'}]});
    if(url.includes('/contents/')) {assert.equal(options.headers.accept,'application/vnd.github.raw+json');return new Response('---\nformat: notes-v1\ntitle: Private notes\nsource_url: https://example.com/article\n---\n# Reading guide\n\nPrivate journal note.');}
    throw new Error('Unexpected GitHub request');
  };
  return {fetcher,calls,now:()=>time,advance:ms=>{time+=ms;},setUser:id=>{userID=id;},deny:()=>{denied=true;}};
}

test('configuration fails closed without credentials, immutable account ID, or HTTPS',()=>{
 assert.throws(()=>readConfig({PUBLIC_URL:config.origin}),/Configure/);
 assert.throws(()=>readConfig({PUBLIC_URL:'http://reader.example'}),/HTTPS/);
 assert.throws(()=>readConfig({PUBLIC_URL:'https://reader.example/subpath'}),/HTTPS/);
 const env={PUBLIC_URL:config.origin,GITHUB_CLIENT_ID:'client',GITHUB_CLIENT_SECRET:'secret',GITHUB_ALLOWED_USER_ID:'123'};
 assert.equal(readConfig(env).ttlMs,300000);
 assert.throws(()=>readConfig({...env,CACHE_TTL_SECONDS:'NaN'}),/CACHE_TTL/);
 assert.throws(()=>readConfig({...env,GITHUB_ALLOWED_USER_ID:'owner'}),/numeric/);
});

test('OAuth state is browser-bound, single-use, expires, and includes PKCE',async()=>{
 const f=fixture(),auth=createAuth(config,f);
 const start=auth.start({headers:{}}), url=new URL(start.location);
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 const callback=new URL(`${config.origin}/auth/callback?state=${url.searchParams.get('state')}&code=code`);
 await assert.rejects(auth.callback({headers:{}},callback),/expired/);
 const request={headers:{cookie:start.cookie.split(';')[0]}};
 const cookies=await auth.callback(request,callback);
 const exchange=new URLSearchParams(f.calls[0].options.body);
 assert.equal(createHash('sha256').update(exchange.get('code_verifier')).digest('base64url'),url.searchParams.get('code_challenge'));
 assert.match(cookies[0],/HttpOnly; SameSite=Lax; Max-Age=86400; Secure/);
 assert.ok(!cookies[0].includes('private-token'));
 await assert.rejects(auth.callback(request,callback),/expired/);
 const expired=auth.start({headers:{}}), expiredURL=new URL(expired.location);f.advance(600001);
 await assert.rejects(auth.callback({headers:{cookie:expired.cookie.split(';')[0]}},new URL(`${config.origin}/auth/callback?state=${expiredURL.searchParams.get('state')}&code=code`)),/expired/);
});

test('unapproved GitHub accounts receive no session',async()=>{
 const f=fixture();f.setUser(456);const auth=createAuth(config,f), start=auth.start({headers:{}});
 const state=new URL(start.location).searchParams.get('state');
 await assert.rejects(auth.callback({headers:{cookie:start.cookie.split(';')[0]}},new URL(`${config.origin}/auth/callback?state=${state}&code=code`)),/not authorized/);
});

test('expiring user tokens refresh and rotate only once for concurrent requests',async()=>{
 const f=fixture(),auth=createAuth(config,f),start=auth.start({headers:{}});
 const state=new URL(start.location).searchParams.get('state');
 const cookies=await auth.callback({headers:{cookie:start.cookie.split(';')[0]}},new URL(`${config.origin}/auth/callback?state=${state}&code=code`));
 const session=auth.session({headers:{cookie:cookies[0].split(';')[0]}});
 f.advance(28800000-30000);
 assert.deepEqual(await Promise.all([auth.token(session),auth.token(session)]),['new-token','new-token']);
 assert.equal(f.calls.filter(call=>new URLSearchParams(call.options.body).get('grant_type')==='refresh_token').length,1);
 assert.equal(session.refreshToken,'new-refresh');
});

test('protected routes, server caching, CSRF logout, and revoked access work end to end',async t=>{
 const f=fixture(),dist=await mkdtemp(join(tmpdir(),'x-read-auth-'));
 await writeFile(join(dist,'index.html'),'<h1>PRIVATE READER SHELL</h1>');
 await writeFile(join(dist,'asset.js'),'PRIVATE ASSET');
 const server=createReaderServer(config,{...f,dist});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(dist,{recursive:true});});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const request=(path,options={})=>fetch(origin+path,{redirect:'manual',...options});
 const landing=await request('/');assert.match(await landing.text(),/Sign in with GitHub/);assert.equal(landing.headers.get('cache-control'),'no-store');
 assert.equal((await request('/asset.js')).status,401);
 assert.equal((await request('/api/library')).status,401);
 assert.equal((await request('/api/session')).status,401);
 const start=await request('/auth/login'),state=new URL(start.headers.get('location')).searchParams.get('state');
 const callback=await request(`/auth/callback?state=${state}&code=code`,{headers:{cookie:cookieFrom(start)}});
 assert.equal(callback.status,302);const cookie=cookieFrom(callback),headers={cookie};
 assert.match(await (await request('/',{headers})).text(),/PRIVATE READER SHELL/);
 assert.equal((await request('/%2e%2e%2fpackage.json',{headers})).status,404);
 const session=await (await request('/api/session',{headers})).json();assert.ok(session.csrf);
 const library=await (await request('/api/library',{headers})).json();assert.equal(library.entries[0].body,undefined);
 assert.match(library.entries[0].notes[0].body,/Private journal note/);
 assert.ok(!JSON.stringify(library).includes('private-token'));
 const count=f.calls.length;await request('/api/library',{headers});assert.equal(f.calls.length,count);
 f.advance(300001);f.deny();assert.equal((await request('/api/library',{headers})).status,401);
 assert.equal((await request('/',{headers})).headers.get('clear-site-data'),'"cache", "storage"');
 // Sign in again to test logout separately from token revocation.
 const start2=await request('/auth/login'), state2=new URL(start2.headers.get('location')).searchParams.get('state');
 const callback2=await request(`/auth/callback?state=${state2}&code=code`,{headers:{cookie:cookieFrom(start2)}});
 const headers2={cookie:cookieFrom(callback2)};
 const session2=await (await request('/api/session',{headers:headers2})).json();
 assert.equal((await request('/auth/logout',{headers:headers2})).status,405);
 assert.equal((await request('/auth/logout',{method:'POST',headers:headers2})).status,403);
 assert.equal((await request('/auth/logout',{method:'POST',headers:{...headers2,origin:'https://evil.example','x-csrf-token':session2.csrf}})).status,403);
 const logout=await request('/auth/logout',{method:'POST',headers:{...headers2,origin:config.origin,'x-csrf-token':session2.csrf}});
 assert.equal(logout.status,200);assert.equal(logout.headers.get('clear-site-data'),'"cache", "storage"');
 assert.equal((await request('/api/library',{headers:headers2})).status,401);
});
