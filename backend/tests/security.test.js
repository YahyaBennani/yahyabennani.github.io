const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { getClientIp, checkRateLimit, rateLimitOrReject } = require('../lib/rateLimit');
const { validateBody, validId, validUrl } = require('../lib/validation');
const { parseCookies, signSession, getSessionUser, requireAuth } = require('../lib/auth');
const { applyCors } = require('../lib/cors');
process.env.JWT_SECRET = 'test-only-key-with-at-least-32-bytes-long';
process.env.GITHUB_OWNER_USERNAME = 'owner';
process.env.FRONTEND_URL = 'https://owner.github.io/portfolio';
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
process.env.NODE_ENV = 'test';
let ip = 0;
function request(extra = {}) { return { method: 'POST', url: '/api/projects', query: {}, body: { title: 'Safe title' }, socket: { remoteAddress: `192.0.2.${++ip}` }, headers: { origin: 'https://owner.github.io', 'content-type': 'application/json' }, ...extra }; }
function response() { return { headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, send(b) { this.body=b; return this; }, end() {} }; }
function authenticated(extra = {}) { const req=request(extra); req.headers.cookie = `portfolio_session=${signSession('owner')}`; return req; }
test('IP spoofing is ignored off Vercel; IPv6 addresses share canonical /64 buckets', () => {
 assert.equal(getClientIp(request({headers:{'x-forwarded-for':'8.8.8.8'},socket:{remoteAddress:'192.0.2.1'}})), '192.0.2.1');
 assert.equal(getClientIp(request({socket:{remoteAddress:'2001:0db8:0001:0002::1'}})),getClientIp(request({socket:{remoteAddress:'2001:db8:1:2::ffff'}})));
 process.env.VERCEL='1';
 assert.equal(getClientIp(request({headers:{'x-vercel-forwarded-for':'203.0.113.4','x-forwarded-for':'8.8.8.8'}})), '203.0.113.4');
 assert.equal(getClientIp(request({headers:{'x-forwarded-for':['1.2.3.4']}})), 'unknown');
 delete process.env.VERCEL;
});
test('rate limiter stops at boundary, resets at expiry, returns Retry-After', async () => {
 const key='boundary-test', p={limit:2,windowMs:1000};
 assert.equal(checkRateLimit(key,p,1000).allowed,true);
 assert.equal(checkRateLimit(key,p,1500).allowed,true);
 assert.equal(checkRateLimit(key,p,1999).allowed,false);
 assert.equal(checkRateLimit(key,p,2000).allowed,true);
 const req=request(), policy={key:'test-429',limit:1,windowMs:60000};
 assert.equal(await rateLimitOrReject(req,response(),policy),false);
 const res=response();assert.equal(await rateLimitOrReject(req,res,policy),true);assert.equal(res.code,429);assert.equal(res.headers['Retry-After'],'60');
});
test('missing production rate limit configuration fails closed', async () => {
 process.env.VERCEL='1';const saved=process.env.JWT_SECRET;delete process.env.JWT_SECRET;
 try {const res=response();assert.equal(await rateLimitOrReject(request(),res,{key:'production',limit:1,windowMs:1000}),true);assert.equal(res.code,503);}
 finally {delete process.env.VERCEL;process.env.JWT_SECRET=saved;}
});
test('CORS normalizes Pages subpaths, rejects hostile origins, validates preflight', async () => {
 const res=response();assert.equal(await applyCors(request({method:'GET'}),res),false);
 assert.equal(res.headers['Access-Control-Allow-Origin'],'https://owner.github.io');
 assert.equal(res.headers['Cache-Control'],'no-store');
 for(const origin of ['https://evil.example','null','https://owner.github.io.evil.example']) {const r=response();await applyCors(request({headers:{origin}}),r);assert.equal(r.code,403);}
 const pre=request({method:'OPTIONS',headers:{origin:'https://owner.github.io','access-control-request-method':'PUT','access-control-request-headers':'content-type'}});
 const r=response();assert.equal(await applyCors(pre,r),true);assert.equal(r.code,204);
 const bad=response();await applyCors(request({method:'OPTIONS',headers:{origin:'https://owner.github.io','access-control-request-method':'TRACE'}}),bad);assert.equal(bad.code,403);
});
test('cookies tolerate malformed escapes and reject duplicate session cookies', () => {
 assert.doesNotThrow(()=>parseCookies(request({headers:{cookie:'portfolio_session=%E0%A4%A'}})));
 assert.equal(getSessionUser(request({headers:{cookie:'portfolio_session=%'}})),null);
 const token=signSession('owner');assert.equal(getSessionUser(request({headers:{cookie:`portfolio_session=${token}; portfolio_session=${token}`}})),null);
});
test('JWT accepts owner only, pins algorithm/audience/issuer and expiration', () => {
 assert.equal(getSessionUser(authenticated()),'owner');
 const secret=process.env.JWT_SECRET;
 for(const token of [jwt.sign({user:'owner'},secret,{algorithm:'HS384',expiresIn:60}),jwt.sign({user:'owner'},secret,{expiresIn:-1,issuer:'portfolio-api',audience:'portfolio-admin'}),jwt.sign({user:'attacker'},secret,{expiresIn:60,issuer:'portfolio-api',audience:'portfolio-admin'}),jwt.sign({user:'owner'},secret,{expiresIn:60})]) assert.equal(getSessionUser(request({headers:{cookie:`portfolio_session=${token}`}})),null);
});
test('writes require trusted origin, session, JSON and bounded body', async () => {
 for(const headers of [{}, {origin:'https://evil.example'}]) {const r=response();assert.equal(await requireAuth(authenticated({headers}),r),null);assert.equal(r.code,403);}
 let r=response();assert.equal(await requireAuth(authenticated(),r),'owner');
 r=response();await requireAuth(authenticated({headers:{origin:'https://owner.github.io','content-type':'text/plain'}}),r);assert.equal(r.code,415);
 r=response();await requireAuth(authenticated({body:{title:'x'.repeat(66000)}}),r);assert.equal(r.code,413);
 r=response();await requireAuth(authenticated({url:'/api/education',body:{image:'x'.repeat(3000000)}}),r);assert.equal(r.code,undefined);
 r=response();await requireAuth(authenticated({url:'/api/education',body:{image:'x'.repeat(3200000)}}),r);assert.equal(r.code,413);
});
test('invalid session attempts are blocked on attempt 11', async () => {
 const req=request();
 for(let i=0;i<10;i++) {const r=response();await requireAuth(req,r);assert.equal(r.code,401);}
 const r=response();await requireAuth(req,r);assert.equal(r.code,429);
});
test('validation rejects type confusion, arrays, unsafe URLs, invalid dates and IDs', () => {
 for(const value of ['javascript:alert(1)','data:text/html,test','https://a:b@example.org','https://example.org/\n']) assert.equal(validUrl(value),false);
 for(const id of ["1 OR 1=1",['1'],'2147483648','-1','0','../auth/me']) assert.equal(validId(id),false);
 assert.equal(validId('valid-slug',true),true);
 for(const b of [{title:{}},{title:' '},{title:'ok',featured:'true'},{title:'ok',tech_stack:'sql'},{title:'ok',tech_stack:Array(31).fill('x')},{title:'ok',repo_url:'javascript:alert(1)'},{title:'ok',unknown:true}]) assert.ok(validateBody('projects',b,true));
 assert.ok(validateBody('writeups',{published_at:'2026-02-31'},false));
 assert.ok(validateBody('tools',{sort_order:1.5},false));
 assert.equal(validateBody('projects',{title:"Robert'); DROP TABLE projects;--"},true),null); // SQL treats content as data; no brittle keyword blacklist.
});
test('OAuth/logout method restrictions and malformed state do not call GitHub', async () => {
 const original=global.fetch;let fetched=false;global.fetch=async()=>{fetched=true;throw new Error('unexpected');};
 try {
  let r=response();await require('../api/auth/login')(request(),r);assert.equal(r.code,405);
  r=response();await require('../api/auth/logout')(request({method:'GET'}),r);assert.equal(r.code,405);
  r=response();await require('../api/auth/callback')(request({method:'GET',query:{code:'abc',state:['invalid']},headers:{cookie:'oauth_state=%'}}),r);assert.equal(r.code,403);
  assert.equal(fetched,false);
 } finally {global.fetch=original;}
});
test('valid OAuth owner flow issues a constrained session and clears state', async () => {
 const oldFetch=global.fetch;
 process.env.GITHUB_CLIENT_SECRET='test-only-oauth-secret';process.env.GITHUB_CLIENT_ID='test-client';process.env.BACKEND_URL='https://api.example.org';
 const state='a'.repeat(32);let calls=0;
 global.fetch=async()=>({ok:true,json:async()=>++calls===1?{access_token:'test-access-token'}:{login:'owner'}});
 try {
  const res=response();res.writeHead=(code,headers)=>{res.code=code;Object.assign(res.headers,headers);};
  await require('../api/auth/callback')(request({method:'GET',query:{code:'test-code',state},headers:{cookie:`oauth_state=${state}`}}),res);
  assert.equal(res.code,302);assert.equal(res.headers.Location,'https://owner.github.io/portfolio/admin.html');
  const cookies=res.headers['Set-Cookie'];assert.match(cookies[0],/Max-Age=0/);assert.match(cookies[1],/HttpOnly; Secure/);
  assert.equal(getSessionUser(request({headers:{cookie:cookies[1].split(';')[0]}})),'owner');
 } finally {global.fetch=oldFetch;}
});
