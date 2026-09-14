// Isolated PostgreSQL integration tests. Never run against a production database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_security_test')) throw new Error('Set TEST_DATABASE_URL to an isolated database whose name ends in _security_test.');
process.env.DATABASE_URL = url;
process.env.DATABASE_SSL = 'disable';
process.env.NODE_ENV = 'test';
delete process.env.VERCEL;
process.env.JWT_SECRET = 'integration-test-only-key-at-least-32-bytes';
process.env.FRONTEND_URL = 'https://owner.github.io/portfolio';
process.env.GITHUB_OWNER_USERNAME = 'owner';
const { pool } = require('../lib/db');
const { consumeShared } = require('../lib/rateLimit');
const { signSession } = require('../lib/auth');
let clientIp = 1;
function response() { return { headers:{}, setHeader(k,v) {this.headers[k]=v;}, status(c) {this.code=c;return this;}, json(b) {this.body=b;return this;}, end() {} }; }
async function invoke(resource, method, body, id, extra={}) {
 const req={method,body,query:id?{id:String(id)}:{},url:`/api/${resource}${id?'/'+id:''}`,headers:{origin:'https://owner.github.io','content-type':'application/json',cookie:`portfolio_session=${signSession('owner')}`},socket:{remoteAddress:`198.51.100.${clientIp++}`},...extra};
 const res=response();await require(`../api/${resource}/${id?'[id]':'index'}`)(req,res);return res;
}
(async()=>{
 if(process.argv.includes('--worker')) {
   const results=await Promise.all(Array.from({length:20},()=>consumeShared('concurrent-test',{limit:10,windowMs:60000})));
   console.log(results.filter(x=>x.allowed).length);return;
 }
 await pool.query(fs.readFileSync(path.join(__dirname,'../schema.sql'),'utf8'));
 // Applying the rate-limit migration twice must be safe.
 const migration=fs.readFileSync(path.join(__dirname,'../migrations/002_security_rate_limits.sql'),'utf8');
 await pool.query(migration);await pool.query(migration);
 await pool.query('TRUNCATE rate_limit_buckets, projects, writeups, tools, education RESTART IDENTITY');
 const workers=await Promise.all(Array.from({length:3},()=>execFile(process.execPath,[__filename,'--worker'],{env:process.env})));
 assert.equal(workers.reduce((n,w)=>n+Number(w.stdout.trim()),0),10);
 await pool.query("UPDATE rate_limit_buckets SET expires_at=now()-interval '1 second' WHERE bucket_key='concurrent-test'");
 assert.equal((await consumeShared('concurrent-test',{limit:10,windowMs:60000})).allowed,true);
 const injection="Robert'); DROP TABLE projects;--";
 let res=await invoke('projects','POST',{title:injection,tech_stack:['SQL'],repo_url:'https://example.com',category:'offensive',featured:false});
 assert.equal(res.code,201,JSON.stringify(res.body));const projectId=res.body.id;
 assert.equal(res.body.title,injection);
 assert.equal((await pool.query('SELECT count(*) FROM projects')).rows[0].count,'1');
 assert.equal((await invoke('projects','GET',null,'1 OR 1=1')).code,400);
 assert.equal((await invoke('projects','PUT',{featured:'true'},projectId)).code,400);
 assert.equal((await invoke('projects','PUT',{title:'Updated'},projectId)).code,200);
 assert.equal((await invoke('projects','DELETE',null,projectId)).code,200);
 for(const [resource,body] of [['tools',{name:'nmap',category:'offensive',sort_order:0}],['writeups',{title:'Test writeup',content_markdown:'## Test\n<script>alert(1)</script>',tags:['xss'],difficulty:'easy'}]]) {
   res=await invoke(resource,'POST',body);assert.equal(res.code,201,JSON.stringify(res.body));
   assert.equal((await invoke(resource,'GET',null,res.body.id)).code,200);
   assert.equal((await invoke(resource,'DELETE',null,res.body.id)).code,200);
 }
 const pdf={name:'certificate.pdf',type:'application/pdf',data:Buffer.from('%PDF-1.4\n%%EOF').toString('base64')};
 res=await invoke('education','POST',{title:'Test certification',kind:'certification',sort_order:0,pdf});
 assert.equal(res.code,201,JSON.stringify(res.body));const id=res.body.id;
 assert.equal((await invoke('education','GET',null,id,{query:{id:String(id),asset:'pdf'}})).body.data,pdf.data);
 assert.equal((await invoke('education','PUT',{title:'Updated',kind:'certification',sort_order:0},id)).code,200);
 assert.equal((await invoke('education','GET',null,id,{query:{id:String(id),asset:'pdf'}})).body.data,pdf.data);
 assert.equal((await invoke('education','PUT',{title:'Updated',kind:'certification',sort_order:0,pdf:null},id)).code,200);
 assert.equal((await invoke('education','GET',null,id,{query:{id:String(id),asset:'pdf'}})).code,404);
 assert.equal((await invoke('education','DELETE',null,id)).code,200);
 // Shared counters are consulted by real handlers, not just the helper.
 const socket={remoteAddress:'203.0.113.120'};
 for(let i=0;i<120;i++) assert.equal((await invoke('education','GET',null,null,{socket})).code,200);
 res=await invoke('education','GET',null,null,{socket});assert.equal(res.code,429);assert.ok(Number(res.headers['Retry-After'])>0);
 console.log('PASS: 3 processes / 60 concurrent requests allow exactly 10; expiry reset; idempotent migration; real CRUD with injection data; attachment preservation/removal; API returns 429 at request 121.');
})().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>pool.end());
