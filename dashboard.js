(function(root){
 'use strict';
 const present=v=>v!=null&&String(v).trim()!==''&&Number.isFinite(Number(v));
 const valid=u=>present(u.previous)&&present(u.current)&&Number(u.previous)>=0&&Number(u.current)>=Number(u.previous);
 function summarize(block){
  const units=block.units || [],total=units.length;
  const read=units.filter(valid).length;
  const missing=units.filter(u=>u.current===''||u.current==null).length;
  const invalid=total-read-missing;
  const conflicts=units.filter(u=>u.mobileSyncStatus==='conflict').length;
  const estimated=units.filter(u=>valid(u)&&u.readingType==='estimated').length;
  const pendingTransfer=units.filter(u=>['local','pending','syncing'].includes(u.mobileSyncStatus)).length;
  const entries=(block.history || []).filter(h=>/^\d{4}-(0[1-9]|1[0-2])$/.test(h.month || '')&&h.month<block.month).slice().sort((a,b)=>String(b.month).localeCompare(String(a.month))||Number(b.version || 1)-Number(a.version || 1)||String(b.closedAt || '').localeCompare(String(a.closedAt || ''))||String(a.id).localeCompare(String(b.id)));
  const previous=entries[0] || null;
  const currentM3=units.filter(valid).reduce((sum,u)=>sum+Number(u.current)-Number(u.previous),0);
  const oldUnits=previous?.units || [];
  const oldReadingsValid=oldUnits.length>0&&oldUnits.every(u=>valid(u)&&u.reportRecordedFields?.previous!==false&&u.reportRecordedFields?.current!==false);
  const oldSum=oldReadingsValid?oldUnits.reduce((sum,u)=>sum+Number(u.current)-Number(u.previous),0):null;
  const hasRecordedTotal=previous&&previous.dashboardRecordedFields?.totalM3!==false&&present(previous.totalM3)&&Number(previous.totalM3)>=0;
  const totalMismatch=hasRecordedTotal&&oldSum!==null&&Math.abs(Number(previous.totalM3)-oldSum)>0.000001;
  const historicalM3=totalMismatch?null:hasRecordedTotal?Number(previous.totalM3):oldSum;
  const identities=rows=>rows.map(u=>String(u.id || '')+'|'+String(u.number || '')).sort();
  const sameUnits=previous&&JSON.stringify(identities(units))===JSON.stringify(identities(previous.units || []));
  const complete=total>0&&read===total&&conflicts===0;
  const comparable=Boolean(complete&&sameUnits&&historicalM3!==null&&historicalM3>=0);
  const delta=comparable?currentM3-historicalM3:null;
  const percent=comparable&&historicalM3>0?delta/historicalM3*100:null;
  return {total,read,missing,invalid,conflicts,estimated,pendingTransfer,progress:total?Math.round(read/total*100):0,previous,historicalM3,currentM3,complete,sameUnits,comparable,delta,percent};
 }
 root.KR2Dashboard={summarize};if(typeof module!=='undefined')module.exports=root.KR2Dashboard;
})(typeof window==='undefined'?globalThis:window);
