(function(root) {
  'use strict';
  const key = value => String(value ?? '').trim().toUpperCase();
  const numeric = value => value !== null && value !== undefined && String(value).trim() !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value)) ? Number(value) : null;
  function matchUnit(rows, unit) {
    if (!Array.isArray(rows)) return null;
    const byId = key(unit.id) ? rows.filter(row => key(row.id ?? row.unitId) === key(unit.id)) : [];
    if (byId.length) return byId.length === 1 && (!key(byId[0].number) || key(byId[0].number) === key(unit.number)) ? byId[0] : null;
    const byNumber = key(unit.number) ? rows.filter(row => key(row.number) === key(unit.number)) : [];
    return byNumber.length === 1 ? byNumber[0] : null;
  }
  function series(block, unit) {
    const latest = new Map();
    for (const entry of block?.history || []) {
      const month = String(entry.month || '');
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month >= String(block.month)) continue;
      const previous = latest.get(month);
      if (!previous || (numeric(entry.version) ?? 1) > (numeric(previous.version) ?? 1) ||
          ((numeric(entry.version) ?? 1) === (numeric(previous.version) ?? 1) && String(entry.closedAt || '') >= String(previous.closedAt || ''))) latest.set(month, entry);
    }
    return [...latest.values()].sort((a,b) => String(b.month).localeCompare(String(a.month))).map(entry => {
      const found = matchUnit(entry.units, unit), charge = matchUnit(entry.charges, unit);
      if (!found && !charge) return null;
      let m3 = numeric(found?.m3) ?? numeric(charge?.m3);
      if (m3 === null) {
        const current = numeric(found?.current), previous = numeric(found?.previous);
        if (current === null || previous === null || previous < 0 || current < previous) return null;
        m3 = current - previous;
      }
      if (m3 < 0) return null;
      return { month: entry.month, m3, current: found?.current, previous: found?.previous, tariff: entry.tariff, version: entry.version || 1 };
    }).filter(Boolean);
  }
  function calculate(block, unit, period = 'two') {
    const rows = series(block, unit), selected = period === 'all' ? rows : rows.slice(0,2);
    if (selected.length < (period === 'all' ? 1 : 2)) return null;
    const previous = numeric(unit.previous);
    if (previous === null || previous < 0) return null;
    const average = selected.reduce((sum,row) => sum + row.m3,0) / selected.length;
    const estimated = Math.round(previous + average);
    if (!Number.isFinite(estimated) || estimated < previous) return null;
    return { average, estimated, months: selected.map(row => row.month), count: selected.length, period };
  }
  const api = { series, calculate, matchUnit };
  root.KR2ReadingAverage = api;
  if (typeof module === 'object') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
