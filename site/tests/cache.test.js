import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLibraryCache} from '../src/cache.js';

function fixture() {
  const values = new Map();
  const storage = {getItem:key=>values.get(key)||null, setItem:(key,value)=>values.set(key,value)};
  let time=1_000_000, commit='one', failure=false, partial=false;
  const urls=[];
  const fetcher=async url=>{
    urls.push(url);
    if (failure) throw new Error('Offline');
    if(url.includes('/commits/')) return Response.json({sha:commit,commit:{tree:{sha:'tree'}}});
    if(url.includes('/git/trees/')) return Response.json({tree:['a','b'].map(name=>({type:'blob',path:`reading-journal/entries/2026/${name}.md`}))});
    if (partial && url.endsWith('b.md')) return new Response('',{status:404});
    return new Response('---\ntitle: Article\nread_date: "2026-11-22"\n---\n# Article');
  };
  const options={storage,fetcher,now:()=>time,ttlMs:5000};
  return {options,urls,values,advance:amount=>{time+=amount;},setCommit:value=>{commit=value;},offline:()=>{failure=true;},partial:()=>{partial=true;}};
}

test('fresh persistent cache makes zero requests across reloads; expiry checks only the commit when unchanged', async()=>{
  const f=fixture(); let cache=createLibraryCache(f.options);
  const first=await cache.refresh(); assert.equal(f.urls.length,4); assert.equal(first.fromCache,false);
  f.advance(4999); cache=createLibraryCache(f.options);
  assert.equal(cache.read().entries.length,2);
  assert.equal((await cache.refresh()).fromCache,true); assert.equal(f.urls.length,4);
  f.advance(1); const result=await cache.refresh();
  assert.equal(f.urls.length,5); assert.equal(result.checkedAt,1_005_000); assert.equal(result.stale,false);
});

test('changed commits fetch new contents and replace the cache',async()=>{
  const f=fixture(); const cache=createLibraryCache(f.options); await cache.refresh();
  f.advance(5000); f.setCommit('two'); const result=await cache.refresh();
  assert.equal(f.urls.length,8); assert.equal(result.commit,'two');
  assert.equal(createLibraryCache(f.options).read().commit,'two');
});

test('failed background refresh retains stale data and original check time; retry cooldown survives reload',async()=>{
  const f=fixture(); const cache=createLibraryCache(f.options); const first=await cache.refresh();
  f.advance(5000); f.offline(); const result=await cache.refresh();
  assert.equal(result.stale,true); assert.deepEqual(result.entries,first.entries); assert.equal(result.checkedAt,first.checkedAt);
  const count=f.urls.length; const reloaded=await createLibraryCache(f.options).refresh();
  assert.equal(reloaded.stale,true); assert.equal(f.urls.length,count);
  f.advance(60000); await cache.refresh(); assert.equal(f.urls.length,count+1);
});

test('partial downloads cannot replace a complete cached collection or mark it fresh',async()=>{
  const f=fixture(); const cache=createLibraryCache(f.options); const first=await cache.refresh();
  f.advance(5000); f.setCommit('two'); f.partial(); const result=await cache.refresh();
  assert.equal(result.stale,true); assert.deepEqual(result.entries,first.entries);
  assert.equal(createLibraryCache(f.options).read().commit,'one');
});

test('cold partial downloads remain readable but are not persisted as a complete cache',async()=>{
  const f=fixture(); f.partial(); const cache=createLibraryCache(f.options); const result=await cache.refresh();
  assert.equal(result.entries.length,1); assert.equal(result.checkedAt,null); assert.equal(result.stale,true);
  assert.equal(cache.read(),null);
});

test('corrupt or incompatible storage is ignored and unavailable storage falls back to memory',async()=>{
  const f=fixture(); await createLibraryCache(f.options).refresh();
  const snapshotKey=[...f.values.keys()].find(key=>!key.endsWith(':retry'));
  for(const value of ['{bad',JSON.stringify({commit:'one',checkedAt:1_000_000,entries:[{}]})]) {
    f.values.set(snapshotKey,value); const cache=createLibraryCache(f.options); assert.equal(cache.read(),null); await cache.refresh();
  }
  const blocked={getItem(){throw new Error('blocked');},setItem(){throw new Error('quota');}};
  const cache=createLibraryCache({...f.options,storage:blocked}); await cache.refresh(); const count=f.urls.length;
  await cache.refresh(); assert.equal(f.urls.length,count);
});

test('concurrent requests in a page share a single refresh',async()=>{
  const f=fixture(); const cache=createLibraryCache(f.options);
  const [a,b]=await Promise.all([cache.refresh(),cache.refresh()]);
  assert.equal(a,b); assert.equal(f.urls.length,4);
});

test('tabs sharing a lock recheck storage before fetching',async()=>{
  const f=fixture(); let pending=Promise.resolve();
  const withLock=action=>{const result=pending.then(action);pending=result.catch(()=>{});return result;};
  const a=createLibraryCache({...f.options,withLock}),b=createLibraryCache({...f.options,withLock});
  await Promise.all([a.refresh(),b.refresh()]); assert.equal(f.urls.length,4);
});

test('rate-limit retry headers prevent subsequent requests until the deadline, including after reload',async()=>{
  const f=fixture(); let time=Date.now(); let requests=0;
  const options={...f.options,now:()=>time,fetcher:async()=>{requests++; return new Response('',{status:429,headers:{'retry-after':'300'}});}};
  let retryAt;
  await assert.rejects(createLibraryCache(options).refresh(),error=>{retryAt=error.retryAt;return /limiting/.test(error.message);});
  assert.ok(retryAt>=time+299000);
  await assert.rejects(createLibraryCache(options).refresh(),/limiting/); assert.equal(requests,1);
  time=retryAt+1; await assert.rejects(createLibraryCache(options).refresh(),/limiting/); assert.equal(requests,2);
});

test('raw-content rate limits stop scheduling further downloads',async()=>{
  let downloads=0;
  const {loadLibrary}=await import('../src/content.js');
  const fetcher=async url=>{
    if(url.includes('/commits/')) return Response.json({sha:'one',commit:{tree:{sha:'tree'}}});
    if(url.includes('/git/trees/')) return Response.json({tree:Array.from({length:20},(_,i)=>({type:'blob',path:`reading-journal/entries/2026/${i}.md`}))});
    downloads++;
    return new Response('',{status:429,headers:{'retry-after':'300'}});
  };
  await assert.rejects(loadLibrary({fetcher}),error=>Boolean(error.retryAt));
  assert.ok(downloads<=6);
});
