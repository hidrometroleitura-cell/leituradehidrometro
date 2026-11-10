(function(root) {
  'use strict';
  function validateBackup(parsed, allowMobile = false) {
    if (!parsed || typeof parsed !== 'object') throw new Error('O arquivo não é um BKP do sistema.');
    const state = parsed.state || parsed;
    if (!allowMobile && (parsed.source === 'mobile' || state.source === 'mobile')) throw new Error('Use um BKP completo do painel para iniciar. Importe as leituras móveis depois.');
    if (!Array.isArray(state.blocks)) throw new Error('BKP sem lista de condomínios.');
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    const month = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '');
    const blockIds = new Set();
    const checkUnits = units => {
      if (!Array.isArray(units)) throw new Error('Lista de unidades ausente ou inválida.');
      const ids = new Set();
      for (const u of units) {
        if (!object(u)) throw new Error('Unidade inválida no BKP.');
        if (u.id && ids.has(String(u.id))) throw new Error('Há identificadores de unidades duplicados.');
        if (u.id) ids.add(String(u.id));
        for (const field of ['previous','current']) {
          const v = u[field];
          if (v != null && v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0)) throw new Error('Leitura inválida no BKP.');
        }
      }
    };
    for (const b of state.blocks) {
      if (!object(b) || !month(b.month)) throw new Error('Condomínio ou competência inválida.');
      if (b.id && blockIds.has(String(b.id))) throw new Error('Há identificadores de condomínios duplicados.');
      if (b.id) blockIds.add(String(b.id));
      checkUnits(b.units);
      if (b.history != null && !Array.isArray(b.history)) throw new Error('Histórico inválido.');
      for (const h of b.history || []) {
        if (!object(h) || !month(h.month)) throw new Error('Competência histórica inválida.');
        checkUnits(h.units);
      }
    }
    return state;
  }
  root.KR2Backup = { validate: validateBackup };
  if (typeof module !== 'undefined') module.exports = root.KR2Backup;
})(typeof window === 'undefined' ? globalThis : window);
