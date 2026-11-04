/* Gestor Comercial Panamby — camada multiusuário Supabase.
   Compativel com o formato de dados do app.js V36.
   Credenciais secretas NUNCA devem estar aqui. */
(function () {
  'use strict';
  const FIELDS = ['clientes', 'vendas', 'followups', 'apuracaoLinhas', 'apuracaoMetas', 'pipelineStages'];
  const cfg = window.PANAMBY_SUPABASE || {};
  const EMPTY = () => Object.fromEntries(FIELDS.map(key => [key, []]));
  const copy = data => JSON.parse(JSON.stringify(data));
  let client, activeUser = null, activeRole = null, currentRecords = new Map(), hooks = null;
  let tail = Promise.resolve(), activeWrites = 0, scheduledRefresh = false;
  let blocked = false, refreshTimer = null, channel = null, bar = null;
  let remoteEventExpected = false, started = false, importing = false, writeVersion = 0;

  const ROLE_LABELS = { administrador: 'Administrador', gerente: 'Gerente Comercial', vendedor: 'Vendedor' };
  const recoveryHelp = () => activeRole === 'administrador' ? 'Faça backup antes de atualizar.' : 'Não atualize nem limpe os dados locais; contate o administrador.';
  const roleLabel = role => ROLE_LABELS[role] || 'Sem cargo';
  const keyFor = (kind, id) => kind + '\u001f' + String(id);
  function rowId(kind, item, index) {
    // Identificadores de clientes, pedidos e follow-ups permanecem os do app original.
    if (kind === 'pipelineStages') return String(item.clienteId || item.id || `linha-${index}`);
    if (kind === 'apuracaoMetas') {
      return String(item.id || `META:${String(item.representante || item.razaoSocial || `linha-${index}`).trim().toUpperCase()}`);
    }
    if (kind === 'apuracaoLinhas') {
      // Há planilhas com mais de uma linha por representante: index preserva cada uma.
      return String(item.id || `APURACAO:${String(index).padStart(8, '0')}`);
    }
    return String(item.id || item.codigo || item.documento || `linha-${String(index).padStart(8, '0')}`);
  }
  function normalize(data) {
    const result = EMPTY();
    for (const field of FIELDS) result[field] = Array.isArray(data?.[field]) ? data[field] : [];
    return result;
  }
  function flatten(data) {
    const map = new Map();
    for (const kind of FIELDS) {
      normalize(data)[kind].forEach((item, index) => {
        const id = rowId(kind, item, index);
        const k = keyFor(kind, id);
        if (map.has(k)) throw new Error(`Identificador repetido em ${kind}: ${id}`);
        map.set(k, { kind, id, data: item });
      });
    }
    return map;
  }
  function hasAny(data) { return FIELDS.some(f => (data?.[f] || []).length); }

  // Proteção contra Ctrl+Shift+R durante uma gravação.
  // As alterações ainda não confirmadas no Supabase são guardadas ANTES de
  // iniciar a requisição, em armazenamento local separado por projeto/conta.
  // Cada mudança contém o número de versão da linha, evitando sobrescrever
  // silenciosamente alterações de outras pessoas ao recuperar o rascunho.
  const OUTBOX_SCHEMA = 1;
  function outboxKey() {
    if (!activeUser?.id) throw new Error('Entre na sua conta para salvar.');
    return 'panamby-pendente-v1:' + String(cfg.url || '').toLowerCase() + ':' + activeUser.id;
  }
  function storePending(changes, adminOnly = false) {
    const key = outboxKey();
    try {
      if (changes.length) {
        localStorage.setItem(key, JSON.stringify({ schema: OUTBOX_SCHEMA, savedAt: new Date().toISOString(), changes, adminOnly }));
      } else {
        localStorage.removeItem(key);
      }
    } catch (err) {
      throw new Error('O navegador não conseguiu guardar uma cópia de segurança da alteração (' +
        (err.message || err) + '). Exporte um backup antes de atualizar a página.');
    }
  }
  function readPendingInfo() {
    let content;
    try { content = localStorage.getItem(outboxKey()); }
    catch (err) { throw new Error('Não foi possível acessar as alterações pendentes no navegador: ' + err.message); }
    if (!content) return { changes: [], adminOnly: false };
    let saved;
    try { saved = JSON.parse(content); } catch (_) {
      throw new Error('Há uma cópia de alterações pendentes danificada no navegador. Não limpe o armazenamento; salve um backup antes de continuar.');
    }
    if (saved.schema !== OUTBOX_SCHEMA || !Array.isArray(saved.changes)) {
      throw new Error('Há uma cópia de alterações pendentes em formato desconhecido. Não apague os dados do navegador.');
    }
    return { changes: saved.changes, adminOnly: saved.adminOnly === true };
  }
  function readPending() { return readPendingInfo().changes; }
  function dataEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function recoverPending(cloudState) {
    const pending = readPendingInfo();
    const saved = pending.changes;
    if (!saved.length) return { state: cloudState, replay: false };
    const merged = flatten(cloudState), unresolved = [];
    let conflicts = 0;
    for (const change of saved) {
      if (!FIELDS.includes(change.kind) || !['insert', 'update', 'delete'].includes(change.op)) {
        blocked = true;
        throw new Error('Foi encontrado um registro pendente inválido. Não apague os dados locais.');
      }
      const key = keyFor(change.kind, change.id), remote = currentRecords.get(key);
      // O servidor pode ter gravado a alteração, mas o navegador foi
      // recarregado antes de receber a confirmação. Nessa situação, não duplicar.
      if ((change.op === 'delete' && !remote) ||
          (change.op !== 'delete' && remote && dataEqual(change.data, remote.data))) continue;
      const sameVersion = change.op === 'insert' ? !remote :
        !!remote && remote.version === change.version;
      if (!sameVersion) conflicts++;
      unresolved.push(change);
      if (change.op === 'delete') merged.delete(key);
      else merged.set(key, { kind: change.kind, id: String(change.id), data: copy(change.data) });
    }
    // Remover apenas alterações comprovadamente já salvas no servidor.
    storePending(unresolved, pending.adminOnly);
    if (!unresolved.length) { renderNotice('Salvo no Supabase • dados recuperados'); return { state: cloudState, replay: false }; }
    const restored = EMPTY();
    for (const record of merged.values()) restored[record.kind].push(record.data);
    if (conflicts) {
      blocked = true; scheduledRefresh = true; refreshButton(true);
      renderNotice('Conflito: há alterações recuperadas neste navegador. Faça backup.', true);
      alert('Recuperamos alterações locais após a atualização da página, mas ' + conflicts +
        ' registro(s) foram modificados por outra pessoa. Seus dados locais aparecem na tela, ' +
        'porém não serão enviados por cima dos dados da equipe. ' +
        (activeRole === 'administrador' ? 'Exporte um backup antes de resolver o conflito.' : 'Procure o administrador para resolver o conflito sem apagar dados locais.'));
      return { state: restored, replay: false };
    }
    renderNotice('Alterações locais recuperadas • enviando ao Supabase...');
    return { state: restored, replay: true, adminOnly: pending.adminOnly };
  }
  function renderNotice(message, warning = false) {
    if (!bar) return;
    const status = bar.querySelector('#crm-cloud-status');
    if (status) { status.textContent = message; status.style.color = warning ? '#ffb7a6' : '#c8eadb'; }
  }
  function showGate(errorText = '') {
    return new Promise((resolve, reject) => {
      let gate = document.querySelector('#crm-auth-gate');
      if (!gate) {
        gate = document.createElement('div');
        gate.id = 'crm-auth-gate';
        document.body.appendChild(gate);
      }
      gate.innerHTML = `<div class="crm-login">
        <div class="crm-mark">📈</div><h2>Gestor Comercial Panamby</h2>
        <p>Acesso compartilhado: entre com sua conta autorizada.</p>
        <form id="crm-signin-form">
          <label>E-mail<input type="email" id="crm-email" autocomplete="username" required placeholder="seuemail@empresa.com"></label>
          <label>Senha<input type="password" id="crm-password" autocomplete="current-password" required minlength="6" placeholder="Sua senha"></label>
          <button type="submit" id="crm-signin">Entrar no sistema</button>
          <div id="crm-signin-error" role="alert"></div>
        </form>
        <small>Solicite a criação de sua conta ao responsável pelo sistema.</small>
      </div>`;
      const err = gate.querySelector('#crm-signin-error');
      err.textContent = errorText;
      gate.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        const button = gate.querySelector('#crm-signin');
        button.disabled = true; button.textContent = 'Entrando...'; err.textContent = '';
        try {
          const email = gate.querySelector('#crm-email').value.trim();
          const password = gate.querySelector('#crm-password').value;
          const { data, error } = await client.auth.signInWithPassword({ email, password });
          if (error) throw error;
          const user = data?.user;
          if (!(await isAuthorized(user))) {
            await client.auth.signOut();
            throw new Error('Conta ainda não autorizada. Peça ao administrador para adicionar seu usuário.');
          }
          activeUser = user;
          gate.remove();
          resolve(user);
        } catch (e) {
          err.textContent = e.message || 'Não foi possível entrar.';
          button.disabled = false; button.textContent = 'Entrar no sistema';
        }
      });
    });
  }
  async function isAuthorized(user) {
    if (!user?.id) return false;
    const { data, error } = await client.from('crm_members')
      .select('user_id,role').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!data || !ROLE_LABELS[data.role]) return false;
    activeRole = data.role;
    return true;
  }
  function updateRoleUI() {
    const label = bar?.querySelector('#crm-cloud-role');
    if (label) label.textContent = roleLabel(activeRole);
    const manage = bar?.querySelector('#crm-manage-members');
    if (manage) manage.hidden = activeRole !== 'administrador';
    document.body.dataset.crmRole = activeRole || '';
    const admin = activeRole === 'administrador';
    // Não é somente ocultar o botão: a seção também fica indisponível.
    document.querySelectorAll('[data-admin-only]').forEach(el => {
      el.hidden = !admin;
      el.setAttribute('aria-hidden', String(!admin));
    });
    if (!admin) {
      document.querySelector('#crm-members-modal')?.remove();
      // Se houve mudança de cargo, abandona a aba reservada.
      const adminTab = document.querySelector('#excel');
      if (adminTab?.classList.contains('active')) {
        document.querySelector('[data-tab="dashboard"]')?.click();
      }
    }
  }
  async function refreshMyRole() {
    if (!activeUser) return;
    const stillAuthorized = await isAuthorized(activeUser);
    if (!stillAuthorized) {
      blocked = true;
      renderNotice('Acesso revogado.', true);
      if (localIsDirty() || activeWrites || importing) {
        alert('Seu acesso foi revogado e existem alterações locais não sincronizadas. Faça um backup antes de fechar esta aba.');
        return;
      }
      await client.auth.signOut();
      location.reload();
      return;
    }
    updateRoleUI();
  }
  async function ensureAuthorized() {
    if (!client) throw new Error('A biblioteca Supabase não carregou. Verifique a conexão com a internet.');
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (session?.user) {
      try {
        if (await isAuthorized(session.user)) { activeUser = session.user; return activeUser; }
      } catch (e) { console.warn('Falha na verificação de autorização:', e); }
      await client.auth.signOut();
    }
    return showGate();
  }
  async function fetchAll(commit = true) {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client.from('crm_records')
        .select('kind,record_id,data,version').order('kind').order('record_id').range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) break;
    }
    const next = new Map(), state = EMPTY();
    for (const row of rows) {
      if (!FIELDS.includes(row.kind)) continue;
      next.set(keyFor(row.kind, row.record_id), { kind: row.kind, id: row.record_id, data: copy(row.data), version: row.version });
      state[row.kind].push(row.data);
    }
    if (commit) currentRecords = next;
    return commit ? state : { state, next };
  }
  function isModalOpen() { return !!document.querySelector('.modal.open'); }
  function localIsDirty() {
    if (!hooks?.getCurrent) return false;
    try { return buildDiff(hooks.getCurrent()).length > 0; } catch (_) { return true; }
  }
  function refreshButton(show) {
    const el = bar?.querySelector('#crm-refresh-btn');
    if (el) { el.style.display = 'inline-flex'; el.textContent = show ? 'Atualizar alterações' : 'Atualizar'; }
  }
  async function refreshFromCloud(force = false) {
    if (!activeUser || !started) return;
    // Mesmo uma atualização forçada não pode descartar uma gravação em andamento.
    if (activeWrites || importing) {
      scheduledRefresh = true;
      refreshButton(true);
      renderNotice('Gravação em andamento. Atualize depois que terminar.', true);
      return;
    }
    if (!force && (blocked || isModalOpen() || localIsDirty())) {
      scheduledRefresh = true;
      refreshButton(true);
      renderNotice('Há atualizações no servidor. Clique em Atualizar.', true);
      return;
    }
    try {
      renderNotice('Sincronizando...');
      const startedAtWrite = writeVersion;
      const { state: fresh, next } = await fetchAll(false);
      // Nunca sobrescrever uma mudança feita enquanto a busca estava em andamento.
      if (activeWrites || importing || writeVersion !== startedAtWrite ||
          (!force && (blocked || isModalOpen() || localIsDirty()))) {
        scheduledRefresh = true;
        refreshButton(true);
        renderNotice('Atualização disponível. Revise antes de atualizar.', true);
        return;
      }
      // A atualização manual forçada descarta o rascunho SOMENTE após
      // confirmar a leitura do servidor e obter consentimento do usuário.
      if (force) storePending([]);
      currentRecords = next;
      blocked = false; scheduledRefresh = false; refreshButton(false);
      hooks.onUpdate(fresh);
      renderNotice('Sincronizado • salvo no Supabase');
    } catch (e) {
      renderNotice('Erro de sincronização: ' + e.message, true);
    }
  }
  function scheduleRefresh() {
    if (!started) return;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => refreshFromCloud(false), 650);
  }
  function createBar() {
    if (bar) return;
    bar = document.createElement('section');
    bar.id = 'crm-cloud-bar';
    bar.innerHTML = `<div>☁️ <strong>Multiusuário</strong><div id="crm-cloud-status">Conectado</div></div>
      <small id="crm-cloud-email"></small>
      <div class="crm-role-line">Cargo: <strong id="crm-cloud-role"></strong></div>
      <div class="crm-cloud-actions">
        <button type="button" id="crm-refresh-btn">Atualizar</button>
        <button type="button" id="crm-import-btn" style="display:none">Importar base local</button>
        <button type="button" id="crm-manage-members" hidden>Equipe e permissões</button>
        <button type="button" id="crm-logout-btn">Sair</button>
      </div>`;
    (document.querySelector('aside') || document.body).appendChild(bar);
    bar.querySelector('#crm-refresh-btn').addEventListener('click', async () => {
      if ((blocked || localIsDirty()) && !confirm('Existem alterações locais não sincronizadas. ' + recoveryHelp() + ' Atualizar descartará essas alterações. Continuar?')) return;
      await refreshFromCloud(true);
    });
    bar.querySelector('#crm-import-btn').addEventListener('click', importLegacy);
    bar.querySelector('#crm-manage-members').addEventListener('click', openTeamModal);
    bar.querySelector('#crm-logout-btn').addEventListener('click', async () => {
      if (activeWrites || importing || localIsDirty()) {
        alert('Há alterações ainda não enviadas. Aguarde a sincronização ou faça um backup antes de sair.');
        return;
      }
      await client.auth.signOut(); location.reload();
    });
    bar.querySelector('#crm-cloud-email').textContent = activeUser.email || '';
    updateRoleUI();
  }
  async function requireAdmin() {
    if (!activeUser || activeRole !== 'administrador') {
      throw new Error('Acesso negado: Excel / Backup é exclusivo do Administrador.');
    }
    // Validação no Supabase a CADA operação sensível (inclusive após troca de cargo).
    const { data, error } = await client.rpc('is_crm_admin');
    if (error) throw error;
    if (data !== true) {
      await refreshMyRole();
      throw new Error('Seu acesso de Administrador não está mais autorizado.');
    }
    return true;
  }
  // A interface ajuda a usar as permissões; a verificação real é feita
  // nas funções SECURITY DEFINER do Supabase e nas políticas RLS.
  async function changeMember(userId, role, remove = false) {
    if (activeRole !== 'administrador') throw new Error('Apenas administradores gerenciam a equipe.');
    const { error } = await client.rpc('crm_manage_member', {
      p_user_id: userId, p_role: role, p_remove: remove
    });
    if (error) throw error;
  }
  function addText(el, tag, value, className = '') {
    const child = document.createElement(tag);
    if (className) child.className = className;
    child.textContent = value;
    el.appendChild(child);
    return child;
  }
  async function openTeamModal() {
    if (activeRole !== 'administrador') return;
    document.querySelector('#crm-members-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'crm-members-modal';
    overlay.className = 'crm-members-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','crm-members-title');
    overlay.innerHTML = `<div class="crm-members-panel">
      <div class="crm-members-header"><div><h2 id="crm-members-title">Equipe e permissões</h2>
      <p>Somente administradores podem autorizar, trocar cargos ou revogar acessos.</p></div>
      <button type="button" id="crm-members-close" aria-label="Fechar">✕</button></div>
      <div id="crm-members-msg" role="status"></div>
      <div id="crm-members-list">Carregando equipe...</div>
      <form id="crm-member-add-form" class="crm-member-add">
        <strong>Adicionar conta existente</strong>
        <p>Primeiro crie o usuário em Supabase → Authentication → Users. Depois cole o UID aqui.</p>
        <label>UID do usuário<input id="crm-member-uid" required
          placeholder="00000000-0000-0000-0000-000000000000" autocomplete="off"></label>
        <label>Cargo<select id="crm-member-role">
          <option value="gerente">Gerente Comercial</option>
          <option value="vendedor">Vendedor</option>
          <option value="administrador">Administrador</option>
        </select></label>
        <button type="submit" class="crm-members-main-btn">Autorizar usuário</button>
      </form>
      <p class="crm-members-hint">Gerentes e administradores podem visualizar, incluir, editar e excluir registros comerciais. Vendedores podem visualizar, incluir e editar, mas não excluir. Somente administradores gerenciam usuários.</p>
    </div>`;
    document.body.appendChild(overlay);
    const msg = overlay.querySelector('#crm-members-msg');
    const list = overlay.querySelector('#crm-members-list');
    const message = (value, isError = false) => {
      msg.textContent = value; msg.dataset.error = isError ? 'true' : 'false';
    };
    overlay.querySelector('#crm-members-close').onclick = () => overlay.remove();
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
    const refreshTeam = async () => {
      const { data, error } = await client.from('crm_members')
        .select('user_id,role,joined_at').order('joined_at', { ascending: true });
      if (error) throw error;
      list.replaceChildren();
      for (const member of data || []) {
        const row = document.createElement('div');
        row.className = 'crm-team-row';
        const who = document.createElement('div');
        addText(who,'strong',member.user_id === activeUser.id ? 'Sua conta' : 'Conta autorizada');
        addText(who,'code',member.user_id,'crm-member-uid');
        row.appendChild(who);
        const group = document.createElement('div');
        group.className = 'crm-team-controls';
        const select = document.createElement('select');
        select.setAttribute('aria-label','Cargo do usuário');
        for (const [value,label] of Object.entries(ROLE_LABELS)) {
          const option = document.createElement('option');
          option.value = value; option.textContent = label; select.appendChild(option);
        }
        select.value = member.role;
        const self = member.user_id === activeUser.id;
        select.disabled = self;
        select.onchange = async () => {
          const next = select.value;
          if (!confirm(`Alterar o cargo deste usuário para ${roleLabel(next)}?`)) {
            select.value = member.role; return;
          }
          select.disabled = true;
          try {
            await changeMember(member.user_id, next, false);
            await refreshTeam(); message('Cargo atualizado com sucesso.');
          } catch (e) {
            message(e.message || 'Falha ao mudar o cargo.', true);
            select.value = member.role; select.disabled = false;
          }
        };
        group.appendChild(select);
        const del = document.createElement('button');
        del.type = 'button'; del.className = 'crm-members-remove';
        del.textContent = 'Revogar acesso'; del.disabled = self;
        del.onclick = async () => {
          if (!confirm('Revogar o acesso deste usuário ao Gestor Panamby? Ele não poderá mais consultar nem alterar os dados.')) return;
          del.disabled = true;
          try { await changeMember(member.user_id, member.role, true); await refreshTeam(); message('Acesso revogado.'); }
          catch (e) { message(e.message || 'Falha ao revogar acesso.', true); del.disabled = false; }
        };
        group.appendChild(del);
        row.appendChild(group);
        list.appendChild(row);
      }
    };
    overlay.querySelector('#crm-member-add-form').onsubmit = async (event) => {
      event.preventDefault();
      const id = overlay.querySelector('#crm-member-uid').value.trim();
      const role = overlay.querySelector('#crm-member-role').value;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        message('Informe o UID completo exibido em Authentication → Users.', true); return;
      }
      const submit = overlay.querySelector('.crm-members-main-btn');
      submit.disabled = true;
      try {
        await changeMember(id,role,false);
        await refreshTeam(); message('Usuário autorizado com sucesso.');
        overlay.querySelector('#crm-member-uid').value = '';
      } catch (e) { message(e.message || 'Falha ao autorizar usuário.', true); }
      finally { submit.disabled = false; }
    };
    try { await refreshTeam(); } catch (e) { message('Erro ao carregar a equipe: ' + e.message, true); }
    overlay.querySelector('#crm-members-close').focus();
  }

  function buildDiff(state) {
    const local = flatten(state), ops = [];
    for (const [key, prev] of currentRecords) {
      if (!local.has(key)) ops.push({ op: 'delete', kind: prev.kind, id: prev.id, version: prev.version });
    }
    for (const [key, next] of local) {
      const prev = currentRecords.get(key);
      if (!prev) ops.push({ op: 'insert', kind: next.kind, id: next.id, data: next.data, version: 0 });
      else if (JSON.stringify(next.data) !== JSON.stringify(prev.data)) {
        ops.push({ op: 'update', kind: next.kind, id: next.id, data: next.data, version: prev.version });
      }
    }
    return ops;
  }
  async function uploadState(state, adminImport = false) {
    if (blocked) throw new Error('Conflito pendente. Faça um backup e atualize os dados do servidor.');
    if (!activeUser) throw new Error('Sessão não autenticada');
    const changes = buildDiff(state);
    if (!changes.length) return true;
    if (changes.length > 150) renderNotice(`Enviando ${changes.length} registros...`);
    for (let i = 0; i < changes.length; i += 100) {
      const batch = changes.slice(i, i + 100);
      const { error } = await client.rpc(adminImport ? 'apply_crm_admin_changes' : 'apply_crm_changes', { p_changes: batch });
      if (error) throw error;
      for (const change of batch) {
        const key = keyFor(change.kind, change.id);
        if (change.op === 'delete') currentRecords.delete(key);
        else currentRecords.set(key, { kind: change.kind, id: change.id, data: copy(change.data), version: change.version + 1 });
      }
      writeVersion++;
      if (changes.length > 150) renderNotice(`Enviados ${Math.min(i + batch.length, changes.length)}/${changes.length} registros`);
    }
    renderNotice('Salvo • sincronizado');
    return true;
  }
  function alertSaveError(e) {
    if (blocked) return;
    blocked = true; scheduledRefresh = true; refreshButton(true);
    renderNotice('Conflito / falha ao salvar. ' + recoveryHelp(), true);
    console.error('Falha no salvamento multiusuário:', e);
    alert(`Não foi possível salvar na nuvem: ${e.message}\n\nSeu navegador ainda mostra os dados locais. ${recoveryHelp()} Nenhum outro usuário foi sobrescrito.`);
  }
  function persist(state, adminImport = false) {
    if (!activeUser) return Promise.reject(new Error('Acesso não autenticado'));
    const snapshot = copy(normalize(state));
    try {
      // Gravação SÍNCRONA no navegador antes de enviar qualquer requisição.
      // Um refresh imediato não perde uma alteração já confirmada pelo botão Salvar.
      storePending(buildDiff(snapshot), adminImport);
    } catch (e) {
      alertSaveError(e);
      return Promise.resolve(false);
    }
    activeWrites++;
    renderNotice('Salvando no Supabase...');
    const task = tail.then(() => uploadState(snapshot, adminImport));
    tail = task.catch(() => {});
    return task.then(() => {
      // Pode existir uma edição mais recente na tela enquanto o lote era salvo.
      // Nunca remover o rascunho da edição nova ao confirmar a edição anterior.
      storePending(buildDiff(hooks?.getCurrent ? hooks.getCurrent() : snapshot), adminImport);
      if (!readPending().length) renderNotice('Salvo no Supabase • pode atualizar a página');
      return true;
    }).catch(e => { alertSaveError(e); return false; }).finally(() => {
      activeWrites--;
      if (!activeWrites && (scheduledRefresh || remoteEventExpected) && !blocked) {
        remoteEventExpected = false; scheduleRefresh();
      }
    });
  }
  async function offerLegacyImport() {
    if (activeRole !== 'administrador' || !hooks?.getLocal) return;
    try {
      const old = await hooks.getLocal();
      if (!hasAny(old)) return;
      if (!currentRecords.size) {
        const button = bar.querySelector('#crm-import-btn');
        button.style.display = 'inline-flex';
        renderNotice('Banco compartilhado vazio. Sua base antiga pode ser importada.');
      }
    } catch (e) { console.warn('Não foi possível localizar a antiga base local:', e); }
  }
  async function importLegacy() {
    await requireAdmin();
    if (importing || activeWrites) return;
    if (currentRecords.size) return alert('Importação inicial bloqueada: o banco compartilhado já tem dados. Faça uma exportação e planeje a migração para evitar substituir registros de outros usuários.');
    const old = await hooks.getLocal();
    if (!hasAny(old)) return alert('Nenhum dado local foi encontrado neste navegador.');
    if (!confirm('Enviar todos os dados que estavam salvos neste navegador para o banco compartilhado? Use apenas uma base inicial. Faça backup antes de confirmar.')) return;
    importing = true; bar.querySelector('#crm-import-btn').disabled = true;
    try {
      await uploadState(normalize(old), true);
      const fresh = await fetchAll();
      hooks.onUpdate(fresh);
      bar.querySelector('#crm-import-btn').style.display = 'none';
      renderNotice('Base importada com sucesso');
    } catch (e) {
      blocked = true;
      alert(`Importação interrompida: ${e.message}\nAlguns lotes podem ter sido enviados. Não repita sem conferir o banco. Os dados originais continuam no seu navegador.`);
      renderNotice('Importação interrompida. Verifique os dados.', true);
    } finally { importing = false; }
  }
  async function importBackup(data) {
    await requireAdmin();
    if (!activeUser) throw new Error('Faça login antes de importar.');
    if (importing || activeWrites) throw new Error('Há outra gravação em andamento.');
    if (currentRecords.size) throw new Error('O banco compartilhado já possui registros. Para evitar substituir dados de colegas, a restauração de backup está limitada à primeira importação com banco vazio.');
    const prepared = normalize(data);
    if (!hasAny(prepared)) throw new Error('Backup sem dados reconhecidos.');
    if (!confirm(`IMPORTAÇÃO INICIAL: adicionar ${FIELDS.reduce((s, k) => s + prepared[k].length, 0)} registros ao banco COMPARTILHADO? Todos os usuários verão esses dados. Continue somente se estiver vazio e você tiver feito uma cópia de segurança.`)) return false;
    importing = true;
    try {
      await uploadState(prepared, true);
      const fresh = await fetchAll();
      hooks.onUpdate(fresh);
      if (bar) bar.querySelector('#crm-import-btn').style.display = 'none';
      renderNotice('Backup inicial importado • sincronizado');
      return true;
    } catch (e) {
      blocked = true;
      renderNotice('Importação parcial ou interrompida; confira o banco.', true);
      throw new Error(e.message + '. Se algum lote já tiver sido salvo, não repita a importação sem conferir os dados.');
    } finally { importing = false; }
  }
  async function load() {
    const url = String(cfg.url || '').trim(), publicKey = String(cfg.publishableKey || '').trim();
    if (!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url) || !publicKey || publicKey.includes('COLE_')) {
      throw new Error('Configure url e publishableKey em supabase-config.js antes de publicar.');
    }
    if (!window.supabase?.createClient) throw new Error('Biblioteca Supabase indisponível. Confira sua internet e o script no index.html.');
    if (!client) {
      client = window.supabase.createClient(url, publicKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    await ensureAuthorized();
    const state = await fetchAll();
    createBar();
    const recovered = recoverPending(state);
    started = true;
    // Recupera alterações que estavam a caminho do servidor quando a página
    // foi recarregada. Só reenvia automaticamente se não houver conflito.
    if (recovered.replay) persist(recovered.state, recovered.adminOnly);
    if (channel) client.removeChannel(channel);
    channel = client.channel('panamby-crm-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_records' }, () => {
        if (activeWrites || importing) remoteEventExpected = true;
        else scheduleRefresh();
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') renderNotice('Atualização automática desconectada. Clique em Atualizar.', true);
      });
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && started) location.reload();
    });
    // Recuperação caso a conexão Realtime caia, e ao retornar à aba.
    setInterval(() => {
      if (document.visibilityState !== 'hidden' && !activeWrites && !importing) {
        refreshMyRole().catch(err => renderNotice('Erro ao verificar permissões: ' + err.message, true));
        refreshFromCloud(false);
      }
    }, 60000);
    window.addEventListener('focus', () => {
      refreshMyRole().catch(err => renderNotice('Erro ao verificar permissões: ' + err.message, true));
      scheduleRefresh();
    });
    window.addEventListener('beforeunload', event => {
      if (activeWrites || importing || blocked || localIsDirty()) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
    if (!recovered.replay && !blocked) offerLegacyImport();
    return recovered.state;
  }
  window.CRMCloud = {
    setup(nextHooks) { hooks = nextHooks; },
    load, persist, importBackup, requireAdmin,
    async persistAdmin(state) { await requireAdmin(); return persist(state, true); },
    get role() { return activeRole; },
    get canDelete() { return activeRole === 'administrador' || activeRole === 'gerente'; },
    get busy() { return activeWrites > 0 || importing; },
    get hasPendingChanges() { return blocked || activeWrites > 0 || localIsDirty(); }
  };
})();
