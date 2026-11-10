(function(root) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const numeric = value => value !== '' && value != null && Number.isFinite(Number(value));
  const moneyFields = ['water','grossCondo','condoDiscount','condo','service','extraCharge','fine','total'];
  function entries(block) {
    return (block.history || []).slice().sort((a,b) => String(b.month).localeCompare(String(a.month)) || Number(b.version)-Number(a.version) || String(b.closedAt || b.importedAt || '').localeCompare(String(a.closedAt || a.importedAt || '')) || String(a.id).localeCompare(String(b.id)));
  }
  function build(block, entryId) {
    if (!entryId) return block;
    const entry = (block.history || []).find(e => String(e.id) === String(entryId));
    if (!entry) throw new Error('O registro selecionado não está mais no histórico. Selecione outra competência.');
    const meta = entry.blockIdentity;
    const result = {
      id:block.id, name:meta?.name ?? block.name, address:meta?.address ?? block.address,
      manager:meta?.manager ?? block.manager, operator:meta?.operator ?? block.operator,
      month:entry.month, tariff:copy(entry.tariff || {}), billing:copy(entry.billing || {}),
      tariffPeriods:[{effectiveMonth:entry.month,tariff:copy(entry.tariff || {})}],
      units:copy(entry.units || []), history:copy(block.history || []),
      _historyBill:{id:String(entry.id),version:entry.version || 1,closedAt:entry.closedAt || entry.importedAt || '',charges:copy(entry.charges || []),
        grandTotal:entry.grandTotal,grandTotalRecorded:entry.billSnapshotFields?.grandTotal ?? numeric(entry.grandTotal),
        missingSnapshot:entry.billSnapshotFields?.billing === false || entry.billSnapshotFields?.tariff === false || entry.billSnapshotFields?.dueDate === false,
        identityRecorded:Boolean(meta),entrySource:entry.source || 'fechado'}
    };
    return result;
  }
  function charge(block,unit) {
    const rows=block._historyBill.charges;
    const byId=rows.filter(c => c && String(c.unitId || '')===String(unit.id));
    const found=byId.length?byId:rows.filter(c => c && String(c.number).trim()===String(unit.number).trim() && !(block.units || []).some(u=>String(u.id)===String(c.unitId || '')));
    if(found.length!==1) throw new Error('Cobrança arquivada ausente ou duplicada para o apartamento '+unit.number+'.');
    const c=copy(found[0]);
    if(String(c.number).trim()!==String(unit.number).trim()) throw new Error('Apartamento da cobrança diferente da unidade arquivada.');
    for(const key of moneyFields) if(!numeric(c[key])) throw new Error('Valor arquivado ausente ou inválido: '+key+' (apto '+unit.number+').');
    for(const key of [...moneyFields,'waterGross','waterDiscount','totalDiscount','discountTotal','zeroMinimumShare','zeroMinimumTransferred']) if(c[key]!=null && !numeric(c[key])) throw new Error('Detalhamento financeiro inválido no histórico.');
    for(const key of moneyFields)c[key]=Number(c[key]);
    c.waterDiscount=Number(c.waterDiscount || 0); c.totalDiscount=Number(c.totalDiscount || 0);
    c.waterGross=c.waterGross==null?c.water+c.waterDiscount:Number(c.waterGross);
    c.discountTotal=c.discountTotal==null?c.condoDiscount+c.waterDiscount+c.totalDiscount:Number(c.discountTotal);
    c.zeroMinimumShare=Number(c.zeroMinimumShare || 0);c.zeroMinimumTransferred=Number(c.zeroMinimumTransferred || 0);
    c.rule=copy(c.rule || unit.condoRule || {mode:'normal'});c.discountTarget=c.discountTarget || unit.discountTarget || 'condo';
    c.totalGross=c.total+c.totalDiscount;
    return c;
  }
  function inspect(block, printedFor, auditMath) {
    const meta=block._historyBill, globalErrors=[],units=[],used=new Set(),ids=new Set(),numbers=new Set();
    const cents=auditMath.cents;
    const addError=(errors,test,message)=>{if(!test)errors.push(message);};
    if(meta.missingSnapshot)globalErrors.push('Histórico sem configuração de cobrança ou tarifa arquivada.');
    const validDate=value=> typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
    if(!validDate(block.billing.dueDate))globalErrors.push('Vencimento arquivado ausente ou inválido.');
    if(!block.units.length)globalErrors.push('Não há unidades arquivadas para reimprimir.');
    for(const u of block.units) {
      const errors=[],warnings=[],checks=[];let c=null,printed=null,result=null;
      if(!meta.identityRecorded)warnings.push('Registro antigo: nome, endereço e responsável usam o cadastro atual; os valores e leituras vêm do histórico.');
      if(block.billing.redistributeZeroMinimum && meta.charges.some(row=>row?.zeroMinimumShare==null))warnings.push('Registro antigo sem detalhamento do rateio: a água será exibida pelo valor bruto arquivado, preservando o total.');
      if(ids.has(String(u.id)) || numbers.has(String(u.number).trim()))errors.push('Unidade duplicada no registro histórico.');
      ids.add(String(u.id));numbers.add(String(u.number).trim());
      try {
        c=charge(block,u);used.add(meta.charges.findIndex(row=>row && (String(row.unitId || '')===String(u.id) || String(row.number).trim()===String(u.number).trim())));
        for(const key of ['previous','current','m3'])if(!numeric(u[key]) || u.reportRecordedFields?.[key]===false)errors.push('Leitura/consumo não registrado: '+key+'.');
        if(numeric(u.previous)&&numeric(u.current)&&numeric(u.m3))addError(errors,Number(u.current)>=Number(u.previous) && Math.abs((Number(u.current)-Number(u.previous))-Number(u.m3))<0.000001,'Leituras e consumo histórico não coincidem.');
        if(numeric(c.m3))addError(errors,Math.abs(Number(c.m3)-Number(u.m3))<0.000001,'Consumo da cobrança diferente do consumo arquivado.');
        const compare=(key,expected,actual)=>{const row={key,expected,actual,ok:expected===actual};checks.push(row);addError(errors,row.ok,'Divergência histórica em '+key+'.');};
        compare('condo',cents(c.grossCondo)-cents(c.condoDiscount),cents(c.condo));
        compare('water',cents(c.waterGross)-cents(c.waterDiscount),cents(c.water));
        compare('discountTotal',cents(c.condoDiscount)+cents(c.waterDiscount)+cents(c.totalDiscount),cents(c.discountTotal));
        if(numeric(u.billingFine))compare('fine',cents(u.billingFine),cents(c.fine));
        compare('total',['water','condo','service','extraCharge','fine'].reduce((s,k)=>s+cents(c[k]),0)-cents(c.totalDiscount),cents(c.total));
        addError(errors,c.total>=0,'Valor total arquivado negativo.');
        addError(errors,['water','waterGross','grossCondo','condoDiscount','condo','service','fine','waterDiscount','totalDiscount','discountTotal','zeroMinimumShare','zeroMinimumTransferred'].every(k=>c[k]>=0),'Componente financeiro arquivado negativo.');
        if(c.service>0 && !String(block.billing.serviceLabel || '').trim())errors.push('Descrição do serviço não foi arquivada.');
        printed=printedFor(u,'MORADOR');
        for(const via of ['MORADOR','SÍNDICO']) {
          const p=via==='MORADOR'?printed:printedFor(u,via);
          compare('somaImpressa',cents(c.total),p.rows.reduce((s,row)=>s+auditMath.printedCents(row.text),0));
          compare('total',cents(c.total),auditMath.printedCents(p.totalText));
          const expectedRows=[cents(c.waterGross)-cents(c.zeroMinimumShare)];
          if(c.zeroMinimumShare)expectedRows.push(cents(c.zeroMinimumShare));
          if(c.waterDiscount)expectedRows.push(-cents(c.waterDiscount));
          expectedRows.push(cents(c.grossCondo));
          if(c.condoDiscount)expectedRows.push(-cents(c.condoDiscount));
          if(c.service)expectedRows.push(cents(c.service));
          // Adicionais mantêm os rótulos e valores registrados por unidade.
          const extras=[];if(Number(u.extraCharge))extras.push(Number(u.extraCharge));
          for(const item of u.extraCharges || [])if(Number(item.value))extras.push(Number(item.value));
          compare('extraCharge',cents(c.extraCharge),extras.reduce((s,v)=>s+cents(v),0));
          expectedRows.push(...extras.map(cents));if(c.fine)expectedRows.push(cents(c.fine));if(c.totalDiscount)expectedRows.push(-cents(c.totalDiscount));
          addError(errors,JSON.stringify(p.rows.map(row=>auditMath.printedCents(row.text)))===JSON.stringify(expectedRows),'Itens impressos diferentes das cobranças arquivadas ('+via+').');
          addError(errors,String(p.number)===String(u.number) && Number(p.previous)===Number(u.previous) && Number(p.current)===Number(u.current) && Math.abs(Number(p.m3)-Number(u.m3))<0.000001,'Identificação ou leituras impressas diferentes do histórico ('+via+').');
        }
        result={previous:Number(u.previous),current:Number(u.current),m3:Number(u.m3),fields:Object.fromEntries([...moneyFields,'waterDiscount','totalDiscount','discountTotal'].map(k=>[k,cents(c[k])])),steps:[]};
      }catch(error){errors.push(error.message);}
      units.push({id:u.id,number:u.number,resident:u.resident || '',errors,warnings,checks,result,printed});
    }
    if(used.size!==meta.charges.length)globalErrors.push('Lista de cobranças arquivadas não corresponde às unidades do histórico.');
    const totalCents=units.reduce((s,u)=>s+(u.result?.fields.total || 0),0);
    if(meta.grandTotalRecorded && (!numeric(meta.grandTotal) || cents(meta.grandTotal)!==totalCents))globalErrors.push('Total do lote diferente do total registrado no histórico.');
    const errorCount=globalErrors.length+units.reduce((s,u)=>s+u.errors.length,0),warningCount=units.reduce((s,u)=>s+u.warnings.length,0);
    return {auditVersion:'historico-1',month:block.month,blockName:block.name,official:false,globalErrors,units,errorCount,warningCount,totalCents,ok:errorCount===0,
      scope:'Reimpressão do histórico, versão '+meta.version+'. Valores arquivados comparados à composição e às duas vias impressas; tarifas atuais não são aplicadas.'};
  }
  root.KR2HistoryBills={entries,build,charge,inspect};
  if(typeof module!=='undefined')module.exports=root.KR2HistoryBills;
})(typeof window==='undefined'?globalThis:window);
