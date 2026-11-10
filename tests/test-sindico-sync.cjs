const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
async function run(file){
  let store={},calls=[],next;
  const ctx={window:{},console,URL,CustomEvent:function(){},document:{dispatchEvent(){}},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}},setTimeout,clearTimeout,
    fetch:async(url,opts)=>{calls.push({url,...opts});return {ok:true,status:200,text:async()=>JSON.stringify(next)}}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
  const api=ctx.window.KR2Sync;
  api.setConfig({url:'https://example.supabase.co',anonKey:'public-example',user:{id:'OWNER'},accessToken:'session-example',expiresAt:Date.now()+600000});
  const payload={block_id:'APT-BLOCK',token:'sin-'+'a'.repeat(64),units:[{number:'1'}],owner_id:'IGNORAR'};
  next=[{block_id:payload.block_id,payload}];await api.publishSindicoView(payload);
  const publication=calls.pop(),body=JSON.parse(publication.body)[0];
  assert.equal(body.owner_id,'OWNER');assert.equal(body.block_id,payload.block_id);assert.deepEqual(body.payload,payload);
  assert.equal(publication.headers.Authorization,'Bearer session-example');
  next=payload;assert.deepEqual(JSON.parse(JSON.stringify(await api.fetchSindicoView(payload.block_id,payload.token))),payload);
  const read=calls.pop();assert.ok(read.url.endsWith('/rest/v1/rpc/kr2melo_get_sindico_view'));
  assert.equal(read.method,'POST');assert.deepEqual(JSON.parse(read.body),{p_block_id:payload.block_id,p_token:payload.token});
  assert.equal(read.headers.Authorization,undefined);
  assert.equal(read.headers.apikey,'public-example');
  assert.ok(!read.url.includes(payload.token));
  next=null;await assert.rejects(()=>api.fetchSindicoView('WRONG','WRONG'),/inválido|inv.lido/);
  console.log('PASS',file,'publica com proprietário autenticado, consulta por RPC e rejeita resultado vazio');
}
(async()=>{
 await run('sync.js');await run('portal-sindico/sync.js');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const tokenFn=app.slice(app.indexOf('  function generateSindicoToken()'),app.indexOf('\n  async function showSindicoShareModal'));
 const ctx={crypto:require('node:crypto').webcrypto};vm.createContext(ctx);vm.runInContext(tokenFn,ctx);
 const tokens=new Set(Array.from({length:100},()=>ctx.generateSindicoToken()));assert.equal(tokens.size,100);
 for(const token of tokens)assert.match(token,/^sin-[a-f0-9]{64}$/);
 console.log('PASS tokens criptográficos de 256 bits e 100 amostras distintas');
 const sql=fs.readFileSync(path.join(root,'supabase-portal-v5.3.47.sql'),'utf8');
 assert.ok(/security definer\s+set search_path = ''/i.test(sql));
 assert.ok(/v.block_id = p_block_id\s+and v.token = p_token/.test(sql));
 assert.ok(/revoke all privileges on table public.kr2melo_sindico_views from public, anon, authenticated/.test(sql));
 assert.ok(/as restrictive for all to authenticated/.test(sql));
 assert.ok(!/drop table|truncate|alter table public.kr2melo_sync_state/i.test(sql));
 console.log('PASS revisão estática do SQL: privilégios, filtro exato e preservação da sincronização');
 console.log('SQL ainda requer execução e validação no Supabase; mocks não comprovam as políticas no banco.');
})().catch(e=>{console.error(e);process.exitCode=1});
