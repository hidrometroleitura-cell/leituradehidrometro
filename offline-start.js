(async function() {
  'use strict';
  const key = 'kr2melo.hidrometro.v1', activeKey = 'kr2melo.desktop.activeSession';
  const param = new URL(location.href).searchParams.get('session');
  const APP_VERSION = '5.3.47', APP_UPDATED_AT = '10/11/2026';
  let token = param || crypto.randomUUID();
  const shell = document.querySelector('.app-shell');
  shell.hidden = true;
  const panel = document.createElement('main');
  panel.style.cssText = 'max-width:680px;margin:60px auto;padding:24px';
  panel.innerHTML = `<article class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;background:#181818;color:#fff;border:1px solid #333;padding:10px 16px;border-radius:8px;margin-bottom:18px;font-size:13px">
      <span><strong style="color:#ff1100">KR²MELO</strong> · Versão em execução: <b style="color:#00e5ff">v${APP_VERSION}</b></span>
      <span style="color:#aaa">Última atualização: <b style="color:#fff">${APP_UPDATED_AT}</b></span>
    </div>
    <h1>Iniciar por BKP</h1>
    <p id="startupStatus" role="status">Preparando uma sessão limpa…</p>
    <p>Selecione o BKP completo do painel. Antes de encerrar o trabalho, baixe um novo BKP: ele será necessário na próxima abertura do executável.</p>
    <input id="startupFile" type="file" accept=".json,application/json" disabled>
    <pre id="startupPreview" style="white-space:pre-wrap"></pre>
    <button id="startupContinue" class="primary" disabled>Conferi o arquivo · Iniciar</button>
  </article>`;
  document.body.append(panel);
  const status = panel.querySelector('#startupStatus'), input = panel.querySelector('input'), button = panel.querySelector('button');
  const assertCurrent = () => { if (localStorage.getItem(activeKey) !== token) throw new Error('Outra sessão foi aberta. Use a janela mais recente.'); };
  window.KR2DesktopSession = { assertCurrent };
  function lock() { shell.hidden = true; document.body.append(panel); panel.hidden = false; input.disabled = true; button.disabled = true; status.textContent = 'Esta sessão foi encerrada por uma nova abertura do executável. Use a janela mais recente.'; }
  window.addEventListener('storage', event => { if (event.key === activeKey && event.newValue !== token) lock(); });
  async function loadApp() {
    assertCurrent();
    const write = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(k, v) { if (this === localStorage && String(k).startsWith('kr2melo.')) assertCurrent(); return write.call(this, k, v); };
    Storage.prototype.removeItem = function(k) { if (this === localStorage && String(k).startsWith('kr2melo.')) assertCurrent(); return remove.call(this, k); };
    for (const src of ['sync.js','financial.js','auditor.js','history-bills.js','dashboard.js','reading-average.js','app.js']) {
      await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = () => reject(new Error('Não foi possível carregar ' + src + '. Confira se o ZIP foi extraído por completo.')); document.body.append(script); });
    }
    assertCurrent(); panel.remove(); shell.hidden = false;
    document.querySelector('.sidebar-foot').textContent = `v${APP_VERSION} (${APP_UPDATED_AT}) · Sessão por BKP`;
  }
  try {
    if (!param && localStorage.getItem(activeKey)) {
      token = localStorage.getItem(activeKey);
      sessionStorage.setItem('kr2melo.desktop.session', token);
      if (localStorage.getItem(key)) {
        sessionStorage.setItem('kr2melo.desktop.resetComplete', token);
        sessionStorage.setItem('kr2melo.desktop.ready', token);
      }
    } else if (!param) {
      token = sessionStorage.getItem('kr2melo.desktop.session') || token;
    }
    if (sessionStorage.getItem('kr2melo.desktop.session') === token && localStorage.getItem(activeKey) !== token) { lock(); return; }
    const sameSession = sessionStorage.getItem('kr2melo.desktop.session') === token && localStorage.getItem(activeKey) === token;
    if (!sameSession) {
      localStorage.setItem(activeKey, token);
      // Apenas dados do painel; fila e fotos do leiturista são preservadas.
      for (const k of Object.keys(localStorage)) if ((k.startsWith(key) || k === 'kr2melo.sync.supabase.v1') && k !== activeKey) localStorage.removeItem(k);
      for (const k of Object.keys(sessionStorage)) if (k.startsWith('kr2melo.')) sessionStorage.removeItem(k);
      sessionStorage.setItem('kr2melo.desktop.session', token);
      if ('serviceWorker' in navigator) {
        const scope = new URL('./', location.href).href;
        for (const reg of await navigator.serviceWorker.getRegistrations()) if (reg.scope === scope) await reg.unregister();
      }
      if ('caches' in window) for (const name of await caches.keys()) if (name.startsWith('kr2melo-')) await caches.delete(name);
      if ('indexedDB' in window) await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase('kr2melo-adjustment-recovery-v1');
        req.onsuccess = resolve; req.onerror = () => reject(new Error('Não foi possível limpar a recuperação de ajustes.'));
        req.onblocked = () => reject(new Error('Feche outras abas do painel e recarregue para concluir a limpeza.'));
      });
      sessionStorage.setItem('kr2melo.desktop.resetComplete', token);
    }
    if (sessionStorage.getItem('kr2melo.desktop.resetComplete') !== token) throw new Error('Limpeza incompleta. Feche outras abas e abra novamente o executável.');
    if (sessionStorage.getItem('kr2melo.desktop.ready') === token && localStorage.getItem(key)) { await loadApp(); return; }
    status.textContent = 'Sessão limpa. Faça o upload do BKP para continuar.'; input.disabled = false;
    let incoming, selection = 0;
    input.onchange = async () => {
      const currentSelection = ++selection;
      incoming = null; button.disabled = true; panel.querySelector('pre').textContent = '';
      const file = input.files?.[0]; if (!file) return;
      try {
        assertCurrent();
        const parsed = JSON.parse(await file.text());
        if (currentSelection !== selection) return;
        incoming = window.KR2Backup.validate(parsed);
        assertCurrent();
        panel.querySelector('pre').textContent = `Arquivo: ${file.name}\nExportado: ${parsed.exportedAt || 'data não informada'}\n` + incoming.blocks.map(b => `${b.name || 'Sem nome'} · ${b.month} · ${b.units.length} unidades`).join('\n');
        status.textContent = 'Confira o arquivo e as competências antes de iniciar.'; button.disabled = false;
      } catch (error) { if (currentSelection === selection) { incoming = null; status.textContent = error.message; } }
    };
    button.onclick = async () => {
      button.disabled = true; input.disabled = true;
      try {
        assertCurrent();
        if (!incoming) throw new Error('Selecione um BKP válido.');
        const json = JSON.stringify(incoming); localStorage.setItem(key, json);
        if (localStorage.getItem(key) !== json) throw new Error('O navegador não confirmou a gravação do BKP.');
        sessionStorage.setItem('kr2melo.desktop.ready', token);
        await loadApp();
      } catch (error) { status.textContent = error.message; input.disabled = false; button.disabled = !incoming; }
    };
  } catch (error) { status.textContent = 'Inicialização bloqueada: ' + error.message; }
})();
