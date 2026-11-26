import './style.css';
import {selectEntries} from './content.js';
import {renderListEntry} from './render.js';
const $ = id => document.getElementById(id);
let entries = [], loading = true, lastChecked = '', failure = '';
let refreshing = false;
const formatChecked = timestamp => new Date(timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
const storage = {get(key) {try {return localStorage.getItem(key);} catch {return null;}}, set(key,value) {try {localStorage.setItem(key,value);} catch { /* Reading remains available when storage is disabled. */ }}};
let csrf = '';
function clearPrivateData() {
  entries=[];
  $('entries').replaceChildren();
  try {for (const key of Object.keys(localStorage)) if(key.startsWith('x-read:library:')) localStorage.removeItem(key);} catch {}
}
async function checkSession() {
  const response=await fetch('/api/session',{cache:'no-store'});
  if(response.status===401) {clearPrivateData(); location.replace('/'); return false;}
  if(!response.ok) throw new Error('Could not verify your session.');
  const session=await response.json(); csrf=session.csrf;
  return true;
}
clearPrivateData();
$('logout').addEventListener('click',async()=>{
  $('logout').disabled=true;
  try {
    const response=await fetch('/auth/logout',{method:'POST',headers:{'x-csrf-token':csrf}});
    if(!response.ok && response.status!==401) throw new Error('Logout failed.');
    clearPrivateData();
    try {localStorage.setItem('x-read-logout',String(Date.now()));} catch {}
    location.replace('/');
  } catch {$('logout').disabled=false; $('status').textContent='Could not sign out. Please try again.';}
});
window.addEventListener('storage',event=>{if(event.key==='x-read-logout') {clearPrivateData();location.replace('/');}});
window.addEventListener('pageshow',event=>{if(event.persisted) {clearPrivateData();location.reload();}});
window.addEventListener('focus',()=>{checkSession().catch(()=>{});});
setInterval(()=>{if(document.visibilityState==='visible') checkSession().catch(()=>{});},60000);
let theme = storage.get('x-read-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function applyTheme() {document.documentElement.dataset.theme=theme; $('theme').textContent=theme==='dark'?'Light mode':'Dark mode';}
applyTheme(); $('theme').onclick=() => {theme=theme==='dark'?'light':'dark'; storage.set('x-read-theme',theme); applyTheme();};
function textElement(tag, text, className) {const el=document.createElement(tag); el.textContent=text; if(className) el.className=className; return el;}
function updateList() {
  const visible=selectEntries(entries,$('search').value,$('topic').value,$('sort').value);
  $('count').textContent=`(${visible.length})`;
  $('topic-heading').textContent=$('topic').value || 'All topics';
  $('entries').replaceChildren();
  for(const entry of visible) $('entries').append(renderListEntry(entry));
  if (!visible.length && !loading && !failure) $('entries').append(textElement('p',entries.length?'No readings match. Try a different search or topic.':'The library has no entries yet.','empty'));
  $('status').textContent=loading ? (lastChecked ? `Last checked ${lastChecked} · Checking for updates…` : 'Fetching the latest readings…') : failure || `Last checked ${lastChecked}`;
}
function updateTopics() {
  const selected=$('topic').value;
  const counts = new Map();
  for (const entry of entries) for (const topic of new Set(entry.topics)) counts.set(topic, (counts.get(topic) || 0) + 1);
  $('topic').replaceChildren(new Option(`All topics (${entries.length})`,''), ...[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([topic,count])=>new Option(`${topic} (${count})`,topic)));
  $('topic').value=counts.has(selected) ? selected : '';
}
async function refresh() {
  if (refreshing) return;
  refreshing=true; loading=true; failure=''; $('retry').hidden=true;
  updateTopics(); updateList();
  try {
    if(!await checkSession()) return;
    const response=await fetch('/api/library',{cache:'no-store'});
    if(response.status===401) {clearPrivateData();location.replace('/');return;}
    const result=await response.json();
    if(!response.ok) {const error=new Error(result.error || 'Could not load readings.');error.retryAt=result.retryAt;throw error;}
    entries=result.entries;
    lastChecked=result.checkedAt ? formatChecked(result.checkedAt) : '';
    if (result.stale) {
      const context=lastChecked ? `Showing cached readings (last checked ${lastChecked}).` : 'Showing available readings.';
      failure=`${context} ${result.message} Retry after ${formatChecked(result.retryAt)}.`;
      $('retry').hidden=false;
    }
  } catch(error) {
    failure=`${error.message} ${error.retryAt ? `Retry after ${formatChecked(error.retryAt)}.` : 'Please try again.'}`;
    $('retry').hidden=false;
  } finally {refreshing=false; loading=false; updateTopics(); updateList();}
}
$('search').addEventListener('input',updateList);
$('topic').addEventListener('change',updateList);
$('sort').addEventListener('change',updateList);
$('retry').addEventListener('click',refresh);
refresh();
