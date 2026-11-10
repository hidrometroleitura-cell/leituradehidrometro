(() => {
  'use strict';
  const KEY = 'kr2melo.hidrometro.v1';
  const APP_VERSION = '5.3.47';
  const APP_UPDATED_AT = '10/11/2026';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const n = value => Number(value) || 0;
  const esc = (value = '') => { const node = document.createElement('div'); node.textContent = String(value ?? ''); return node.innerHTML; };
  const fmt = value => n(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  const monthLabel = month => monthFmt.format(new Date(`${month}-02T12:00:00`));
  let state = load(), blockIndex = 0, unitIndex = 0, searchText = '', keepSearchFocus = false, readingDirty = false, mobileFilter = localStorage.getItem('kr2melo.mobileFilter.v5317') || 'pendentes';

  function normalizeMobileState(raw) {
    const source = raw && typeof raw === 'object' ? JSON.parse(JSON.stringify(raw)) : {};
    source.blocks = Array.isArray(source.blocks) ? source.blocks : [];
    source.blocks.forEach(block => {
      block.units = Array.isArray(block.units) ? block.units : [];
      block.history = Array.isArray(block.history) ? block.history : [];
      block.units.forEach(unit => {
        unit.previous = n(unit.previous);
        if (unit.current !== '' && unit.current !== null && unit.current !== undefined) unit.current = n(unit.current);
        else unit.current = '';
        unit.readingType = unit.readingType === 'estimated' ? 'estimated' : 'real';
        unit.operationalStatus = ['ocupado','vazio','alugado','reforma','sem_acesso','parado','trocado','estimada'].includes(unit.operationalStatus) ? unit.operationalStatus : 'ocupado';
        unit.mobileReopened = Boolean(unit.mobileReopened);
        const hasReading = unit.current !== '';
        unit.mobileDone = unit.mobileReopened ? false : Boolean(unit.mobileDone || hasReading || unit.operationalStatus === 'sem_acesso');
        unit.mobileSavedAt = String(unit.mobileSavedAt || '');
        unit.note = String(unit.note || '');
        unit.photo = String(unit.photo || '');
        unit.estimatedReason = String(unit.estimatedReason || '');
        unit.changeLog = Array.isArray(unit.changeLog) ? unit.changeLog : [];
      });
      sortBlockUnits(block);
    });
    source.version = APP_VERSION;
    source.selected = source.blocks.some(block => block.id === source.selected) ? source.selected : (source.blocks[0]?.id || null);
    return source;
  }
  function load() {
    try { return normalizeMobileState(JSON.parse(localStorage.getItem(KEY))); }
    catch { return normalizeMobileState({ selected: null, blocks: [] }); }
  }
  function save(message = '') {
    try {
      state.version = APP_VERSION;
      state.blocks?.forEach(sortBlockUnits);
      localStorage.setItem(KEY, JSON.stringify(state));
      // Leituras móveis usam exclusivamente a fila por unidade; nunca enviam cadastro inteiro.
      if (message) toast(message);
      return true;
    } catch {
      toast('Nao foi possivel salvar. Libere espaco no navegador.', true);
      return false;
    }
  }
  function toast(message, error = false) {
    const el = $('#toast');
    el.textContent = message;
    el.className = `toast show${error ? ' error' : ''}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.className = 'toast'; }, 2200);
  }
  let mobileVersionNotified = false;
  function checkVersionNotice() {
    if (!mobileVersionNotified) {
      mobileVersionNotified = true;
      setTimeout(() => {
        toast(`KR²MELO Mobile v${APP_VERSION} · Atualizado em ${APP_UPDATED_AT}`);
      }, 300);
    }
    const key = 'kr2melo.mobileVersionSeen';
    localStorage.setItem(key, APP_VERSION);
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration?.().then(reg => reg?.update?.()).catch(() => {});
  }
  function cost(m3, tariff) {
    return KR2Money.water(m3, tariff);
  }
  function tariffV5311(raw = {}) {
    return { minimum: 80.84, minimumM3: 10, tier1: 8.37, tier1Limit: 20, tier2: 10.87, tier2Limit: 30, sheetMinimum: 80.84, sheetAllowance: 10, sheetExcess: 8.37, ...(raw || {}) };
  }
  function tariffForMonth(block, month = block?.month) {
    const periods = Array.isArray(block?.tariffPeriods) ? block.tariffPeriods
      .filter(item => item && item.effectiveMonth && item.effectiveMonth <= month)
      .sort((a, b) => String(a.effectiveMonth).localeCompare(String(b.effectiveMonth))) : [];
    return tariffV5311(periods.pop()?.tariff || block?.tariff);
  }
  function unitHistory(block, unit) {
    if (!block || !unit || !Array.isArray(block.history)) return [];
    return window.KR2ReadingAverage.series(block, unit).map(row => ({ ...row, water: cost(row.m3, row.tariff || tariffForMonth(block, row.month)) }));
  }
  let averagePeriod = 'two', averageBatchBusy = false;
  function averageLastTwoConsumptions(block, unit) {
    return window.KR2ReadingAverage.calculate(block, unit, averagePeriod)?.average ?? null;
  }
  function historyMarkup(block, unit) {
    const rows = unitHistory(block, unit).slice(0, 4);
    if (!rows.length) return '<section class="card history-card"><h3>Historico rapido</h3><p class="muted">Sem meses fechados para este apartamento.</p></section>';
    return `<section class="card history-card"><h3>Historico rapido</h3><div class="mobile-history-list">${rows.map(row => `<div><small>${esc(monthLabel(row.month))}</small><strong>${fmt(row.m3)} m3</strong><span>${moneyLike(row.water)}</span></div>`).join('')}</div></section>`;
  }
  function moneyLike(value) { return n(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function downloadMobileBackup() {
    const payload = { ...state, version: state.version || APP_VERSION, exportedAt: new Date().toISOString(), source: 'mobile' };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const block = currentBlock();
    a.href = url;
    a.download = `kr2melo-bkp-mobile-${(block?.name || 'condominio').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('BKP baixado no celular.');
  }
  function backupStateFromJson(raw) {
    const parsed = JSON.parse(raw);
    const candidate = parsed?.state && Array.isArray(parsed.state.blocks) ? parsed.state : parsed;
    if (!candidate || !Array.isArray(candidate.blocks)) throw new Error('invalid-backup');
    return { ...candidate, version: candidate.version || parsed.appVersion || parsed.version || APP_VERSION };
  }
  function uploadMobileBackup() {
    $('#mobileImportInput')?.click();
  }
  async function syncMobilePush() {
    if (!window.KR2Sync?.connected?.()) return toast('Entre na sincronização pelo painel antes de enviar.', true);
    if (readingDirty) return toast('Salve a leitura em edição antes de enviar.', true);
    await processOfflineQueueV5332({ message: true });
  }
  // Confirma apenas operações reproduzidas exatamente no cadastro ou fechamento recebido.
  function operationReceiptV538(candidate, op) {
    const block = candidate?.blocks?.find(b => String(b.id) === String(op.blockId));
    if (!block) return null;
    if (String(block.month) === String(op.month)) {
      const unit = block.units?.find(u => String(u.id) === String(op.unitId));
      if (unit && unit.mobileSyncStatus === 'synced' && (op.previous === undefined || Number(unit.previous) === Number(op.previous)) && !fieldsDifferV5332(unit, op.fields)) return {kind:'panel'};
    }
    if (String(block.month) <= String(op.month)) return null;
    const entries = (block.history || []).filter(e => String(e.month) === String(op.month)).sort((a,b) => Number(b.version || 1)-Number(a.version || 1) || String(b.closedAt || '').localeCompare(String(a.closedAt || '')));
    const unit = entries[0]?.units?.find(u => String(u.id) === String(op.unitId));
    if (!unit || op.previous === undefined || Number(unit.previous) !== Number(op.previous) || fieldsDifferV5332(unit, op.fields)) return null;
    return {kind:'closed',entryId:entries[0].id};
  }
  async function settleReceivedOpsV538(candidate, ops) {
    for (const op of ops) {
      const receipt = operationReceiptV538(candidate, op);
      if (!receipt) continue;
      op.status = 'transferred-panel'; op.receivedAt = new Date().toISOString(); op.receipt = receipt;
      await idbPutV5332(OFFLINE_OP_STORE_V5332, op);
    }
  }

  let mobilePullRunningV538 = false;
  async function syncMobilePull() {
    if (mobilePullRunningV538) return;
    if (!window.KR2Sync?.connected?.()) return toast('Entre na sincronização pelo painel antes de baixar.', true);
    if (readingDirty) return toast('Salve a leitura em edição antes de baixar a nuvem.', true);
    mobilePullRunningV538 = true;
    try {
      await ensureLocalQueueV5333();
      let pending = await pendingOpsV5332();
      const owner = window.KR2Sync.getConfig?.()?.user?.id || '';
      if (pending.some(op => op.ownerId && op.ownerId !== owner)) throw new Error('A fila pertence a outra conta. Entre na conta usada durante a leitura.');
      const local = JSON.parse(JSON.stringify(state));
      // Preserva o cadastro anterior, inclusive unidades removidas ou de outra competência.
      await idbPutV5332(OFFLINE_SNAPSHOT_STORE_V5332, { id: `before-pull:${Date.now()}`, state: local });
      const remote = await window.KR2Sync.pullState();
      if (!remote || !Array.isArray(remote.blocks)) return toast('Nenhum dado encontrado na nuvem.');
      const next = normalizeMobileState(remote);
      pending = pending.filter(op => !operationReceiptV538(next, op));
      for (const op of pending) {
        const { unit } = findUnitByOpV5332(next, op);
        const { unit: localUnit } = findUnitByOpV5332(local, op);
        if (!unit || (op.previous !== undefined && Number(unit.previous) !== Number(op.previous))) {
          toast('Download bloqueado: há leitura local de unidade ou competência ausente na nuvem. Envie um BKP ao painel para revisão.', true);
          return;
        }
        applyFieldsV5332(unit, op.fields);
        if (localUnit) ['mobileSyncStatus','mobileSyncOperationId','mobileSyncConflict'].forEach(key => { unit[key] = localUnit[key]; });
      }
      if (JSON.stringify(state) !== JSON.stringify(local)) throw new Error('Os dados locais mudaram durante a atualização. Atualize novamente após salvar.');
      if (readingDirty) throw new Error('A leitura começou a ser editada durante a atualização. Salve antes de atualizar o mês.');
      // Só troca a memória depois de confirmar a gravação em disco.
      localStorage.setItem(KEY, JSON.stringify(next));
      state = next;
      await settleReceivedOpsV538(next, await pendingOpsV5332());
      searchText = ''; initIndexes(); render();
      toast('Cadastro atualizado; leituras locais pendentes preservadas.');
    } catch (error) { toast(error.message || 'Falha ao baixar. Dados locais preservados.', true); }
    finally { mobilePullRunningV538 = false; }
  }
  async function importMobileBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const imported = backupStateFromJson(await file.text());
      if (state.blocks.some(local => imported.blocks.some(remote => String(remote.id) === String(local.id) && String(remote.month) < String(local.month)))) return toast('BKP antigo: este arquivo voltaria uma competência. Use o cadastro exportado depois do fechamento.', true);
      const count = imported.blocks.reduce((sum, block) => sum + (Array.isArray(block.units) ? block.units.length : 0), 0);
      const ok = confirm(`Restaurar este BKP no celular?\n\nCondominios: ${imported.blocks.length}\nApartamentos: ${count}\n\nIsso substitui os dados atuais deste aparelho.`);
      if (!ok) return;
      await ensureLocalQueueV5333();
      const pending = await pendingOpsV5332();
      if (pending.some(op => !operationReceiptV538(imported, op))) return toast('BKP não aplicado: há leituras locais que não estão confirmadas neste cadastro ou fechamento. Exporte o BKP móvel e leve ao painel para revisão.', true);
      if (readingDirty) return toast('Salve a leitura em edição antes de importar o próximo mês.', true);
      await idbPutV5332(OFFLINE_SNAPSHOT_STORE_V5332, { id: `before-import:${Date.now()}`, state: JSON.parse(JSON.stringify(state)) });
      const next = normalizeMobileState(imported);
      localStorage.setItem(KEY, JSON.stringify(next));
      state = next;
      await settleReceivedOpsV538(next, pending);
      // Leituras móveis usam exclusivamente a fila por unidade; nunca enviam cadastro inteiro.
      searchText = '';
      initIndexes();
      toast('BKP restaurado no celular.');
      render();
    } catch {
      toast('BKP invalido. Selecione um arquivo JSON do KR2MELO.', true);
    }
  }
  function currentBlock() { return state.blocks.find(block => block.id === state.selected) || state.blocks[blockIndex] || state.blocks[0] || null; }
  function currentUnit() { return currentBlock()?.units?.[unitIndex] || null; }
  function isDone(unit) { return Boolean(unit && unit.mobileDone === true); }
  function doneCount(block) { return block.units.filter(isDone).length; }
  function noAccessCount(block) { return block.units.filter(unit => unit.operationalStatus === 'sem_acesso' && isDone(unit)).length; }
  function realCount(block) { return block.units.filter(unit => unit.current !== '' && unit.current !== null && unit.current !== undefined && unit.readingType !== 'estimated').length; }
  function alertCount(block) {
    return block.units.filter(unit => unit.current !== '' && unit.current !== null && unit.current !== undefined && issueFor(unit, n(unit.current))).length;
  }
  function hasAlert(unit) {
    return unit.current !== '' && unit.current !== null && unit.current !== undefined && Boolean(issueFor(unit, n(unit.current)));
  }
  function savedAtLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function initIndexes() {
    const selectedIndex = state.blocks.findIndex(block => block.id === state.selected);
    blockIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const block = currentBlock();
    sortBlockUnits(block);
    const next = block?.units?.findIndex(unit => !isDone(unit));
    unitIndex = next >= 0 ? next : 0;
  }
  function issueFor(unit, current) {
    const previous = n(unit.previous), diff = current - previous;
    if (current < previous) return { level: 'danger', text: 'A leitura atual esta menor que a anterior.' };
    if (diff > 30) return { level: 'danger', text: 'Consumo acima de 30 m3. Confira antes de salvar.' };
    if (diff > 20) return { level: 'warn', text: 'Consumo entre 21 e 30 m3. Confira o hidrometro.' };
    if (diff > 15) return { level: 'warn', text: 'Consumo acima de 15 m3.' };
    return null;
  }
  function routeSortKey(unit) {
    const label = String(unit?.number || '').toUpperCase().replace(/\s+/g, '');
    const suffix = (label.match(/[A-Z]+$/) || [''])[0];
    const numeric = Number((label.match(/\d+/) || ['0'])[0]);
    if (!Number.isFinite(numeric) || numeric <= 0) return `${suffix}|999|999|${label}`;
    const stack = ((numeric - 1) % 10) + 1;
    const floor = Math.floor((numeric - stack) / 10);
    return `${suffix}|${String(stack).padStart(3, '0')}|${String(floor).padStart(3, '0')}|${label}`;
  }
  function routeCompare(a, b) {
    return routeSortKey(a).localeCompare(routeSortKey(b), 'pt-BR', { numeric: true });
  }
  function sortBlockUnits(block) {
    if (Array.isArray(block?.units)) block.units.sort(routeCompare);
    return block;
  }
  function routeOrderedIndexes(block, options = {}) {
    const q = options.search === false ? '' : searchText.trim().toLowerCase();
    return [...block.units].map((item, index) => ({ item, index }))
      .filter(({ item }) => !q || String(item.number).toLowerCase().includes(q) || String(item.resident || '').toLowerCase().includes(q))
      .filter(({ item }) => options.filter === false || mobileFilter === 'todos' || (mobileFilter === 'pendentes' && !isDone(item)) || (mobileFilter === 'lidas' && item.current !== '' && item.current !== null && item.current !== undefined && item.readingType !== 'estimated') || (mobileFilter === 'sem_acesso' && item.operationalStatus === 'sem_acesso' && isDone(item)) || (mobileFilter === 'alertas' && hasAlert(item)) || (mobileFilter === 'com_foto' && Boolean(item.photo)))
      .sort((a, b) => Number(isDone(a.item)) - Number(isDone(b.item)) || routeCompare(a.item, b.item));
  }
  function nextPendingIndex(block, start) {
    sortBlockUnits(block);
    const ordered = routeOrderedIndexes(block, { search: false, filter: false }).filter(({ item }) => !isDone(item));
    const afterCurrent = ordered.find(({ index }) => index > start);
    if (afterCurrent) return afterCurrent.index;
    if (ordered.length) return ordered[0].index;
    return Math.min(start + 1, block.units.length - 1);
  }
  function filteredUnits(block) {
    return routeOrderedIndexes(block);
  }
  function jumpPending() {
    const block = currentBlock();
    if (!block) return;
    sortBlockUnits(block);
    const next = routeOrderedIndexes(block, { search: false, filter: false }).find(({ item }) => !isDone(item));
    if (!next) return toast('Todas as leituras foram conferidas.');
    unitIndex = next.index;
    render();
  }
  function reopenReading() {
    const unit = currentUnit();
    if (!unit) return;
    unit.mobileDone = false;
    unit.mobileReopened = true;
    recordUnitChange(unit, 'Reabertura mobile', 'mobileDone', true, false);
    save('Leitura reaberta para conferencia');
    render();
  }
  function duplicateUnitNumber(block, unit, number) {
    const target = String(number || '').trim().toLowerCase();
    return block.units.some(item => item !== unit && String(item.number || '').trim().toLowerCase() === target);
  }
  function recalcUnit(block, unit) {
    if (unit.current === '' || unit.current === null || unit.current === undefined) return;
    const current = n(unit.current);
    if (unit.operationalStatus === 'trocado') {
      unit.m3 = Number.isFinite(Number(unit.m3)) && Number(unit.m3) >= 0 ? Number(unit.m3) : current;
    } else if (current < n(unit.previous) && Number.isFinite(Number(unit.m3)) && Number(unit.m3) > 0) {
      unit.m3 = Number(unit.m3);
    } else {
      unit.m3 = Math.max(0, current - n(unit.previous));
    }
    unit.value = cost(unit.m3, tariffForMonth(block, block.month));
  }
  function recordUnitChange(unit, type, field, oldValue, newValue) {
    if (!unit || String(oldValue ?? '') === String(newValue ?? '')) return;
    unit.changeLog = Array.isArray(unit.changeLog) ? unit.changeLog : [];
    unit.changeLog.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, at: new Date().toISOString(), operator: 'Mobile', type, field, oldValue: String(oldValue ?? ''), newValue: String(newValue ?? '') });
    unit.changeLog = unit.changeLog.slice(0, 50);
  }
  function pinHash(value) {
    let hash = 2166136261;
    for (const char of String(value || '')) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return String(hash >>> 0);
  }
  function verifyAdminPin() {
    const existing = String(state.mobileAdminPinHash || '');
    if (!existing) {
      const created = prompt('Crie um PIN administrativo para editar apartamentos neste celular. Use 4 a 8 numeros.');
      if (created === null) return false;
      if (!/^\d{4,8}$/.test(created)) { toast('PIN deve ter 4 a 8 numeros.', true); return false; }
      const confirmPin = prompt('Confirme o PIN administrativo.');
      if (confirmPin !== created) { toast('PIN nao confere.', true); return false; }
      state.mobileAdminPinHash = pinHash(created);
      save('PIN administrativo criado');
      return true;
    }
    const informed = prompt('Digite o PIN administrativo para editar este apartamento.');
    if (pinHash(informed) !== existing) { toast('PIN incorreto.', true); return false; }
    return true;
  }
  function editCurrentUnit() {
    const block = currentBlock(), unit = currentUnit();
    if (!block || !unit) return;
    if (!verifyAdminPin()) return;
    const number = prompt('Apartamento / hidrometro', unit.number);
    if (number === null) return;
    const cleanNumber = number.trim();
    if (!cleanNumber) return toast('Informe o apartamento.', true);
    if (duplicateUnitNumber(block, unit, cleanNumber)) return toast('Ja existe apartamento com esse numero.', true);
    const resident = prompt('Responsavel', unit.resident || '');
    if (resident === null) return;
    const previousRaw = prompt('Leitura anterior', unit.previous ?? 0);
    if (previousRaw === null) return;
    const previous = Number(String(previousRaw).replace(',', '.').trim());
    if (!Number.isFinite(previous) || previous < 0) return toast('Leitura anterior invalida.', true);
    recordUnitChange(unit, 'Edicao mobile', 'number', unit.number, cleanNumber);
    recordUnitChange(unit, 'Edicao mobile', 'resident', unit.resident, resident.trim());
    recordUnitChange(unit, 'Edicao mobile', 'previous', unit.previous, previous);
    unit.number = cleanNumber;
    unit.resident = resident.trim();
    unit.previous = previous;
    recalcUnit(block, unit);
    sortBlockUnits(block);
    unitIndex = block.units.findIndex(item => item.id === unit.id);
    state.selected = block.id;
    if (!save(`Apto ${unit.number} atualizado`)) return;
    render();
  }

  function render() {
    const app = $('#mobileApp');
    if (!state.blocks.length) {
      app.innerHTML = `<section class="card hero"><h1>Nenhum condominio disponivel</h1><p>Cadastre o condominio e as unidades no painel administrativo antes da leitura em campo.</p></section>`;
      return;
    }
    const block = currentBlock(); const unit = currentUnit();
    if (!block || !unit) {
      app.innerHTML = '<section class="card"><h2>Sem apartamentos</h2><p class="muted">Cadastre apartamentos no painel administrativo.</p></section>';
      return;
    }
    const done = doneCount(block), percent = block.units.length ? Math.round(done / block.units.length * 100) : 0;
    const pending = Math.max(0, block.units.length - done), real = realCount(block), noAccess = noAccessCount(block), alerts = alertCount(block);
    const consumption = unit.current === '' ? 0 : Math.max(0, n(unit.current) - n(unit.previous));
    const orderedUnits = filteredUnits(block);
    const savedAt = savedAtLabel(unit.mobileSavedAt);
    const photoAttached = Boolean(unit.photo);

    app.innerHTML = `<section class="card hero"><p>Leitura in loco</p><h1>${esc(block.name)}</h1><p>${monthLabel(block.month)} - ${done}/${block.units.length} leituras</p><div class="progress"><i style="width:${percent}%"></i></div></section>
      <section class="card compact-card"><label class="muted"><b>Condominio</b></label><select id="blockPick">${state.blocks.map((item, index) => `<option value="${index}" ${item.id === block.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></section>
      <section class="card route-summary" id="routeSummary"><div><small>Pendentes</small><strong>${pending}</strong></div><div><small>Lidas</small><strong>${real}</strong></div><div><small>Sem acesso</small><strong>${noAccess}</strong></div><div><small>Alertas</small><strong>${alerts}</strong></div></section>
      <section class="card mobile-tools">
        <div class="search-box-wrap"><input id="aptSearch" autocomplete="off" value="${esc(searchText)}" placeholder="Buscar apto ou morador">${searchText ? '<button type="button" id="clearSearchBtn" class="search-clear-btn" aria-label="Limpar busca">✕</button>' : ''}</div>
        <select id="mobileFilter">
          <option value="pendentes" ${mobileFilter === 'pendentes' ? 'selected' : ''}>Somente pendentes</option>
          <option value="todos" ${mobileFilter === 'todos' ? 'selected' : ''}>Todos</option>
          <option value="lidas" ${mobileFilter === 'lidas' ? 'selected' : ''}>Lidas</option>
          <option value="com_foto" ${mobileFilter === 'com_foto' ? 'selected' : ''}>Com foto</option>
          <option value="sem_acesso" ${mobileFilter === 'sem_acesso' ? 'selected' : ''}>Sem acesso</option>
          <option value="alertas" ${mobileFilter === 'alertas' ? 'selected' : ''}>Alertas</option>
        </select>
        <button class="secondary pending-button" id="jumpPending">Ir para pendente</button>
        <details class="mobile-more-tools">
          <summary>Backup, código e nuvem</summary>
          <div>
            <button class="secondary backup-button" id="copyReadingsCodeBtn">📋 Copiar código</button>
            <button class="secondary backup-button" id="mobileBackupBtn">Baixar BKP</button>
            <button class="secondary backup-button" id="mobileImportBtn">Upar BKP</button>
            <button class="secondary sync-button" id="mobileSyncPushBtn">Enviar nuvem</button>
            <button class="secondary sync-button" id="mobileSyncPullBtn">Baixar nuvem</button>
          </div>
        </details>
      </section>
      <section class="card reading-card ${hasAlert(unit) ? 'reading-card-alert' : ''}">
        <div class="unit-overview">
          <div class="unit-data">
            <div class="unit-head">
              <div><span class="muted">Apartamento</span><div class="unit-number">${esc(unit.number)}</div></div>
              <span class="pill ${isDone(unit) ? 'ok' : 'warn'}">${isDone(unit) ? 'Salvo' : 'Pendente'}</span>
            </div>
            <p class="muted resident-line">${esc(unit.resident || 'Responsavel nao informado')}</p>
            ${savedAt ? `<p class="saved-line">Salvo em ${esc(savedAt)}</p>` : ''}
          </div>
          <button class="secondary edit-unit" id="editUnitBtn" type="button">Editar apto</button>
        </div>
        <div class="read-kpis">
          <div><small>Anterior</small><strong>${fmt(unit.previous)}</strong></div>
          <div><small>Consumo</small><strong id="liveConsumption">${fmt(consumption)} m3</strong></div>
        </div>
        <!-- MOSTRADOR MECÂNICO DO HIDRÔMETRO (FORMATO OFICIAL ENTENDA SEU HIDRÔMETRO) -->
        <div class="meter-widget-card" id="meterWidget">
          <div class="meter-widget-head">
            <span class="meter-badge-inmetro">INMETRO</span>
            <div class="meter-widget-title">
              <strong>Mostrador Mecânico In Loco</strong>
              <small>Escala Oficial m³ e Litros</small>
            </div>
            <span class="meter-badge-class">H-B · V-A</span>
          </div>

          <div class="meter-dial-face">
            <div class="meter-counter-frame">
              <div class="meter-rollers-container">
                <div class="meter-rollers-black" title="Metros Cúbicos (m³)">
                  <span class="roller-digit" id="rollerB4">0</span>
                  <span class="roller-digit" id="rollerB3">0</span>
                  <span class="roller-digit" id="rollerB2">0</span>
                  <span class="roller-digit" id="rollerB1">0</span>
                </div>
                <div class="meter-rollers-red" title="Litros (centenas e dezenas)">
                  <span class="roller-digit" id="rollerR2">0</span>
                  <span class="roller-digit" id="rollerR1">0</span>
                </div>
              </div>
              <span class="meter-symbol-m3">m³</span>
            </div>

            <div class="meter-guides-row">
              <div class="meter-guide-col black">
                <span class="guide-pointer">▲</span>
                <span class="guide-text"><b>Metros Cúbicos (m³)</b><br><small>1 m³ = 1.000 Litros</small></span>
              </div>
              <div class="meter-guide-col red">
                <span class="guide-pointer red">▲</span>
                <span class="guide-text"><b>Litros</b><br><small>Centenas / Dezenas</small></span>
              </div>
            </div>

            <div class="meter-analogs-row">
              <div class="meter-analog-gauge">
                <div class="analog-dial"><div class="analog-needle" id="needleLiters"></div></div>
                <span>Litros (×1)</span>
              </div>
              <div class="meter-propeller-box">
                <span class="meter-propeller-icon" id="meterImpeller">⚙️</span>
                <span>Turbina / Fluxo</span>
              </div>
              <div class="meter-analog-gauge">
                <div class="analog-dial"><div class="analog-needle" id="needleDeciliters"></div></div>
                <span>Décimos (×0.1)</span>
              </div>
            </div>
          </div>

          <button type="button" class="btn-meter-guide-modal" id="btnOpenMeterGuide">
            📘 Entenda seu Hidrômetro (Infográfico)
          </button>
        </div>
        <div class="reading-entry">
          <div class="reading-big">
            <label for="currentReading">Leitura atual</label>
            <input id="currentReading" inputmode="decimal" autocomplete="off" value="${unit.current === '' ? '' : esc(unit.current)}" placeholder="0" aria-describedby="readingRoundHint">
            <small id="readingRoundHint" class="reading-hint">Arredondamento automático ao salvar</small>
          </div>
          <button class="primary save-reading" id="saveBtn" type="button"><span>Salvar</span><small>e próximo</small></button>
        </div>
        ${photoAttached ? `
          <div class="photo-preview-wrap">
            <img src="${unit.photo}" class="photo-thumbnail" alt="Foto hidrômetro" id="viewPhotoThumbnail">
            <div class="photo-info">
              <strong>Foto do hidrômetro</strong>
              <small class="muted">Comprovante anexado</small>
            </div>
            <div class="photo-actions">
              <button type="button" class="secondary" id="viewPhotoBtn">Ver</button>
              <button type="button" class="secondary" id="retakePhotoBtn" title="Tirar outra foto">📷 Trocar</button>
              <button type="button" class="secondary" id="deletePhotoBtn" title="Remover foto">✕</button>
            </div>
          </div>
        ` : `
          <button type="button" class="secondary btn-photo-add" id="takePhotoBtn">📷 Tirar foto do hidrômetro</button>
        `}
        <label class="note-field">Observacao da leitura<textarea id="mobileNote" rows="2" placeholder="Ex.: visor embacado, lacre rompido">${esc(unit.note || '')}</textarea></label>
        <div id="alertBox"></div>
        <div class="no-access-row">
          <select id="noAccessReason">
            <option value="sem_acesso:Sem acesso" ${unit.estimatedReason === 'Sem acesso' ? 'selected' : ''}>Sem acesso · Portão / Ausente</option>
            <option value="sem_acesso:Morador ausente" ${unit.estimatedReason === 'Morador ausente' ? 'selected' : ''}>Sem acesso · Morador ausente</option>
            <option value="sem_acesso:Hidrometro inacessivel" ${unit.estimatedReason === 'Hidrometro inacessivel' ? 'selected' : ''}>Sem acesso · Inacessível</option>
            <option value="parado:Hidrômetro parado" ${unit.operationalStatus === 'parado' ? 'selected' : ''}>Hidrômetro parado / travado</option>
            <option value="vazio:Imóvel desocupado" ${unit.operationalStatus === 'vazio' ? 'selected' : ''}>Imóvel vazio / desocupado</option>
            <option value="reforma:Em reforma" ${unit.operationalStatus === 'reforma' ? 'selected' : ''}>Imóvel em reforma</option>
            <option value="vazamento:Vazamento aparente">Suspeita de vazamento</option>
          </select>
          <button class="secondary no-access" id="noAccessBtn">Marcar</button>
        </div>
        <label for="averagePeriod">Período da média de consumo</label>
        <select id="averagePeriod"><option value="two" ${averagePeriod === 'two' ? 'selected' : ''}>Últimos 2 meses com histórico</option><option value="all" ${averagePeriod === 'all' ? 'selected' : ''}>Todo o histórico anterior</option></select>
        <small>A média usa somente o histórico deste APT, anterior à competência atual. Cada mês entra uma vez, com a revisão mais recente.</small>
        <button class="secondary average-reading" id="averageReadingBtn">Aplicar média neste APT</button>
        <button class="secondary average-reading" id="averageAllBtn" ${averageBatchBusy ? 'disabled' : ''}>Aplicar média em todos os APTs pendentes</button>
        <small>O lote percorre todos os APTs deste prédio, independentemente do filtro, preservando leituras preenchidas e rascunhos.</small>
        ${isDone(unit) ? '<button class="secondary reopen" id="reopenBtn">Reabrir leitura</button>' : ''}
        <div class="row nav-row"><button class="secondary" id="prevBtn">Anterior</button><button class="secondary" id="nextBtn">Proximo</button></div>
      </section>
      ${historyMarkup(block, unit)}
      <section class="card apt-card"><h3>Pendentes primeiro</h3><div class="apt-list">${orderedUnits.length ? orderedUnits.map(({ item, index }) => `<button data-jump="${index}" class="${index === unitIndex ? 'active' : ''} ${isDone(item) ? 'done' : ''}">${esc(item.number)}</button>`).join('') : '<p class="muted empty-list">Nenhum apartamento encontrado.</p>'}</div></section>`;
    const hero = app.querySelector('.hero');
    if (hero && block.units.length && done === block.units.length) hero.insertAdjacentHTML('afterend', `<section class="card"><strong>Este mês está com todas as leituras concluídas.</strong><p>Para começar outro mês, receba o cadastro preparado pelo fechamento do painel. Não reabra as leituras antigas.</p><button class="secondary" id="prepareNextMonthV538">${window.KR2Sync?.connected?.()?'Atualizar mês pelo painel':'Importar BKP da próxima leitura'}</button></section>`);
    app.querySelector('#prepareNextMonthV538')?.addEventListener('click', () => window.KR2Sync?.connected?.() ? syncMobilePull() : uploadMobileBackup());
    bind();
    checkAlert($('#currentReading').value);
    setTimeout(() => {
      if (keepSearchFocus) {
        const search = $('#aptSearch');
        search?.focus();
        search?.setSelectionRange(search.value.length, search.value.length);
        keepSearchFocus = false;
      } else {
        const cur = $('#currentReading');
        cur?.focus();
        cur?.select();
      }
    }, 50);
  }
  function bind() {
    const block = currentBlock();
    $('#blockPick').onchange = event => { blockIndex = n(event.target.value); state.selected = state.blocks[blockIndex].id; unitIndex = 0; save(); render(); };
    $('#aptSearch').oninput = event => { searchText = event.target.value; keepSearchFocus = true; render(); };
    const clearSearch = $('#clearSearchBtn');
    if (clearSearch) clearSearch.onclick = () => { searchText = ''; render(); };
    $('#mobileFilter').onchange = event => { mobileFilter = event.target.value; localStorage.setItem('kr2melo.mobileFilter.v5317', mobileFilter); render(); };
    $('#jumpPending').onclick = jumpPending;
    const copyCodeBtn = $('#copyReadingsCodeBtn');
    if (copyCodeBtn) copyCodeBtn.onclick = copyMobileReadingsCode;
    $('#mobileBackupBtn').onclick = downloadMobileBackup;
    $('#mobileImportBtn').onclick = uploadMobileBackup;
    $('#mobileSyncPushBtn').onclick = syncMobilePush;
    $('#mobileSyncPullBtn').onclick = syncMobilePull;
    $('#editUnitBtn').onclick = editCurrentUnit;
    $('#currentReading').oninput = event => { readingDirty = true; checkAlert(event.target.value); updateMeterWidget(event.target.value); };
    $('#currentReading').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); saveReading(); } };
    const takePhoto = $('#takePhotoBtn');
    if (takePhoto) takePhoto.onclick = () => $('#mobileCameraInput')?.click();
    const viewThumbnail = $('#viewPhotoThumbnail');
    if (viewThumbnail) viewThumbnail.onclick = () => { const unit = currentUnit(); viewPhotoModal(unit?.photo, `Apto ${unit?.number} · Foto do hidrômetro`); };
    const viewPhotoBtn = $('#viewPhotoBtn');
    if (viewPhotoBtn) viewPhotoBtn.onclick = () => { const unit = currentUnit(); viewPhotoModal(unit?.photo, `Apto ${unit?.number} · Foto do hidrômetro`); };
    const retakePhoto = $('#retakePhotoBtn');
    if (retakePhoto) retakePhoto.onclick = () => $('#mobileCameraInput')?.click();
    const delPhoto = $('#deletePhotoBtn');
    if (delPhoto) delPhoto.onclick = () => {
      const unit = currentUnit();
      if (unit && confirm(`Remover a foto do apartamento ${unit.number}?`)) {
        unit.photo = '';
        save('Foto removida');
        render();
      }
    };
    $('#mobileNote').onchange = event => { const unit = currentUnit(); if (unit) { unit.note = event.target.value; save('Observacao salva'); } };
    $('#saveBtn').onclick = saveReading;
    $('#noAccessBtn').onclick = markNoAccess;
    $('#averagePeriod').onchange = event => { averagePeriod = event.target.value === 'all' ? 'all' : 'two'; };
    $('#averageAllBtn').onclick = createAllAverageReadings;
    $('#averageReadingBtn').onclick = createAverageReading;
    const reopen = $('#reopenBtn');
    if (reopen) reopen.onclick = reopenReading;
    $('#prevBtn').onclick = () => { unitIndex = Math.max(0, unitIndex - 1); render(); };
    $('#nextBtn').onclick = () => { unitIndex = Math.min(block.units.length - 1, unitIndex + 1); render(); };
    document.querySelectorAll('[data-jump]').forEach(button => { button.onclick = () => { unitIndex = n(button.dataset.jump); render(); }; });

    const u = currentUnit();
    updateMeterWidget(u?.current);
    const guideBtn = $('#btnOpenMeterGuide');
    if (guideBtn) guideBtn.onclick = openMeterGuideModal;
  }

  function openFieldModal(contentHtml) {
    const modal = $('#fieldModal');
    if (!modal) return;
    modal.innerHTML = contentHtml;
    modal.hidden = false;
  }
  function closeFieldModal() {
    const modal = $('#fieldModal');
    if (!modal) return;
    modal.hidden = true;
    modal.innerHTML = '';
  }
  function viewPhotoModal(photoSrc, caption = '') {
    if (!photoSrc) return;
    openFieldModal(`
      <div class="field-modal-card">
        <h3>${caption ? esc(caption) : 'Foto do hidrômetro'}</h3>
        <img src="${photoSrc}" class="field-modal-img" alt="Foto">
        <button type="button" class="field-modal-btn neutral" id="closePhotoModalBtn" style="justify-content:center">✕ Fechar foto</button>
      </div>
    `);
    $('#closePhotoModalBtn').onclick = closeFieldModal;
  }
  function updateMeterWidget(val) {
    const raw = String(val == null ? '' : val).trim().replace(',', '.');
    let intStr = '0', decStr = '00';
    if (raw && !isNaN(Number(raw))) {
      const parts = raw.split('.');
      intStr = parts[0] || '0';
      decStr = (parts[1] || '00').padEnd(2, '0').slice(0, 2);
    }
    const padded = intStr.padStart(4, '0').slice(-4);
    const b4 = $('#rollerB4'), b3 = $('#rollerB3'), b2 = $('#rollerB2'), b1 = $('#rollerB1');
    if (b4) b4.textContent = padded[0] || '0';
    if (b3) b3.textContent = padded[1] || '0';
    if (b2) b2.textContent = padded[2] || '0';
    if (b1) b1.textContent = padded[3] || '0';

    const r2 = $('#rollerR2'), r1 = $('#rollerR1');
    if (r2) r2.textContent = decStr[0] || '0';
    if (r1) r1.textContent = decStr[1] || '0';

    const impeller = $('#meterImpeller');
    if (impeller) {
      const num = Number(raw) || 0;
      impeller.style.transform = `rotate(${(num * 72) % 360}deg)`;
    }
    const nL = $('#needleLiters'), nD = $('#needleDeciliters');
    if (nL) nL.style.transform = `rotate(${((Number(decStr[0] || 0) * 36) % 360)}deg)`;
    if (nD) nD.style.transform = `rotate(${((Number(decStr[1] || 0) * 36) % 360)}deg)`;
  }
  function openMeterGuideModal() {
    openFieldModal(`
      <div class="field-modal-card" style="max-width:440px">
        <h3 style="margin:0 0 6px;color:var(--ink);display:flex;align-items:center;gap:6px">
          <span>📘</span> Entenda seu Hidrômetro
        </h3>
        <p style="font-size:12px;color:var(--muted);margin:0 0 8px;line-height:1.4">
          O hidrômetro mecânico registra o consumo em <b>metros cúbicos (m³)</b> e em <b>litros</b>:
        </p>
        <div style="text-align:center;margin:6px 0;background:#f8fafc;padding:6px;border-radius:10px;border:1px solid #e2e8f0">
          <img src="assets/entenda-hidrometro.jpg" alt="Entenda seu Hidrômetro" style="max-width:100%;max-height:42vh;border-radius:8px;object-fit:contain">
        </div>
        <div style="background:#f1f5f9;border-radius:8px;padding:8px 10px;font-size:11.5px;color:#334155;line-height:1.35;margin-bottom:10px">
          • <b>Dígitos Pretos:</b> Metros Cúbicos (m³). Cada 1 m³ equivale a 1.000 Litros. São estes números que compõem o faturamento oficial.<br>
          • <b>Dígitos Vermelhos:</b> Litros (Centenas e Dezenas). Indicam frações de m³.<br>
          • <b>Ponteiros Circulares:</b> Litros e décimos de litro para detecção de vazamentos minuciosos.
        </div>
        <button type="button" class="field-modal-btn neutral" id="btnCloseMeterGuide" style="justify-content:center">✕ Fechar Guia</button>
      </div>
    `);
    $('#btnCloseMeterGuide').onclick = closeFieldModal;
  }
  function handlePhotoSelected(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        const unit = currentUnit();
        if (unit) {
          unit.photo = compressed;
          save('Foto do hidrômetro anexada');
          render();
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  function promptNegativeReadingModal(unit, current, previous) {
    return new Promise(resolve => {
      const digits = String(Math.round(previous)).length;
      const dialMax = digits <= 4 ? 10000 : 100000;
      const rolloverConsumption = (dialMax - previous) + current;
      openFieldModal(`
        <div class="field-modal-card">
          <h3 style="color:var(--red)">⚠️ Leitura menor que a anterior</h3>
          <p>Apto <b>${esc(unit.number)}</b> · Anterior: <b>${fmt(previous)} m³</b> · Digitada: <b>${fmt(current)} m³</b></p>
          <div class="field-modal-choices">
            <button type="button" class="field-modal-btn danger" id="btnNegativeTypo">
              <span>✏️</span>
              <div>
                <strong>Erro de digitação</strong>
                <small style="display:block;opacity:0.85">Corrigir o número digitado agora</small>
              </div>
            </button>
            <button type="button" class="field-modal-btn success" id="btnNegativeReplaced">
              <span>🔄</span>
              <div>
                <strong>Hidrômetro trocado</strong>
                <small style="display:block;opacity:0.85">Aparelho novo iniciou do zero (${fmt(current)} m³)</small>
              </div>
            </button>
            <button type="button" class="field-modal-btn success" id="btnNegativeRollover">
              <span>⏱️</span>
              <div>
                <strong>Relógio virou (passou de ${dialMax - 1})</strong>
                <small style="display:block;opacity:0.85">Consumo real calculado: ${fmt(rolloverConsumption)} m³</small>
              </div>
            </button>
            <button type="button" class="field-modal-btn neutral" id="btnNegativeCancel">
              <span>✕</span>
              <div>
                <strong>Cancelar</strong>
                <small style="display:block;opacity:0.85">Não salvar e manter como estava</small>
              </div>
            </button>
          </div>
        </div>
      `);
      $('#btnNegativeTypo').onclick = () => { closeFieldModal(); resolve({ action: 'cancel', refocus: true }); };
      $('#btnNegativeReplaced').onclick = () => { closeFieldModal(); resolve({ action: 'replaced' }); };
      $('#btnNegativeRollover').onclick = () => { closeFieldModal(); resolve({ action: 'rollover', consumption: rolloverConsumption }); };
      $('#btnNegativeCancel').onclick = () => { closeFieldModal(); resolve({ action: 'cancel', refocus: false }); };
    });
  }
  function copyMobileReadingsCode() {
    try {
      const payload = {
        ...state,
        version: state.version || APP_VERSION,
        exportedAt: new Date().toISOString(),
        source: 'mobile'
      };
      const json = JSON.stringify(payload);
      const bytes = new TextEncoder().encode(json);
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const code = 'KR2-LEITURAS-1:' + btoa(binary);

      openFieldModal(`
        <div class="field-modal-card">
          <h3>Código das Leituras Móveis</h3>
          <p>Envie este código por WhatsApp ou cole diretamente no computador (Painel → <b>Importar código do celular</b>).</p>
          <textarea id="readingsCodeText" readonly rows="5" style="width:100%;font-size:12px;word-break:break-all">${esc(code)}</textarea>
          <button type="button" class="field-modal-btn success" id="copyCodeInnerBtn" style="justify-content:center">📋 Copiar código</button>
          <button type="button" class="field-modal-btn neutral" id="closeCodeModalBtn" style="justify-content:center">✕ Fechar</button>
        </div>
      `);
      $('#copyCodeInnerBtn').onclick = () => {
        const textarea = $('#readingsCodeText');
        textarea.focus();
        textarea.select();
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(code).then(() => toast('Código copiado com sucesso!')).catch(() => toast('Selecione todo o texto e copie.', true));
        } else {
          toast('Selecione e copie o código.');
        }
      };
      $('#closeCodeModalBtn').onclick = closeFieldModal;
    } catch (e) {
      toast('Não foi possível gerar o código. Utilize o botão Baixar BKP.', true);
    }
  }

  function checkAlert(value) {
    const unit = currentUnit(), box = $('#alertBox'), liveConsEl = $('#liveConsumption');
    if (!unit || !box) return;
    const raw = String(value).replace(',', '.').trim();
    if (raw === '') {
      box.innerHTML = '';
      if (liveConsEl) liveConsEl.innerHTML = `${fmt(unit.m3 || 0)} m³`;
      return;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 0) {
      box.innerHTML = '<p class="alert danger">Digite uma leitura valida.</p>';
      if (liveConsEl) liveConsEl.innerHTML = '<span class="live-consumption-danger">Inválido</span>';
      return;
    }
    const current = Math.round(numeric);
    const previous = n(unit.previous);
    const diff = current - previous;
    if (liveConsEl) {
      if (diff < 0) {
        liveConsEl.innerHTML = `<span class="live-consumption-danger">${fmt(diff)} m³ (Menor!)</span>`;
      } else if (diff > 30) {
        liveConsEl.innerHTML = `<span class="live-consumption-danger">${fmt(diff)} m³</span>`;
      } else if (diff > 15) {
        liveConsEl.innerHTML = `<span class="live-consumption-warn">${fmt(diff)} m³</span>`;
      } else {
        liveConsEl.innerHTML = `<span>${fmt(diff)} m³</span>`;
      }
    }
    const issue = issueFor(unit, current);
    box.innerHTML = issue ? `<p class="alert ${issue.level === 'danger' ? 'danger' : ''}">${issue.text}</p>` : '<p class="alert ok">Leitura dentro da faixa.</p>';
  }

  let isSavingReading = false;
  async function saveReading() {
    if (isSavingReading) return;
    isSavingReading = true;
    try {
      const block = currentBlock(), unit = currentUnit(), input = $('#currentReading');
      const raw = String(input.value).replace(',', '.').trim();
      if (raw === '') return toast('Digite a leitura atual.', true);
      const numeric = Number(raw);
      if (!Number.isFinite(numeric) || numeric < 0) return toast('Digite uma leitura valida.', true);
      const current = Math.round(numeric);
      const previous = n(unit.previous);
      let calculatedM3 = Math.max(0, current - previous);
      let operationalStatus = unit.operationalStatus;
      let noteExtra = '';

      if (current < previous) {
        const choice = await promptNegativeReadingModal(unit, current, previous);
        if (choice.action === 'cancel') {
          if (choice.refocus) {
            input.focus();
            input.select();
          }
          return;
        }
        if (choice.action === 'replaced') {
          operationalStatus = 'trocado';
          calculatedM3 = current; // Inicia contagem do aparelho novo
          noteExtra = `Hidrômetro trocado (Novo iniciou com ${fmt(current)})`;
        } else if (choice.action === 'rollover') {
          calculatedM3 = choice.consumption;
          noteExtra = `Relógio virou (Consumo: ${fmt(calculatedM3)} m³)`;
        }
      } else {
        const issue = issueFor(unit, current);
        if (issue && !confirm(`${issue.text}\n\nDeseja manter esta leitura arredondada (${fmt(current)})?`)) return;
      }

      const oldCurrent = unit.current;
      unit.current = current;
      unit.readingType = 'real';
      if (operationalStatus === 'sem_acesso' || operationalStatus === 'estimada') operationalStatus = 'ocupado';
      unit.operationalStatus = operationalStatus;
      unit.estimatedReason = '';
      unit.m3 = calculatedM3;
      unit.value = cost(unit.m3, tariffForMonth(block, block.month));
      const baseNote = $('#mobileNote')?.value || '';
      unit.note = noteExtra ? (baseNote ? `${baseNote} · ${noteExtra}` : noteExtra) : baseNote;
      unit.mobileDone = true;
      unit.mobileReopened = false;
      unit.mobileSavedAt = new Date().toISOString();
      state.selected = block.id;
      recordUnitChange(unit, 'Leitura mobile', 'current', oldCurrent, current);
      if (!save(`Apto ${unit.number} salvo`)) return;
      readingDirty = false;
      unitIndex = nextPendingIndex(block, unitIndex);
      render();
    } finally {
      isSavingReading = false;
    }
  }

  function applyAverageToUnit(block, unit, result, reason = 'Sem acesso', note = '') {
    const oldCurrent = unit.current;
    unit.current = result.estimated;
    unit.readingType = 'estimated';
    unit.operationalStatus = 'estimada';
    unit.estimatedReason = `${reason} — média de ${result.count} mês(es): ${result.months.join(', ')}`;
    unit.note = note || unit.note || unit.estimatedReason;
    unit.m3 = Math.max(0, result.estimated - n(unit.previous));
    unit.value = cost(unit.m3, tariffForMonth(block, block.month));
    unit.mobileDone = true; unit.mobileReopened = false;
    unit.mobileSavedAt = new Date().toISOString();
    recordUnitChange(unit, 'Leitura estimada mobile', 'current', oldCurrent, result.estimated);
  }
  function averagePreview(unit, result) {
    return `APT ${unit.number}: média ${fmt(result.average)} m³ (${result.months.join(', ')}) | anterior ${fmt(unit.previous)} → estimada ${fmt(result.estimated)}`;
  }
  function createAverageReading() {
    if (averageBatchBusy) return;
    const block = currentBlock(), unit = currentUnit();
    if (!block || !unit) return;
    const result = window.KR2ReadingAverage.calculate(block, unit, averagePeriod);
    if (!result) return toast('Histórico insuficiente ou leitura anterior inválida para este APT e período.', true);
    if (!confirm(`Aplicar leitura estimada?\n\n${averagePreview(unit, result)}${unit.current !== '' ? '\nA leitura atual deste APT será substituída.' : ''}`)) return;
    const rawVal = $('#noAccessReason')?.value || 'Sem acesso';
    const reason = rawVal.includes(':') ? rawVal.split(':')[1] : rawVal;
    const before = JSON.parse(JSON.stringify(unit));
    applyAverageToUnit(block, unit, result, reason, $('#mobileNote')?.value || '');
    state.selected = block.id;
    if (!save(`Apto ${unit.number} estimado pela média`)) { Object.assign(unit, before); return; }
    readingDirty = false;
    unitIndex = nextPendingIndex(block, unitIndex);
    render();
  }
  async function createAllAverageReadings() {
    if (averageBatchBusy) return;
    if (readingDirty) return toast('Salve a leitura em edição antes de aplicar o lote.', true);
    syncFromMainStateV5331({ render: false });
    const block = currentBlock(); if (!block) return;
    const plans = [], skipped = [], blockSnapshot = JSON.stringify(block);
    const ids = new Set();
    for (const unit of block.units) {
      let why = '';
      if (!unit.id || ids.has(String(unit.id)) || block.units.filter(u => String(u.id) === String(unit.id)).length !== 1 || block.units.filter(u => String(u.number).trim().toUpperCase() === String(unit.number).trim().toUpperCase()).length !== 1) why = 'cadastro duplicado ou sem ID';
      ids.add(String(unit.id));
      if (!why && unit.current !== '' && unit.current !== null && unit.current !== undefined) why = 'leitura já preenchida';
      if (!why && currentDraftV5331(block, unit)) why = 'rascunho em edição';
      const result = why ? null : window.KR2ReadingAverage.calculate(block, unit, averagePeriod);
      if (!why && !result) why = 'histórico insuficiente ou anterior inválida';
      if (why) skipped.push(`APT ${unit.number}: ${why}`);
      else plans.push({ unit, result });
    }
    if (!plans.length) { render(); return alert(`Nenhum APT elegível.\n\n${skipped.join('\n')}`); }
    if (!confirm(`Aplicar média separadamente em ${plans.length} APT(s) de ${block.name || 'este prédio'} / ${block.month}?\n\n${plans.map(p => averagePreview(p.unit, p.result)).join('\n')}\n\nPreservados/ignorados (${skipped.length}):\n${skipped.join('\n') || 'Nenhum'}`)) return;
    const latestBlock = readPersistedMobileStateV5331()?.blocks?.find(b => String(b.id) === String(block.id));
    if (!latestBlock || JSON.stringify(latestBlock) !== blockSnapshot) {
      syncFromMainStateV5331();
      return toast('Os dados mudaram durante a conferência. Revise a nova prévia antes de aplicar.', true);
    }
    averageBatchBusy = true;
    const before = JSON.parse(JSON.stringify(state));
    const blockId = block.id, unitIds = plans.map(p => p.unit.id);
    try {
      for (const plan of plans) applyAverageToUnit(block, plan.unit, plan.result, plan.unit.estimatedReason || 'Sem acesso', plan.unit.note || '');
      state.selected = block.id;
      if (!save('', { unitIds })) { state = before; return; }
      let protectionFailed = 0;
      for (const unitId of unitIds) {
        const savedBlock = state.blocks.find(b => String(b.id) === String(blockId));
        const saved = savedBlock?.units.find(u => String(u.id) === String(unitId));
        clearDraftV5331(savedBlock, saved);
        if (!await protectSavedUnitV5332(blockId, unitId)) protectionFailed++;
      }
      if (protectionFailed) toast(`${unitIds.length} APT(s) salvos localmente. Faça um BKP: ${protectionFailed} falha(s) na proteção extra.`, true);
      else toast(`${unitIds.length} APT(s) estimados individualmente; ${skipped.length} preservado(s).`);
    } catch (error) {
      toast('Leituras gravadas localmente. Confira a fila de proteção/sincronização antes de enviar.', true);
      console.error(error);
    } finally { averageBatchBusy = false; render(); }
  }

  function markOperationalStatus() {
    const block = currentBlock(), unit = currentUnit();
    if (!block || !unit) return;
    const rawVal = $('#noAccessReason')?.value || 'sem_acesso:Sem acesso';
    const colonIdx = rawVal.indexOf(':');
    const statusType = colonIdx >= 0 ? rawVal.slice(0, colonIdx) : 'sem_acesso';
    const reasonText = colonIdx >= 0 ? rawVal.slice(colonIdx + 1) : rawVal;

    const oldStatus = unit.operationalStatus || 'ocupado';
    const baseNote = $('#mobileNote')?.value || '';

    if (statusType === 'sem_acesso') {
      unit.current = '';
      unit.readingType = 'real';
      unit.operationalStatus = 'sem_acesso';
      unit.estimatedReason = reasonText;
      unit.note = baseNote ? `${baseNote} · ${reasonText}` : reasonText;
      unit.m3 = 0;
      unit.value = 0;
    } else if (statusType === 'parado') {
      unit.current = unit.previous;
      unit.readingType = 'real';
      unit.operationalStatus = 'parado';
      unit.estimatedReason = 'Hidrômetro parado/travado';
      unit.note = baseNote ? `${baseNote} · Hidrômetro parado/travado` : 'Hidrômetro parado/travado';
      unit.m3 = 0;
      unit.value = 0;
    } else if (statusType === 'vazio') {
      unit.current = unit.previous;
      unit.readingType = 'real';
      unit.operationalStatus = 'vazio';
      unit.estimatedReason = 'Imóvel vazio/desocupado';
      unit.note = baseNote ? `${baseNote} · Imóvel desocupado` : 'Imóvel desocupado';
      unit.m3 = 0;
      unit.value = 0;
    } else if (statusType === 'reforma') {
      unit.operationalStatus = 'reforma';
      unit.estimatedReason = 'Imóvel em reforma';
      unit.note = baseNote ? `${baseNote} · Em reforma` : 'Em reforma';
      recalcUnit(block, unit);
    } else if (statusType === 'vazamento') {
      unit.note = baseNote ? `${baseNote} · Atenção: Suspeita de vazamento aparente` : 'Atenção: Suspeita de vazamento aparente';
      toast(`Alerta de vazamento registrado no Apto ${unit.number}`);
      save('Alerta de vazamento anotado');
      render();
      return;
    }

    unit.mobileDone = true;
    unit.mobileReopened = false;
    unit.mobileSavedAt = new Date().toISOString();
    state.selected = block.id;
    recordUnitChange(unit, 'Situação de campo', 'operationalStatus', oldStatus, unit.operationalStatus);
    if (!save(`Apto ${unit.number} marcado: ${reasonText}`)) return;
    readingDirty = false;
    unitIndex = nextPendingIndex(block, unitIndex);
    render();
  }
  function markNoAccess() {
    return markOperationalStatus();
  }

  function confirmLeaveMobile() {
    if (!readingDirty) return true;
    return confirm('Existe uma leitura digitada que ainda nao foi salva. Sair mesmo assim?');
  }
  window.addEventListener('beforeunload', event => {
    if (!readingDirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
  document.querySelector('.back-system')?.addEventListener('click', event => {
    if (!confirmLeaveMobile()) event.preventDefault();
  });


  // ===================== KR2MELO v5.3.31 — Ponte segura Leitura in loco ↔ Leituras do mês =====================
  const MOBILE_DRAFT_KEY_V5331 = `${KEY}.mobileDrafts.v5331`;
  const MOBILE_SIGNAL_KEY_V5331 = `${KEY}.readingSignal.v5331`;
  const MOBILE_JOURNAL_KEY_V5331 = `${KEY}.mobileJournal.v5331`;
  const MOBILE_READING_FIELDS_V5331 = ['current','m3','value','note','photo','mobileDone','mobileSavedAt','mobileReopened','readingType','operationalStatus','estimatedReason','changeLog','mobileSyncStatus','mobileSyncAt','mobileSyncOperationId','mobileSyncConflict','mobileTransferMethod'];
  const MOBILE_IDENTITY_FIELDS_V5331 = ['number','resident','previous'];

  function readPersistedMobileStateV5331() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY));
      return parsed && Array.isArray(parsed.blocks) ? normalizeMobileState(parsed) : null;
    } catch { return null; }
  }
  function draftKeyV5331(block = currentBlock(), unit = currentUnit()) {
    return block && unit ? `${block.id}:${unit.id}` : '';
  }
  function readDraftsV5331() {
    try { const parsed = JSON.parse(localStorage.getItem(MOBILE_DRAFT_KEY_V5331)); return parsed && typeof parsed === 'object' ? parsed : {}; }
    catch { return {}; }
  }
  function writeDraftV5331(block, unit, values = {}) {
    if (!block || !unit) return;
    const drafts = readDraftsV5331();
    drafts[`${block.id}:${unit.id}`] = {
      blockId: block.id, unitId: unit.id, month: block.month,
      current: String(values.current ?? $('#currentReading')?.value ?? ''),
      note: String(values.note ?? $('#mobileNote')?.value ?? ''),
      updatedAt: new Date().toISOString()
    };
    try { localStorage.setItem(MOBILE_DRAFT_KEY_V5331, JSON.stringify(drafts)); } catch {}
  }
  function currentDraftV5331(block = currentBlock(), unit = currentUnit()) {
    if (!block || !unit) return null;
    const draft = readDraftsV5331()[`${block.id}:${unit.id}`];
    if (!draft || draft.month !== block.month) return null;
    const savedAt = Date.parse(unit.mobileSavedAt || '') || 0;
    const draftAt = Date.parse(draft.updatedAt || '') || 0;
    return draftAt > savedAt ? draft : null;
  }
  function clearDraftV5331(block = currentBlock(), unit = currentUnit()) {
    if (!block || !unit) return;
    const drafts = readDraftsV5331();
    delete drafts[`${block.id}:${unit.id}`];
    try { localStorage.setItem(MOBILE_DRAFT_KEY_V5331, JSON.stringify(drafts)); } catch {}
  }
  function applyPersistedBaseV5331(changedUnitIds = [], includeIdentity = false, changedBlockId = null) {
    const persisted = readPersistedMobileStateV5331();
    if (!persisted) return;
    const changed = new Set(changedUnitIds.map(item => typeof item === 'object' ? JSON.stringify([String(item.blockId), String(item.unitId)]) : String(item)));
    const ownsUnit = (blockId, unitId) => changed.has(JSON.stringify([String(blockId), String(unitId)])) || (changed.has(String(unitId)) && (changedBlockId === null || String(blockId) === String(changedBlockId)));
    // Preserve state-level settings written outside the mobile while keeping the current selection/PIN.
    const selectedId = state.selected;
    const pin = state.mobileAdminPinHash;
    Object.keys(persisted).forEach(key => { if (!['blocks','selected','mobileAdminPinHash'].includes(key)) state[key] = persisted[key]; });
    state.selected = selectedId || persisted.selected;
    if (pin) state.mobileAdminPinHash = pin;

    persisted.blocks.forEach(remoteBlock => {
      let localBlock = state.blocks.find(item => String(item.id) === String(remoteBlock.id));
      if (!localBlock) { state.blocks.push(remoteBlock); return; }
      if (String(localBlock.month) !== String(remoteBlock.month)) throw new Error('A competência mudou no painel. Baixe o cadastro antes de registrar outra leitura.');
      const localUnits = localBlock.units;
      Object.keys(remoteBlock).forEach(key => { if (key !== 'units') localBlock[key] = remoteBlock[key]; });
      const mergedUnits = [];
      remoteBlock.units.forEach(remoteUnit => {
        const localUnit = localUnits.find(item => String(item.id) === String(remoteUnit.id));
        if (!localUnit) { mergedUnits.push(remoteUnit); return; }
        if (!ownsUnit(localBlock.id, localUnit.id)) {
          Object.keys(localUnit).forEach(key => { if (!(key in remoteUnit)) delete localUnit[key]; });
          Object.assign(localUnit, remoteUnit);
        } else {
          const owned = {};
          MOBILE_READING_FIELDS_V5331.forEach(key => { owned[key] = localUnit[key]; });
          if (includeIdentity) MOBILE_IDENTITY_FIELDS_V5331.forEach(key => { owned[key] = localUnit[key]; });
          Object.assign(localUnit, remoteUnit, owned);
        }
        mergedUnits.push(localUnit);
      });
      // If a unit is being edited and was concurrently removed elsewhere, do not silently discard the local reading.
      localUnits.filter(unit => ownsUnit(localBlock.id, unit.id) && !mergedUnits.some(item => String(item.id) === String(unit.id))).forEach(unit => mergedUnits.push(unit));
      localBlock.units = mergedUnits;
    });
  }
  function appendMobileJournalV5331(unitIds = []) {
    if (!unitIds.length) return;
    let journal = [];
    try { const parsed = JSON.parse(localStorage.getItem(MOBILE_JOURNAL_KEY_V5331)); journal = Array.isArray(parsed) ? parsed : []; } catch {}
    const now = new Date().toISOString();
    state.blocks.forEach(block => block.units.forEach(unit => {
      if (String(block.id) !== String(currentBlock()?.id) || !unitIds.map(String).includes(String(unit.id))) return;
      const payload = { blockId: block.id, unitId: unit.id, month: block.month, at: unit.mobileSavedAt || now, fields: {} };
      MOBILE_READING_FIELDS_V5331.forEach(field => { payload.fields[field] = unit[field]; });
      journal.push(payload);
    }));
    journal = journal.sort((a,b) => String(b.at).localeCompare(String(a.at))).slice(0, 200);
    try { localStorage.setItem(MOBILE_JOURNAL_KEY_V5331, JSON.stringify(journal)); } catch {}
  }
  function recoverMobileJournalV5331() {
    let journal = [];
    try { const parsed = JSON.parse(localStorage.getItem(MOBILE_JOURNAL_KEY_V5331)); journal = Array.isArray(parsed) ? parsed : []; } catch {}
    let recovered = 0;
    journal.forEach(entry => {
      const block = state.blocks.find(item => String(item.id) === String(entry.blockId) && String(item.month) === String(entry.month));
      const unit = block?.units?.find(item => String(item.id) === String(entry.unitId));
      if (!unit) return;
      const entryAt = Date.parse(entry.at || '') || 0, savedAt = Date.parse(unit.mobileSavedAt || '') || 0;
      if (entryAt <= savedAt) return;
      Object.entries(entry.fields || {}).forEach(([field,value]) => { if (MOBILE_READING_FIELDS_V5331.includes(field)) unit[field] = value; });
      recalcUnit(block, unit); recovered++;
    });
    if (recovered) {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    }
    return recovered;
  }

  const saveV5331Base = save;
  save = function(message = '', options = {}) {
    const unitIds = Array.isArray(options.unitIds) ? options.unitIds : [];
    const previousJournal = localStorage.getItem(MOBILE_JOURNAL_KEY_V5331);
    try { applyPersistedBaseV5331(unitIds, Boolean(options.includeIdentity), currentBlock()?.id); }
    catch (error) { readingDirty = true; toast(error.message || 'Não foi possível salvar. Preserve um BKP.', true); return false; }
    appendMobileJournalV5331(unitIds);
    const ok = saveV5331Base(message);
    if (!ok) {
      readingDirty = true;
      try {
        if (previousJournal === null) localStorage.removeItem(MOBILE_JOURNAL_KEY_V5331);
        else localStorage.setItem(MOBILE_JOURNAL_KEY_V5331, previousJournal);
      } catch {}
    }
    if (ok) {
      try { localStorage.setItem(MOBILE_SIGNAL_KEY_V5331, JSON.stringify({ at: new Date().toISOString(), blockId: currentBlock()?.id || '', unitIds })); } catch {}
    }
    return ok;
  };

  function syncFromMainStateV5331(options = {}) {
    const persisted = readPersistedMobileStateV5331();
    if (!persisted) return false;
    const block = currentBlock(), unit = currentUnit();
    const blockId = block?.id, unitId = unit?.id;
    const draft = currentDraftV5331(block, unit);
    if (draft && persisted.blocks?.find(b => String(b.id) === String(blockId))?.month !== block?.month) { toast('O painel mudou o mês. Preserve a leitura em edição em um BKP antes de atualizar.', true); return false; }
    state = persisted;
    state.selected = state.blocks.some(item => item.id === blockId) ? blockId : (state.selected || state.blocks[0]?.id || null);
    initIndexes();
    const selectedBlock = currentBlock();
    if (selectedBlock && unitId) {
      const idx = selectedBlock.units.findIndex(item => String(item.id) === String(unitId));
      if (idx >= 0) unitIndex = idx;
    }
    if (options.render !== false) render();
    if (draft) {
      const current = $('#currentReading'), note = $('#mobileNote');
      if (current) current.value = draft.current;
      if (note) note.value = draft.note;
      readingDirty = true;
      checkAlert(draft.current);
    }
    return true;
  }

  const renderV5331Base = render;
  render = function() {
    renderV5331Base();
    const block = currentBlock(), unit = currentUnit();
    if (!block || !unit) return;
    const draft = currentDraftV5331(block, unit);
    if (draft) {
      const current = $('#currentReading'), note = $('#mobileNote');
      if (current) current.value = draft.current;
      if (note) note.value = draft.note;
      readingDirty = true;
      checkAlert(draft.current);
      const card = document.querySelector('.reading-card .unit-overview');
      if (card && !card.querySelector('.draft-pill-v5331')) card.insertAdjacentHTML('beforeend', '<span class="pill warn draft-pill-v5331">Rascunho protegido</span>');
    }
    const hero = document.querySelector('.hero');
    if (hero && !document.querySelector('.sync-bridge-mobile-v5331')) {
      hero.insertAdjacentHTML('afterend', `<section class="card sync-bridge-mobile-v5331"><div><strong>Dados compartilhados com Leituras do mês</strong><small>Salvamento local seguro + recuperação de rascunho</small></div><span class="pill ok">Protegido</span></section>`);
    }
  };

  const bindV5331Base = bind;
  bind = function() {
    bindV5331Base();
    const reading = $('#currentReading'), note = $('#mobileNote');
    if (reading) reading.oninput = event => {
      readingDirty = true;
      writeDraftV5331(currentBlock(), currentUnit(), { current: event.target.value, note: note?.value || '' });
      checkAlert(event.target.value);
      updateMeterWidget(event.target.value);
    };
    updateMeterWidget(reading?.value);
    if (note) {
      note.oninput = event => {
        readingDirty = true;
        writeDraftV5331(currentBlock(), currentUnit(), { current: reading?.value || '', note: event.target.value });
      };
      // Evita salvar o estado inteiro em onchange. A observação viaja junto com a leitura/rascunho.
      note.onchange = () => {};
    }
  };

  const saveReadingV5331Base = saveReading;
  saveReading = async function() {
    const block = currentBlock(), unit = currentUnit();
    if (!block || !unit) return;
    const beforeId = unit.id;
    // O corpo original chama save(); passamos o alvo por um marcador temporário.
    const originalSave = save;
    save = (message = '') => originalSave(message, { unitIds: [beforeId] });
    try { await saveReadingV5331Base(); }
    finally { save = originalSave; }
    const freshBlock = currentBlock();
    const freshUnit = freshBlock?.units?.find(item => String(item.id) === String(beforeId));
    if (freshUnit?.mobileDone && !readingDirty) clearDraftV5331(freshBlock, freshUnit);
  };

  const createAverageReadingV5331Base = createAverageReading;
  createAverageReading = function() {
    const unit = currentUnit(); if (!unit) return;
    const id = unit.id, originalSave = save;
    save = (message = '') => originalSave(message, { unitIds: [id] });
    try { return createAverageReadingV5331Base(); }
    finally { save = originalSave; const block = currentBlock(); const saved = block?.units?.find(item => String(item.id) === String(id)); if (saved?.mobileDone && !readingDirty) clearDraftV5331(block, saved); }
  };
  const markNoAccessV5331Base = markNoAccess;
  markNoAccess = function() {
    const unit = currentUnit(); if (!unit) return;
    const id = unit.id, originalSave = save;
    save = (message = '') => originalSave(message, { unitIds: [id] });
    try { return markNoAccessV5331Base(); }
    finally { save = originalSave; const block = currentBlock(); const saved = block?.units?.find(item => String(item.id) === String(id)); if (saved?.mobileDone && !readingDirty) clearDraftV5331(block, saved); }
  };
  const reopenReadingV5331Base = reopenReading;
  reopenReading = function() {
    const unit = currentUnit(); if (!unit) return;
    const id = unit.id, originalSave = save;
    save = (message = '') => originalSave(message, { unitIds: [id] });
    try { return reopenReadingV5331Base(); } finally { save = originalSave; }
  };
  const editCurrentUnitV5331Base = editCurrentUnit;
  editCurrentUnit = function() {
    const unit = currentUnit(); if (!unit) return;
    const id = unit.id, originalSave = save;
    save = (message = '') => originalSave(message, { unitIds: [id], includeIdentity: true });
    try { return editCurrentUnitV5331Base(); } finally { save = originalSave; }
  };

  window.addEventListener('storage', event => {
    if (event.key !== KEY || !event.newValue) return;
    // Outra aba (Leituras do mês) atualizou o mesmo banco local. Recarrega sem apagar rascunho.
    syncFromMainStateV5331({ render: true });
    toast('Atualização recebida de Leituras do mês.');
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncFromMainStateV5331({ render: true });
  });


  // ===================== KR2MELO v5.3.41 — Offline-first / IndexedDB / fila segura =====================
  const OFFLINE_DB_V5332 = 'kr2melo-offline-v5332';
  const OFFLINE_DB_VERSION_V5332 = 1;
  const OFFLINE_OP_STORE_V5332 = 'readingOps';
  const OFFLINE_SNAPSHOT_STORE_V5332 = 'snapshots';
  const CLOUD_READING_FIELDS_V5332 = ['current','m3','value','note','photo','mobileDone','mobileSavedAt','mobileReopened','readingType','operationalStatus','estimatedReason','changeLog'];
  let syncRunningV5332 = false;

  function opIdV5332() {
    return `op-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  }
  function openOfflineDbV5332() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível neste navegador.'));
      const req = indexedDB.open(OFFLINE_DB_V5332, OFFLINE_DB_VERSION_V5332);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(OFFLINE_OP_STORE_V5332)) {
          const store = db.createObjectStore(OFFLINE_OP_STORE_V5332, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('blockMonth', ['blockId','month'], { unique: false });
        }
        if (!db.objectStoreNames.contains(OFFLINE_SNAPSHOT_STORE_V5332)) db.createObjectStore(OFFLINE_SNAPSHOT_STORE_V5332, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Falha ao abrir armazenamento offline.'));
    });
  }
  async function idbPutV5332(storeName, value) {
    const db = await openOfflineDbV5332();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value);
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
    return value;
  }
  async function idbGetAllV5332(storeName) {
    const db = await openOfflineDbV5332();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
        req.onerror = () => reject(req.error);
      });
    } finally { db.close(); }
  }
  async function idbDeleteV5332(storeName, id) {
    const db = await openOfflineDbV5332();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite'); tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  }
  async function requestPersistentStorageV5332() {
    try {
      if (!navigator.storage?.persist) return false;
      const already = await navigator.storage.persisted?.();
      if (already) return true;
      return Boolean(await navigator.storage.persist());
    } catch { return false; }
  }
  function snapshotReadingFieldsV5332(unit) {
    const fields = {};
    CLOUD_READING_FIELDS_V5332.forEach(field => { fields[field] = JSON.parse(JSON.stringify(unit[field] ?? null)); });
    return fields;
  }
  function persistStateDirectV5332() {
    try {
      const persisted = readPersistedMobileStateV5331();
      const owned = [];
      for (const block of state.blocks) for (const unit of block.units) {
        const other = persisted?.blocks?.find(item => String(item.id) === String(block.id) && String(item.month) === String(block.month))?.units?.find(item => String(item.id) === String(unit.id));
        if (!other || (Date.parse(unit.mobileSavedAt || '') || 0) >= (Date.parse(other.mobileSavedAt || '') || 0)) owned.push({ blockId: block.id, unitId: unit.id });
      }
      applyPersistedBaseV5331(owned);
      state.version = APP_VERSION; localStorage.setItem(KEY, JSON.stringify(state)); return true;
    } catch { return false; }
  }
  function findUnitByOpV5332(container, op) {
    const block = container?.blocks?.find(item => String(item.id) === String(op.blockId) && String(item.month) === String(op.month));
    const unit = block?.units?.find(item => String(item.id) === String(op.unitId));
    return { block, unit };
  }
  async function queueUnitForCloudV5332(blockId, unitId) {
    const block = state.blocks.find(item => String(item.id) === String(blockId));
    const unit = block?.units?.find(item => String(item.id) === String(unitId));
    if (!block || !unit || !unit.mobileDone) return null;
    const op = {
      id: opIdV5332(), blockId: block.id, unitId: unit.id, unitNumber: unit.number, month: block.month,
      at: unit.mobileSavedAt || new Date().toISOString(), createdAt: new Date().toISOString(), status: 'pending',
      previous: unit.previous,
      ownerId: window.KR2Sync?.getConfig?.()?.user?.id || '',
      attempts: 0, fields: snapshotReadingFieldsV5332(unit), remoteFields: null, lastError: ''
    };
    // Segunda cópia durável independente do localStorage.
    await idbPutV5332(OFFLINE_OP_STORE_V5332, op);
    await idbPutV5332(OFFLINE_SNAPSHOT_STORE_V5332, { id: `${block.id}:${unit.id}:${op.at}`, blockId: block.id, unitId: unit.id, month: block.month, at: op.at, fields: op.fields });
    unit.mobileTransferMethod = '';
    unit.mobileSyncStatus = window.KR2Sync?.connected?.() ? 'pending' : 'local';
    unit.mobileSyncOperationId = op.id;
    unit.mobileSyncAt = '';
    unit.mobileSyncConflict = null;
    persistStateDirectV5332();
    render();
    if (!syncRunningV5332 && navigator.onLine && window.KR2Sync?.connected?.()) processOfflineQueueV5332();
    return op;
  }
  function fieldsDifferV5332(a = {}, b = {}) {
    return CLOUD_READING_FIELDS_V5332.some(field => JSON.stringify(a[field] ?? null) !== JSON.stringify(b[field] ?? null));
  }
  function applyFieldsV5332(unit, fields = {}) {
    CLOUD_READING_FIELDS_V5332.forEach(field => { if (field in fields) unit[field] = JSON.parse(JSON.stringify(fields[field])); });
  }
  async function pendingOpsV5332() {
    const all = await idbGetAllV5332(OFFLINE_OP_STORE_V5332);
    await settleReceivedOpsV538(state, all.filter(op => ['pending','syncing','conflict'].includes(op.status)));
    for (const op of all) {
      const { unit } = findUnitByOpV5332(state, op);
      if (unit?.mobileTransferMethod === 'backup' && unit.mobileSyncStatus === 'synced' && unit.mobileSyncOperationId === op.id && Date.parse(unit.mobileSavedAt) === Date.parse(op.at)) {
        op.status = 'transferred-panel'; await idbPutV5332(OFFLINE_OP_STORE_V5332, op);
      }
    }
    const latest = new Map();
    for (const op of all.filter(op => ['pending','syncing','conflict'].includes(op.status))) {
      const key = JSON.stringify([op.ownerId || '', op.blockId, op.month, op.unitId]);
      const previous = latest.get(key);
      if (!previous || String(op.at) > String(previous.at) || (op.at === previous.at && String(op.createdAt) > String(previous.createdAt))) latest.set(key, op);
    }
    for (const op of all.filter(op => ['pending','syncing','conflict'].includes(op.status))) {
      const key = JSON.stringify([op.ownerId || '', op.blockId, op.month, op.unitId]);
      if (latest.get(key).id !== op.id) { op.status = 'superseded'; await idbPutV5332(OFFLINE_OP_STORE_V5332, op); }
    }
    return [...latest.values()];
  }
  async function markOpsSyncedV5332(ops, syncedAt) {
    for (const op of ops) {
      op.status = 'synced'; op.syncedAt = syncedAt; op.lastError = '';
      await idbPutV5332(OFFLINE_OP_STORE_V5332, op);
      const { unit } = findUnitByOpV5332(state, op);
      if (unit && String(unit.mobileSyncOperationId || '') === String(op.id)) {
        unit.mobileSyncStatus = 'synced'; unit.mobileSyncAt = syncedAt; unit.mobileSyncConflict = null;
      }
    }
    persistStateDirectV5332();
  }
  async function markOpConflictV5332(op, remoteUnit) {
    op.remotePrevious = remoteUnit?.previous;
    op.status = 'conflict'; op.remoteFields = (remoteUnit ? snapshotReadingFieldsV5332(remoteUnit) : null); op.lastError = remoteUnit ? 'Leitura diferente encontrada na nuvem.' : 'Unidade ou competência ausente na nuvem.';
    await idbPutV5332(OFFLINE_OP_STORE_V5332, op);
    const { unit } = findUnitByOpV5332(state, op);
    if (unit) {
      unit.mobileSyncStatus = 'conflict'; unit.mobileSyncConflict = { opId: op.id, remoteAt: remoteUnit?.mobileSavedAt || '', remoteFields: op.remoteFields };
    }
    persistStateDirectV5332();
  }
  async function processOfflineQueueV5332(options = {}) {
    if (syncRunningV5332) return;
    if (!navigator.onLine || !window.KR2Sync?.connected?.()) { render(); return; }
    syncRunningV5332 = true;
    try {
      await ensureLocalQueueV5333();
      let ops = (await pendingOpsV5332()).filter(op => op.status !== 'conflict' || op.forceLocal === true);
      if (!ops.length) { if (options.message) toast('Tudo já está sincronizado.'); return; }
      for (const op of ops) { op.status = 'syncing'; op.attempts = Number(op.attempts || 0) + 1; await idbPutV5332(OFFLINE_OP_STORE_V5332, op); const { unit } = findUnitByOpV5332(state, op); if (unit) unit.mobileSyncStatus = 'syncing'; }
      persistStateDirectV5332(); render();

      let remote = await window.KR2Sync.pullState();
      remote = remote && Array.isArray(remote.blocks) ? normalizeMobileState(remote) : normalizeMobileState(JSON.parse(JSON.stringify(state)));
      const safeOps = [];
      for (const op of ops) {
        const { unit: remoteUnit } = findUnitByOpV5332(remote, op);
        const ownerId = window.KR2Sync.getConfig?.()?.user?.id || '';
        if (op.ownerId && op.ownerId !== ownerId) throw new Error('A fila pertence a outra conta. Entre na conta usada durante a leitura.');
        if (!op.ownerId) { op.ownerId = ownerId; await idbPutV5332(OFFLINE_OP_STORE_V5332, op); }
        if (!remoteUnit) {
          await markOpConflictV5332(op, null);
          continue;
        }
        if (op.previous !== undefined && Number(remoteUnit.previous) !== Number(op.previous)) {
          await markOpConflictV5332(op, remoteUnit); continue;
        }
        const remoteAt = Date.parse(remoteUnit.mobileSavedAt || '') || 0;
        const localAt = Date.parse(op.at || '') || 0;
        if (!op.forceLocal && remoteAt >= localAt && fieldsDifferV5332(remoteUnit, op.fields)) {
          await markOpConflictV5332(op, remoteUnit);
          continue;
        }
        applyFieldsV5332(remoteUnit, op.fields);
        remoteUnit.mobileTransferMethod = '';
        remoteUnit.mobileSyncStatus = 'synced'; remoteUnit.mobileSyncAt = new Date().toISOString(); remoteUnit.mobileSyncOperationId = op.id; remoteUnit.mobileSyncConflict = null;
        safeOps.push(op);
      }
      if (safeOps.length) {
        try { await window.KR2Sync.pushState(remote); }
        catch (error) {
          if (error?.code === 'KR2_SYNC_CONFLICT') {
            safeOps.forEach(op => { op.status = 'pending'; });
            for (const op of safeOps) await idbPutV5332(OFFLINE_OP_STORE_V5332, op);
            if (!options.retry) {
              syncRunningV5332 = false;
              return processOfflineQueueV5332({ ...options, retry: true });
            }
          }
          throw error;
        }
        const verified = await window.KR2Sync.pullState();
        const confirmed = safeOps.filter(op => { const { unit } = findUnitByOpV5332(verified, op); return unit && unit.mobileSyncOperationId === op.id && !fieldsDifferV5332(unit, op.fields); });
        await markOpsSyncedV5332(confirmed, new Date().toISOString());
        if (confirmed.length !== safeOps.length) throw new Error('Envio sem confirmação completa. As leituras continuam na fila para revisão.');
      }
      if (options.message) { const remaining = await pendingOpsV5332(); toast(`${safeOps.length} leitura(s) confirmada(s). ${remaining.length ? 'Há pendências ou conflitos para revisar.' : 'Fila concluída.'}`, Boolean(remaining.length)); }
    } catch (error) {
      const ops = await pendingOpsV5332().catch(() => []);
      for (const op of ops.filter(item => item.status === 'syncing')) { op.status = 'pending'; op.lastError = String(error?.message || error); await idbPutV5332(OFFLINE_OP_STORE_V5332, op); const { unit } = findUnitByOpV5332(state, op); if (unit) unit.mobileSyncStatus = 'pending'; }
      persistStateDirectV5332();
      if (options.message) toast(`Dados continuam seguros no celular. Sincronização pendente: ${error?.message || 'sem conexão'}`, true);
    } finally { syncRunningV5332 = false; render(); }
  }
  function syncStatusLabelV5332(unit) {
    const status = unit?.mobileSyncStatus || (unit?.mobileDone ? 'local' : 'idle');
    if (!unit?.mobileDone) return { cls: 'warn', text: 'Leitura pendente' };
    if (status === 'synced') return { cls: 'ok', text: unit.mobileTransferMethod === 'backup' ? '✓ Recebido no painel (BKP)' : '✓ Sincronizado' };
    if (status === 'conflict') return { cls: 'danger', text: '⚠ Conflito' };
    if (status === 'syncing') return { cls: 'warn', text: '↑ Sincronizando' };
    if (status === 'pending') return { cls: 'warn', text: '↑ Aguardando nuvem' };
    return { cls: 'ok', text: '● Salvo no aparelho' };
  }
  function offlineSummaryMarkupV5332(block) {
    const units = block?.units || [];
    const synced = units.filter(u => u.mobileDone && u.mobileSyncStatus === 'synced').length;
    const pending = units.filter(u => u.mobileDone && ['local','pending','syncing'].includes(u.mobileSyncStatus)).length;
    const conflicts = units.filter(u => u.mobileSyncStatus === 'conflict').length;
    const online = navigator.onLine;
    const cloud = Boolean(window.KR2Sync?.connected?.());
    return `<section class="card offline-first-v5332"><div class="offline-first-head"><div><strong>Proteção offline-first</strong><small>IndexedDB + diário local + fila de sincronização</small></div><span class="pill ${conflicts ? 'danger' : (online ? 'ok' : 'warn')}">${conflicts ? 'Conflito' : (online ? 'Online' : 'Sem internet')}</span></div><div class="offline-first-stats"><span><b>${synced}</b><small>Sincronizados</small></span><span><b>${pending}</b><small>Seguros no celular</small></span><span><b>${conflicts}</b><small>Conflitos</small></span></div><div class="row"><button class="secondary" id="syncQueueNowV5332" type="button" ${!cloud ? 'disabled' : ''}>↻ Sincronizar agora</button><small>${cloud ? 'Nuvem conectada' : 'Conecte o Supabase no painel para sincronizar entre celular e computador'}</small></div></section>`;
  }
  const renderV5332Base = render;
  render = function() {
    renderV5332Base();
    const block = currentBlock(), unit = currentUnit();
    const bridge = document.querySelector('.sync-bridge-mobile-v5331');
    if (bridge && block && !document.querySelector('.offline-first-v5332')) bridge.insertAdjacentHTML('afterend', offlineSummaryMarkupV5332(block));
    if (unit) {
      const status = syncStatusLabelV5332(unit);
      const savedLine = document.querySelector('.reading-card .saved-line');
      const overview = document.querySelector('.reading-card .unit-overview');
      if (overview && !overview.querySelector('.sync-status-v5332')) overview.insertAdjacentHTML('beforeend', `<span class="pill ${status.cls} sync-status-v5332">${status.text}</span>`);
      if (unit.mobileSyncStatus === 'conflict' && overview && !document.querySelector('.conflict-actions-v5332')) {
        overview.insertAdjacentHTML('afterend', `<div class="alert danger conflict-actions-v5332"><strong>Conflito protegido</strong><span>Há diferenças de leitura, cadastro ou competência. A leitura local foi preservada.</span><div class="row"><button class="secondary" id="useCloudV5332" type="button">Usar nuvem</button><button class="primary" id="keepPhoneV5332" type="button">Manter celular</button></div></div>`);
      }
      if (savedLine && unit.mobileSyncAt) savedLine.insertAdjacentHTML('beforeend', ` · nuvem ${esc(savedAtLabel(unit.mobileSyncAt))}`);
    }
    if (block && unit) bind();
  };
  const bindV5332Base = bind;
  bind = function() {
    bindV5332Base();
    const syncBtn = $('#syncQueueNowV5332'); if (syncBtn) syncBtn.onclick = () => processOfflineQueueV5332({ message: true });
    const keep = $('#keepPhoneV5332'); if (keep) keep.onclick = async () => {
      const unit = currentUnit(); const opId = unit?.mobileSyncOperationId; if (!opId) return;
      const ops = await idbGetAllV5332(OFFLINE_OP_STORE_V5332); const op = ops.find(item => item.id === opId); if (!op) return;
      if (!confirm('Manter a leitura deste celular e substituir a leitura conflitante na nuvem? A cópia da nuvem continuará registrada no histórico de conflito local.')) return;
      if (!op.remoteFields) return toast('Unidade ou competência ausente na nuvem. Exporte um BKP para revisão no painel.', true);
      op.forceLocal = true; op.status = 'pending'; await idbPutV5332(OFFLINE_OP_STORE_V5332, op); unit.mobileSyncStatus = 'pending'; persistStateDirectV5332(); processOfflineQueueV5332({ message: true });
    };
    const useCloud = $('#useCloudV5332'); if (useCloud) useCloud.onclick = async () => {
      const block = currentBlock(), unit = currentUnit(); const opId = unit?.mobileSyncOperationId; if (!block || !unit || !opId) return;
      const ops = await idbGetAllV5332(OFFLINE_OP_STORE_V5332); const op = ops.find(item => item.id === opId); if (!op?.remoteFields) return;
      if (op.remotePrevious !== undefined && Number(op.remotePrevious) !== Number(unit.previous)) return toast('A leitura anterior mudou. Revise o cadastro no painel antes de resolver este conflito.', true);
      if (!confirm('Usar a leitura da nuvem neste apartamento? A leitura do celular continuará preservada no diário offline.')) return;
      applyFieldsV5332(unit, op.remoteFields); unit.mobileSyncStatus = 'synced'; unit.mobileSyncAt = new Date().toISOString(); unit.mobileSyncConflict = null; op.status = 'resolved-cloud'; await idbPutV5332(OFFLINE_OP_STORE_V5332, op); persistStateDirectV5332(); render(); toast('Leitura da nuvem aplicada. A cópia local anterior foi preservada no diário.');
    };
  };

  async function protectSavedUnitV5332(blockId, unitId) {
    try {
      await requestPersistentStorageV5332();
      await queueUnitForCloudV5332(blockId, unitId);
      return true;
    } catch (error) {
      // O diário v5.3.31 e o localStorage continuam como duas camadas mesmo se IndexedDB falhar.
      console.error('Falha na camada IndexedDB', error);
      toast('Leitura salva, mas a camada extra IndexedDB falhou. Faça um BKP antes de continuar.', true);
      return false;
    }
  }
  const saveReadingV5332Base = saveReading;
  saveReading = async function() {
    const block = currentBlock(), unit = currentUnit(); if (!block || !unit) return;
    const blockId = block.id, unitId = unit.id, beforeAt = unit.mobileSavedAt;
    await saveReadingV5332Base();
    const savedBlock = state.blocks.find(item => String(item.id) === String(blockId));
    const savedUnit = savedBlock?.units?.find(item => String(item.id) === String(unitId));
    if (savedUnit?.mobileDone && savedUnit.mobileSavedAt && savedUnit.mobileSavedAt !== beforeAt) await protectSavedUnitV5332(blockId, unitId);
  };
  const createAverageReadingV5332Base = createAverageReading;
  createAverageReading = function() {
    const block = currentBlock(), unit = currentUnit(); if (!block || !unit) return;
    const blockId = block.id, unitId = unit.id, beforeAt = unit.mobileSavedAt;
    const result = createAverageReadingV5332Base();
    const savedUnit = state.blocks.find(item => String(item.id) === String(blockId))?.units?.find(item => String(item.id) === String(unitId));
    if (savedUnit?.mobileDone && savedUnit.mobileSavedAt && savedUnit.mobileSavedAt !== beforeAt) protectSavedUnitV5332(blockId, unitId);
    return result;
  };
  const markNoAccessV5332Base = markNoAccess;
  markNoAccess = function() {
    const block = currentBlock(), unit = currentUnit(); if (!block || !unit) return;
    const blockId = block.id, unitId = unit.id, beforeAt = unit.mobileSavedAt;
    const result = markNoAccessV5332Base();
    const savedUnit = state.blocks.find(item => String(item.id) === String(blockId))?.units?.find(item => String(item.id) === String(unitId));
    if (savedUnit?.mobileDone && savedUnit.mobileSavedAt && savedUnit.mobileSavedAt !== beforeAt) protectSavedUnitV5332(blockId, unitId);
    return result;
  };

  window.addEventListener('online', async () => { toast('Internet disponível. Atualizando cadastro e sincronização…'); if (window.KR2Sync?.connected?.()) await syncMobilePull(); await processOfflineQueueV5332(); });
  window.addEventListener('offline', () => { toast('Sem internet. As leituras continuarão salvas no celular.'); render(); });
  document.addEventListener('kr2sync:session', async () => { await syncMobilePull(); await processOfflineQueueV5332(); });
  document.addEventListener('kr2sync:push', () => render());
  async function ensureLocalQueueV5333() {
    const ops = await pendingOpsV5332();
    for (const block of state.blocks) for (const unit of block.units) {
      if (unit.mobileDone && unit.mobileSyncStatus !== 'synced' && !ops.some(op => String(op.blockId) === String(block.id) && String(op.month) === String(block.month) && String(op.unitId) === String(unit.id))) await queueUnitForCloudV5332(block.id, unit.id);
    }
  }
  async function restoreOfflineQueueV5333() {
    try {
      const ops = await pendingOpsV5332();
      for (const op of ops) {
        const { unit } = findUnitByOpV5332(state, op);
        if (unit && (Date.parse(op.at) || 0) >= (Date.parse(unit.mobileSavedAt) || 0)) {
          applyFieldsV5332(unit, op.fields);
          unit.mobileSyncOperationId = op.id; unit.mobileSyncStatus = op.status === 'conflict' ? 'conflict' : 'pending';
          unit.mobileSyncConflict = op.status === 'conflict' ? { opId: op.id, remoteFields: op.remoteFields } : null;
        }
      }
      persistStateDirectV5332();
      for (const block of state.blocks) for (const unit of block.units) {
        if (unit.mobileDone && unit.mobileSyncStatus !== 'synced' && !ops.some(op => String(op.blockId) === String(block.id) && String(op.month) === String(block.month) && String(op.unitId) === String(unit.id))) await queueUnitForCloudV5332(block.id, unit.id);
      }
      render(); await processOfflineQueueV5332();
    } catch (error) { toast('Não foi possível recuperar a fila offline. Preserve um BKP antes de continuar.', true); }
  }
  setTimeout(restoreOfflineQueueV5333, 900);

  async function bootstrapCloudMobile() {
    if (!window.KR2Sync?.connected?.() || readingDirty) return;
    if (state.blocks.length) { await syncMobilePull(); return; }
    try {
      const remote = await window.KR2Sync.pullState();
      if (remote && Array.isArray(remote.blocks) && remote.blocks.length) {
        state = remote;
        localStorage.setItem(KEY, JSON.stringify(state));
        initIndexes();
        render();
      }
    } catch {}
  }
  function decodeMobileCodeV539(code) {
    if(!String(code).trim().startsWith('KR2-CADASTRO-1:'))throw new Error('Código inválido. Copie o código completo gerado no painel.');
    const bytes=Uint8Array.from(atob(String(code).trim().slice('KR2-CADASTRO-1:'.length)),c=>c.charCodeAt(0));
    const json=new TextDecoder('utf-8',{fatal:true}).decode(bytes);backupStateFromJson(json);return json;
  }
  const renderV539Base = render;
  render = function() {
    renderV539Base();
    const app = $('#mobileApp'); if(!app) return;
    if(!app.querySelector('#mobileUpdateV539'))app.insertAdjacentHTML('afterbegin',`<section class="card" id="mobileUpdateV539"><details><summary><b>Atualizar cadastro / preparar próximo mês</b></summary><p>Receba o mês preparado no painel. Confira a competência no cabeçalho antes de sair.</p><button class="secondary" id="mobileCloudV539" ${window.KR2Sync?.connected?.()?'':'disabled'}>Atualizar pela nuvem</button><button class="secondary" id="mobileFileV539">Importar BKP do painel</button><label>Colar código do painel<textarea id="mobileCodeInputV539" rows="3" placeholder="KR2-CADASTRO-1:…"></textarea></label><button class="primary" id="mobileApplyCodeV539">Aplicar código</button></details></section>`);
    app.querySelector('#mobileCloudV539').onclick=()=>syncMobilePull();
    app.querySelector('#mobileFileV539').onclick=()=>uploadMobileBackup();
    app.querySelector('#mobileApplyCodeV539').onclick=async()=>{try{const json=decodeMobileCodeV539(app.querySelector('#mobileCodeInputV539').value);await importMobileBackup({target:{files:[{text:async()=>json}],value:''}});}catch(error){toast(error.message || 'Código inválido.',true);}};
  };

  recoverMobileJournalV5331();
  initIndexes(); render(); checkVersionNotice(); bootstrapCloudMobile();
  $('#mobileImportInput')?.addEventListener('change', importMobileBackup);
  $('#mobileCameraInput')?.addEventListener('change', event => {
    handlePhotoSelected(event.target.files?.[0]);
    event.target.value = '';
  });
  const backLink = $('#backSystemLink');
  if (backLink) {
    const session = sessionStorage.getItem('kr2melo.desktop.session') || localStorage.getItem('kr2melo.desktop.activeSession');
    if (session) backLink.href = `index.html?session=${encodeURIComponent(session)}`;
  }
  if (typeof window !== 'undefined') {
    window.__KR2_MOBILE__ = {
      load,
      save,
      render,
      checkAlert,
      saveReading,
      handlePhotoSelected,
      copyMobileReadingsCode,
      promptNegativeReadingModal,
      markOperationalStatus,
      MOBILE_READING_FIELDS_V5331,
      CLOUD_READING_FIELDS_V5332,
      getState: () => state,
      setState: s => { state = normalizeMobileState(s); }
    };
  }
  const isDesktopSession = Boolean(window.KR2DesktopSession || sessionStorage.getItem('kr2melo.desktop.session') || localStorage.getItem('kr2melo.desktop.activeSession'));
  if (!isDesktopSession && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
