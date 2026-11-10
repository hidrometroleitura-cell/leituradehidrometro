(() => {
  'use strict';

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const n = val => Number(val) || 0;
  const esc = (val = '') => { const d = document.createElement('div'); d.textContent = String(val ?? ''); return d.innerHTML; };
  const fmt = val => n(val).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  const money = val => n(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const monthLabel = m => {
    try { return monthFmt.format(new Date(`${m}-02T12:00:00`)); }
    catch { return m || ''; }
  };

  let currentData = null;
  let searchTerm = '';
  let statusFilter = 'todos';
  let selectedMonth = '';

  function toast(msg, error = false) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast show${error ? ' error' : ''}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.className = 'toast'; }, 2400);
  }

  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      blockId: params.get('b') || params.get('blockId') || '',
      token: params.get('t') || params.get('token') || '',
      code: params.get('c') || params.get('code') || ''
    };
  }

  async function loadData() {
    const { blockId, token, code } = getUrlParams();

    if (!blockId && !token && !code) {
      return { isLanding: true };
    }

    // 1. Decodificação por código direto no link (Link autônomo offline)
    if (code) {
      try {
        const clean = code.startsWith('KR2-SINDICO-1:') ? code.slice('KR2-SINDICO-1:'.length) : code;
        const bytes = Uint8Array.from(atob(clean), c => c.charCodeAt(0));
        const json = new TextDecoder('utf-8').decode(bytes);
        return JSON.parse(json);
      } catch (e) {
        console.warn('Falha ao decodificar código do link', e);
      }
    }

    // 2. Busca na nuvem Supabase
    if (blockId && token) {
      if (window.KR2Sync?.configured?.()) {
        try {
          const remote = await window.KR2Sync.fetchSindicoView(blockId, token);
          if (remote) return remote;
        } catch (e) {
          console.warn('Falha na consulta Supabase:', e);
        }
      }

      // 3. Fallback no armazenamento local (mesmo navegador ou ambiente de teste)
      try {
        const local = JSON.parse(localStorage.getItem('kr2melo.hidrometro.v1'));
        const found = local?.blocks?.find(b => String(b.id) === String(blockId) && (!b.sindicoToken || String(b.sindicoToken) === String(token)));
        if (found) {
          return {
            block_id: found.id,
            token: found.sindicoToken || token,
            condo_name: found.name,
            month: found.month,
            manager: found.manager || '',
            address: found.address || '',
            tariff: found.tariff,
            billing: found.billing,
            units: found.units || [],
            history: found.history || [],
            updated_at: new Date().toISOString()
          };
        }
      } catch {}
    }

    return null;
  }

  function issueForUnit(u) {
    const prev = n(u.previous), curr = n(u.current);
    if (u.current === '' || u.current === null || u.current === undefined) return null;
    const diff = curr - prev;
    if (curr < prev && u.operationalStatus !== 'trocado') return { type: 'danger', text: 'Leitura menor que anterior' };
    if (diff > 30) return { type: 'danger', text: 'Consumo elevado (>30 m³)' };
    if (diff > 20) return { type: 'warn', text: 'Atenção (>20 m³)' };
    if (diff > 15) return { type: 'warn', text: 'Consumo acima de 15 m³' };
    if (u.operationalStatus === 'parado') return { type: 'neutral', text: 'Hidrômetro parado' };
    if (u.operationalStatus === 'trocado') return { type: 'ok', text: 'Hidrômetro trocado' };
    if (u.operationalStatus === 'sem_acesso') return { type: 'danger', text: 'Sem acesso' };
    return null;
  }

  function render(data) {
    const app = $('#consultaApp');
    if (data?.isLanding) {
      app.innerHTML = `
        <div class="card" style="text-align:center;padding:48px 20px">
          <img src="assets/logo.png" alt="KR²MELO" style="width:58px;height:68px;margin-bottom:12px;object-fit:contain">
          <h2>Portal do Síndico · KR²MELO</h2>
          <p class="muted">Conferência e Transparência de Consumo de Água</p>
          <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:12px;padding:20px;max-width:540px;margin:24px auto;text-align:left">
            <h4 style="margin:0 0 8px;color:#0f172a;font-size:1.05rem">ℹ️ Como visualizar as medições do seu condomínio:</h4>
            <p style="margin:0;font-size:0.95rem;color:#334155;line-height:1.5">
              Este é o endereço principal do portal online. Para acessar os consumos, valores e fotos dos hidrômetros do seu prédio, utilize o <b>link exclusivo</b> gerado pelo administrador no painel KR²MELO ou enviado pelo WhatsApp.<br><br>
              <small class="muted">Cada condomínio possui um link de acesso seguro (ex: <code>https://portaldosindico.netlify.app/?b=...&t=...</code>).</small>
            </p>
          </div>
        </div>
      `;
      return;
    }
    if (!data || !Array.isArray(data.units)) {
      app.innerHTML = `
        <div class="card" style="text-align:center;padding:48px 20px">
          <h2 style="color:var(--danger)">Link de Consulta Inválido</h2>
          <p class="muted">Não foi possível carregar as informações deste condomínio.</p>
          <p>Verifique o link enviado pelo administrador ou solicite um novo acesso via WhatsApp.</p>
        </div>
      `;
      return;
    }

    currentData = data;
    if (!selectedMonth) selectedMonth = data.month;
    const isCurrent = (selectedMonth === data.month);
    const historyEntry = (data.history || []).find(h => h.month === selectedMonth);
    const units = isCurrent ? data.units : (historyEntry?.units || data.units);
    const displayMonth = isCurrent ? data.month : (historyEntry?.month || data.month);

    const subtitle = $('#cSubtitle');
    if (subtitle) subtitle.textContent = `${data.condo_name} · ${monthLabel(displayMonth)}${isCurrent ? '' : ' (Histórico Fechado)'}`;

    // Cálculos dos KPIs
    const totalM3 = units.reduce((s, u) => s + (n(u.m3) || 0), 0);
    const totalWater = units.reduce((s, u) => s + (n(u.water ?? u.value) || 0), 0);
    const totalCondo = units.reduce((s, u) => s + (n(u.condoFee) || 0), 0);
    const totalFines = units.reduce((s, u) => s + (n(u.billingFine) + n(u.extraCharge) || 0), 0);
    const totalBoleto = units.reduce((s, u) => s + (u.total !== undefined && u.total !== null ? n(u.total) : Math.max(0, n(u.water ?? u.value) + n(u.condoFee) + n(u.billingFine) + n(u.extraCharge) - n(u.discount))), 0);
    const completedUnits = units.filter(u => (u.current !== '' && u.current !== null && u.current !== undefined) || u.mobileDone).length;
    const alertUnits = units.filter(u => Boolean(issueForUnit(u) && issueForUnit(u).type !== 'ok')).length;

    // Filtros
    const q = searchTerm.trim().toLowerCase();
    const filtered = units.filter(u => {
      const matchSearch = !q || String(u.number).toLowerCase().includes(q) || String(u.resident || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
      const issue = issueForUnit(u);
      if (statusFilter === 'alertas') return issue && issue.type !== 'ok';
      if (statusFilter === 'com_foto') return Boolean(u.photo);
      if (statusFilter === 'parado') return u.operationalStatus === 'parado' || u.operationalStatus === 'trocado';
      if (statusFilter === 'sem_acesso') return u.operationalStatus === 'sem_acesso';
      return true;
    });

    app.innerHTML = `
      <section class="card hero-condo">
        <div class="hero-main">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <h1>${esc(data.condo_name)}</h1>
            <span class="hero-badge ${isCurrent ? '' : 'history-badge'}">${isCurrent ? 'Mês Vigente' : 'Histórico Fechado'}</span>
          </div>
          <div class="month-selector-bar">
            <label for="selectMonth"><strong>Competência:</strong></label>
            <select id="selectMonth" class="month-select">
              <option value="${esc(data.month)}" ${isCurrent ? 'selected' : ''}>
                📅 ${esc(monthLabel(data.month))} · Mês Atual (Em Aberto)
              </option>
              ${(data.history || []).map(h => `
                <option value="${esc(h.month)}" ${selectedMonth === h.month ? 'selected' : ''}>
                  📜 ${esc(monthLabel(h.month))} · Histórico Fechado
                </option>
              `).join('')}
            </select>
          </div>
          <p><strong>Síndico:</strong> ${esc(data.manager || 'Não informado')}</p>
          ${data.address ? `<p class="muted-info">📍 ${esc(data.address)}</p>` : ''}
          <p class="muted-info">🔒 Visualização de conferência e transparência · Somente leitura</p>
        </div>
      </section>

      <section class="kpi-grid">
        <div class="kpi-card highlight">
          <small>Consumo Global</small>
          <strong>${fmt(totalM3)} m³</strong>
        </div>
        <div class="kpi-card">
          <small>Total Água</small>
          <strong>${money(totalWater)}</strong>
        </div>
        <div class="kpi-card">
          <small>Total Condomínio</small>
          <strong>${money(totalCondo)}</strong>
        </div>
        <div class="kpi-card" style="border-color:#ff1100">
          <small>Total Geral Boletos</small>
          <strong style="color:var(--red)">${money(totalBoleto)}</strong>
        </div>
        <div class="kpi-card">
          <small>Medições Concluídas</small>
          <strong>${completedUnits}/${units.length}</strong>
        </div>
        <div class="kpi-card ${alertUnits ? 'highlight' : ''}">
          <small>Atenção / Alertas</small>
          <strong style="${alertUnits ? 'color:var(--danger)' : ''}">${alertUnits}</strong>
        </div>
      </section>

      <section class="card filter-bar">
        <div class="search-wrap">
          <input id="searchApt" placeholder="Buscar apartamento ou morador..." value="${esc(searchTerm)}">
          ${searchTerm ? '<button type="button" class="btn-clear" id="clearSearch">✕</button>' : ''}
        </div>
        <select class="filter-select" id="filterStatus">
          <option value="todos" ${statusFilter === 'todos' ? 'selected' : ''}>Todos (${units.length})</option>
          <option value="alertas" ${statusFilter === 'alertas' ? 'selected' : ''}>Atenção / Alertas (${alertUnits})</option>
          <option value="com_foto" ${statusFilter === 'com_foto' ? 'selected' : ''}>Com Foto do Hidrômetro</option>
          <option value="parado" ${statusFilter === 'parado' ? 'selected' : ''}>Parados / Trocados</option>
          <option value="sem_acesso" ${statusFilter === 'sem_acesso' ? 'selected' : ''}>Sem Acesso</option>
        </select>
      </section>

      <section class="card" style="padding:0;overflow:hidden">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="min-width:140px;text-align:left">Apto / Morador</th>
                <th style="width:70px;text-align:right">Anterior</th>
                <th style="width:70px;text-align:right">Atual</th>
                <th style="width:75px;text-align:right">Consumo</th>
                <th style="width:85px;text-align:center">Status</th>
                <th style="width:90px;text-align:right">Água</th>
                <th style="width:90px;text-align:right">Condomínio</th>
                <th style="width:85px;text-align:right">Multas</th>
                <th style="width:105px;text-align:right">Total Boleto</th>
                <th style="width:85px;text-align:center">Comprovante</th>
                <th style="min-width:90px;text-align:left">Observação</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length ? filtered.map(u => {
                const issue = issueForUnit(u);
                const badgeHtml = issue
                  ? `<span class="badge ${issue.type}">${esc(issue.text)}</span>`
                  : `<span class="badge ok">Normal</span>`;
                const waterVal = n(u.water ?? u.value);
                const condoVal = n(u.condoFee);
                const finesVal = n(u.billingFine) + n(u.extraCharge);
                const totalVal = u.total !== undefined && u.total !== null ? n(u.total) : Math.max(0, waterVal + condoVal + finesVal - n(u.discount));
                return `
                  <tr>
                    <td>
                      <div class="apt-num">${esc(u.number)}</div>
                      <div class="resident-name" title="${esc(u.resident || '—')}">${esc(u.resident || '—')}</div>
                    </td>
                    <td style="text-align:right">${u.previous !== '' && u.previous !== null && u.previous !== undefined ? fmt(u.previous) : '—'}</td>
                    <td style="text-align:right"><strong>${u.current !== '' && u.current !== null && u.current !== undefined ? fmt(u.current) : '—'}</strong></td>
                    <td style="text-align:right"><span class="m3-val">${fmt(u.m3 || 0)} m³</span></td>
                    <td style="text-align:center">${badgeHtml}</td>
                    <td class="money-val">${money(waterVal)}</td>
                    <td class="money-val">${money(condoVal)}</td>
                    <td class="money-val">${finesVal > 0 ? money(finesVal) : '—'}</td>
                    <td class="money-val total-cell"><strong>${money(totalVal)}</strong></td>
                    <td style="text-align:center">
                      ${u.photo ? `
                        <button type="button" class="photo-btn-view" data-view-photo="${esc(u.photo)}" data-apt="${esc(u.number)}">
                          📷 Foto
                        </button>
                      ` : '<span class="muted" style="font-size:0.75rem">—</span>'}
                    </td>
                    <td><small class="muted obs-text" title="${esc(u.note || '')}">${esc(u.note || '—')}</small></td>
                  </tr>
                `;
              }).join('') : `
                <tr><td colspan="11" style="text-align:center;padding:32px 14px" class="muted">Nenhum apartamento encontrado com o filtro selecionado.</td></tr>
              `}
            </tbody>
            <tfoot>
              <tr style="background:#f1f4f8;font-weight:900">
                <td colspan="3">TOTAIS GERAIS DO MÊS</td>
                <td style="text-align:right">${fmt(totalM3)} m³</td>
                <td></td>
                <td style="text-align:right" class="money-val">${money(totalWater)}</td>
                <td style="text-align:right" class="money-val">${money(totalCondo)}</td>
                <td style="text-align:right" class="money-val">${money(totalFines)}</td>
                <td style="text-align:right" class="money-val total-cell">${money(totalBoleto)}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const monthSelect = $('#selectMonth');
    if (monthSelect) monthSelect.onchange = e => { selectedMonth = e.target.value; render(currentData); };
    const search = $('#searchApt');
    if (search) search.oninput = e => { searchTerm = e.target.value; render(currentData); };
    const clear = $('#clearSearch');
    if (clear) clear.onclick = () => { searchTerm = ''; render(currentData); };
    const filter = $('#filterStatus');
    if (filter) filter.onchange = e => { statusFilter = e.target.value; render(currentData); };

    document.querySelectorAll('[data-view-photo]').forEach(btn => {
      btn.onclick = () => {
        const src = btn.dataset.viewPhoto;
        const apt = btn.dataset.apt;
        openPhotoModal(src, `Apartamento ${apt}`);
      };
    });
  }

  function openPhotoModal(src, title) {
    const modal = $('#photoModal');
    const img = $('#photoModalImg');
    const cap = $('#photoModalCaption');
    const tit = $('#photoModalTitle');
    if (!modal || !img) return;
    img.src = src;
    if (tit) tit.textContent = title || 'Foto do Hidrômetro';
    if (cap) cap.textContent = 'Comprovante fotográfico registrado no momento da leitura.';
    modal.hidden = false;
  }

  function closePhotoModal() {
    const modal = $('#photoModal');
    if (modal) modal.hidden = true;
  }

  // Inicialização
  document.addEventListener('DOMContentLoaded', async () => {
    $('#printReportBtn')?.addEventListener('click', () => window.print());
    $('#closePhotoModal')?.addEventListener('click', closePhotoModal);
    $('#photoModal')?.addEventListener('click', e => { if (e.target.id === 'photoModal') closePhotoModal(); });

    const data = await loadData();
    render(data);
  });

  if (typeof window !== 'undefined') {
    window.__KR2_CONSULTA__ = {
      loadData,
      render,
      issueForUnit,
      openPhotoModal,
      closePhotoModal,
      setSelectedMonth: m => { selectedMonth = m; render(currentData); },
      getSelectedMonth: () => selectedMonth,
      getData: () => currentData
    };
  }
})();
