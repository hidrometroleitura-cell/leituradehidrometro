const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const dir = path.join(__dirname,'..');
const avg = require(path.join(dir,'reading-average.js'));
let checks = 0;
const test = (name,fn) => { fn(); checks++; console.log('PASS',name); };
const unit = (id,number,previous=100) => ({id,number,previous,current:'',note:'',changeLog:[]});
const a=unit('a','1'), b=unit('b','2');
const entry=(month,m3,version=1)=>({month,version,units:[{id:'a',number:'1',m3},{id:'b',number:'2',m3:100}]});
const block={id:'B',name:'Teste',month:'2026-11',units:[a,b],history:[entry('2026-10',10),entry('2026-09',20),entry('2026-08',30),entry('2026-07',40),entry('2026-06',50),entry('2026-05',60)]};
test('Últimos dois meses isolados por APT',()=>{assert.equal(avg.calculate(block,a).average,15);assert.equal(avg.calculate(block,b).average,100)});
test('Histórico completo inclui mais de quatro meses',()=>{assert.equal(avg.calculate(block,a,'all').average,35);assert.equal(avg.calculate(block,a,'all').count,6)});
test('Uma revisão por mês, escolhendo a última versão',()=>{const x={...block,history:[...block.history,entry('2026-10',40,2)]};assert.equal(avg.calculate(x,a).average,30)});
test('Desempate da versão pela data',()=>{const x={...block,history:[{...entry('2026-10',80),closedAt:'2026-11-01'},{...entry('2026-10',20),closedAt:'2026-10-31'},entry('2026-09',10)]};assert.equal(avg.calculate(x,a).average,45)});
test('Ignora competência atual e futura',()=>{assert.equal(avg.calculate({...block,history:[...block.history,entry('2026-11',999),entry('2027-01',999)]},a).average,15)});
test('Zero é válido e vazio não vira zero',()=>{const x={...block,history:[entry('2026-10',null),entry('2026-09',''),entry('2026-08',0),entry('2026-07',12)]};assert.equal(avg.calculate(x,a).average,6)});
test('Insuficiência no período e histórico único',()=>{const x={...block,history:[entry('2026-10',10)]};assert.equal(avg.calculate(x,a),null);assert.equal(avg.calculate(x,a,'all').average,10)});
test('Consumo derivado requer leituras completas e válidas',()=>{const x={...block,history:[{month:'2026-10',units:[{id:'a',number:'1',previous:10,current:30}]},{month:'2026-09',units:[{id:'a',number:'1',previous:10,current:''}]}]};assert.equal(avg.calculate(x,a,'all').average,20);assert.equal(avg.calculate(x,a),null)});
test('Sem vazamento entre APTs e sem IDs vazios',()=>{assert.equal(avg.calculate(block,unit('z','99'),'all'),null);assert.equal(avg.matchUnit([{id:'',number:'2'},{id:'',number:'1'}],unit('','1')).number,'1')});
test('ID conflitante e número duplicado são rejeitados',()=>{assert.equal(avg.matchUnit([{id:'a',number:'2'}],a),null);assert.equal(avg.matchUnit([{id:'x',number:'1'},{id:'y',number:'1'}],a),null)});
test('Anterior inválida e consumo negativo são rejeitados',()=>{assert.equal(avg.calculate(block,{...a,previous:''}),null);assert.equal(avg.calculate({...block,history:[entry('2026-10',-5)]},a,'all'),null)});
test('Histórico não é modificado durante cálculo',()=>{const before=JSON.stringify(block);avg.calculate(block,a,'all');assert.equal(JSON.stringify(block),before)});

// Exercise production bulk/save functions with controlled storage and UI adapters.
const source=fs.readFileSync(path.join(dir,'mobile.js'),'utf8');
function functionCode(name) {
  const start=source.indexOf(`  function ${name}(`)>=0?source.indexOf(`  function ${name}(`):source.indexOf(`  async function ${name}(`);
  const end=source.indexOf('\n  }',start)+4;
  assert.ok(start>=0&&end>start,name);
  return source.slice(start,end);
}
async function integration() {
  const clone=x=>JSON.parse(JSON.stringify(x));
  const seed=clone(block);seed.units.push({...unit('c','3'),current:155,mobileDone:true},{...unit('d','4')});
  for(const e of seed.history)e.units.push({id:'c',number:'3',m3:60},{id:'d',number:'4',m3:99});
  let stored={blocks:[seed],selected:'B'}, saves=0,protectedIds=[],confirms=[],cancel=false,concurrent=false;
  const ctx={window:{KR2ReadingAverage:avg},state:clone(stored),averageBatchBusy:false,readingDirty:false,averagePeriod:'two',console,
    currentBlock(){return ctx.state.blocks[0]},syncFromMainStateV5331(){},
    currentDraftV5331(b,u){return u.id==='d'?{current:'200'}:null},readPersistedMobileStateV5331:()=>clone(stored),
    confirm(text){confirms.push(text);if(concurrent)stored.blocks[0].units[0].current=777;return !cancel},
    alert(){},toast(){},render(){},fmt:String,n:x=>Number(x)||0,cost:x=>x*2,tariffForMonth:()=>({}),
    recordUnitChange(u,type,field,oldValue,newValue){u.changeLog.push({type,field,oldValue,newValue})},
    save(message,options){saves++;assert.deepEqual(Array.from(options.unitIds),['a','b']);stored=clone(ctx.state);return true},
    clearDraftV5331(){},async protectSavedUnitV5332(b,id){protectedIds.push(id);return true}
  };
  vm.createContext(ctx);
  for(const name of ['applyAverageToUnit','averagePreview','createAllAverageReadings'])vm.runInContext(functionCode(name),ctx);
  await ctx.createAllAverageReadings();
  assert.equal(ctx.state.blocks[0].units[0].current,115);assert.equal(ctx.state.blocks[0].units[1].current,200);
  assert.equal(ctx.state.blocks[0].units[2].current,155);assert.equal(ctx.state.blocks[0].units[3].current,'');
  assert.equal(saves,1);assert.deepEqual(protectedIds,['a','b']);assert.ok(confirms[0].includes('2026-10, 2026-09'));checks++;console.log('PASS Lote calcula APTs separadamente, salva alvos e preserva leitura/rascunho');
  ctx.state=clone({blocks:[seed],selected:'B'});stored=clone(ctx.state);cancel=true;await ctx.createAllAverageReadings();assert.equal(saves,1);assert.equal(ctx.state.blocks[0].units[0].current,'');checks++;console.log('PASS Cancelamento não altera leituras');
  cancel=false;concurrent=true;await ctx.createAllAverageReadings();assert.equal(saves,1);checks++;console.log('PASS Alteração concorrente bloqueia lote');
  concurrent=false;ctx.state=clone({blocks:[seed],selected:'B'});stored=clone(ctx.state);const goodSave=ctx.save;ctx.save=()=>false;protectedIds=[];await ctx.createAllAverageReadings();assert.equal(ctx.state.blocks[0].units[0].current,'');assert.equal(protectedIds.length,0);ctx.save=goodSave;checks++;console.log('PASS Falha de gravação restaura memória e não enfileira o lote');
  concurrent=false;ctx.state=clone({blocks:[seed],selected:'B'});stored=clone(ctx.state);ctx.averagePeriod='all';await ctx.createAllAverageReadings();assert.equal(ctx.state.blocks[0].units[0].current,135);checks++;console.log('PASS Lote usa todo o histórico escolhido');

  const other={id:'OUTRO',month:seed.month,units:[{...unit('a','1'),current:321}]};
  ctx.state={blocks:[clone(seed),{...clone(other),units:[{...unit('a','1'),current:999}]}],selected:'B'};stored={blocks:[clone(seed),other]};
  vm.runInContext('const MOBILE_READING_FIELDS_V5331 = ["current"]; const MOBILE_IDENTITY_FIELDS_V5331 = [];',ctx);
  vm.runInContext(functionCode('applyPersistedBaseV5331'),ctx);
  ctx.state.blocks[0].units[0].current=115;
  ctx.applyPersistedBaseV5331(['a'],false,'B');assert.equal(ctx.state.blocks[0].units[0].current,115);assert.equal(ctx.state.blocks[1].units[0].current,321);checks++;console.log('PASS Mesmo ID em outro prédio não recebe nem preserva alteração indevida');
  ctx.state.blocks[1].units[0].current=999;
  ctx.applyPersistedBaseV5331([{blockId:'B',unitId:'a'}]);assert.equal(ctx.state.blocks[0].units[0].current,115);assert.equal(ctx.state.blocks[1].units[0].current,321);checks++;console.log('PASS Proteção assíncrona usa par prédio/APT');
  console.log(`${checks} verificações aprovadas`);
}
integration().catch(e=>{console.error(e);process.exitCode=1});

