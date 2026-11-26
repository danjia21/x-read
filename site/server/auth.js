import {createHash, randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';

export function readConfig(env = process.env) {
  const publicURL = new URL(env.PUBLIC_URL || 'http://127.0.0.1:3000');
  const development = env.NODE_ENV === 'development';
  if (publicURL.pathname !== '/' || publicURL.search || publicURL.hash || publicURL.username || publicURL.password ||
      (publicURL.protocol !== 'https:' && !(development && ['localhost', '127.0.0.1'].includes(publicURL.hostname) && publicURL.protocol === 'http:'))) {
    throw new Error('PUBLIC_URL must be an HTTPS origin (HTTP loopback is allowed only in development).');
  }
  const clientSecret = env.GITHUB_CLIENT_SECRET_FILE ? readFileSync(env.GITHUB_CLIENT_SECRET_FILE, 'utf8').trim() : env.GITHUB_CLIENT_SECRET;
  if (!env.GITHUB_CLIENT_ID || !clientSecret || !/^\d+$/.test(env.GITHUB_ALLOWED_USER_ID || '')) {
    throw new Error('Configure GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET_FILE (or GITHUB_CLIENT_SECRET), and numeric GITHUB_ALLOWED_USER_ID.');
  }
  const ttlMs = Number(env.CACHE_TTL_SECONDS || 300) * 1000;
  if (!Number.isFinite(ttlMs) || ttlMs < 0 || ttlMs > 3600000) throw new Error('CACHE_TTL_SECONDS must be between 0 and 3600.');
  return {origin: publicURL.origin, secure: publicURL.protocol === 'https:', clientID: env.GITHUB_CLIENT_ID,
    clientSecret, allowedUserID: env.GITHUB_ALLOWED_USER_ID, ttlMs, port: Number(env.PORT || 3000), host: env.HOST || '0.0.0.0'};
}

export function createAuth(config, {fetcher = fetch, now = Date.now} = {}) {
  const sessions = new Map(), flows = new Map();
  const cookieName = config.secure ? '__Host-x-read' : 'x-read-dev';
  const flowName = config.secure ? '__Host-x-read-flow' : 'x-read-flow-dev';
  const random = () => randomBytes(32).toString('base64url');
  const cookie = (name,value,seconds) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${config.secure ? '; Secure' : ''}`;
  const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(part=>part.trim().split('=')));
  const prune = map => {for (const [key,value] of map) if(value.expiresAt <= now()) map.delete(key);};

  async function exchange(parameters) {
    const response = await fetcher('https://github.com/login/oauth/access_token', {
      method:'POST', headers:{accept:'application/json','content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_id:config.clientID,client_secret:config.clientSecret,...parameters}), signal:AbortSignal.timeout(20000), redirect:'error'
    });
    const result = await response.json();
    if (!response.ok || result.error || !result.access_token || result.token_type?.toLowerCase() !== 'bearer') throw new Error('GitHub authorization failed. Please sign in again.');
    return {accessToken: result.access_token, refreshToken: result.refresh_token,
      tokenExpiresAt: result.expires_in ? now() + result.expires_in * 1000 : Infinity};
  }

  function start(req) {
    prune(flows);
    if(flows.size >= 200) throw new Error('Too many sign-in attempts. Please try again shortly.');
    const previous = cookies(req)[flowName]; if(previous) flows.delete(previous);
    const id=random(), state=random(), verifier=random();
    flows.set(id,{state,verifier,expiresAt:now()+600000});
    const url = new URL('https://github.com/login/oauth/authorize');
    url.search = new URLSearchParams({client_id:config.clientID,redirect_uri:`${config.origin}/auth/callback`,state,
      code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
    return {location:url.href,cookie:cookie(flowName,id,600)};
  }

  async function callback(req, url) {
    prune(flows); prune(sessions);
    const id=cookies(req)[flowName], flow=flows.get(id); flows.delete(id);
    if (!flow || url.searchParams.get('state') !== flow.state || !url.searchParams.get('code') || url.searchParams.has('error')) {
      throw new Error('Sign-in expired or was cancelled. Please try again.');
    }
    const tokens=await exchange({code:url.searchParams.get('code'),redirect_uri:`${config.origin}/auth/callback`,code_verifier:flow.verifier});
    const response=await fetcher('https://api.github.com/user',{headers:{authorization:`Bearer ${tokens.accessToken}`,accept:'application/vnd.github+json','user-agent':'x-read-private-reader'},signal:AbortSignal.timeout(20000),redirect:'error'});
    const user=await response.json();
    if (!response.ok || String(user.id) !== config.allowedUserID) throw new Error('This account is not authorized to access this reader.');
    if(sessions.size >= 100) throw new Error('Too many active sessions. Please try again later.');
    const old=cookies(req)[cookieName]; if(old) sessions.delete(old);
    const sessionID=random();
    sessions.set(sessionID,{...tokens,userID:String(user.id),login:user.login,csrf:random(),expiresAt:now()+86400000});
    return [cookie(cookieName,sessionID,86400),cookie(flowName,'',0)];
  }

  function session(req) {
    prune(sessions);
    return sessions.get(cookies(req)[cookieName]);
  }
  function destroy(req) {sessions.delete(cookies(req)[cookieName]);}
  async function token(session) {
    if (session.tokenExpiresAt > now()+60000) return session.accessToken;
    if (!session.refreshToken) throw new Error('Sign-in expired.');
    if (!session.refreshing) session.refreshing=exchange({grant_type:'refresh_token',refresh_token:session.refreshToken})
      .then(tokens=>Object.assign(session,tokens)).finally(()=>{session.refreshing=null;});
    await session.refreshing;
    return session.accessToken;
  }
  return {start,callback,session,token,destroy,clearCookies:()=>[cookie(cookieName,'',0),cookie(flowName,'',0)]};
}
