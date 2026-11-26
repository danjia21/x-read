import './style.css';
import {selectEntries} from './content.js';
import {renderListEntry} from './render.js';
const $ = id => document.getElementById(id);
let entries = [], loading = true, lastChecked = '', failure = '';
let refreshing = false;
const formatChecked = timestamp => new Date(timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
const storage = {get(key) {try {return localStorage.getItem(key);} catch {return null;}}, set(key,value) {try {localStorage.setItem(key,value);} catch { /* Reading remains available when storage is disabled. */ }}};
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
  $('status').textContent=loading ? (lastChecked ? `Last checked ${lastChecked} · Checking for updates…` : 'Fetching the latest readings…') : failure || (lastChecked ? `Last checked ${lastChecked}` : '');
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
    const response=await fetch('/api/library',{cache:'no-store'});
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
