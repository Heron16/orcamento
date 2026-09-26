/* ========================================
   FinançasPro – Lógica Principal
   ======================================== */

// ──────────────────────────────────────────
//  ESTADO / STORAGE
// ──────────────────────────────────────────
const KEY_LANC = 'fp_lancamentos';
const KEY_CONQ = 'fp_conquistas';

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

let lancamentos = load(KEY_LANC);
let conquistas  = load(KEY_CONQ);

// ──────────────────────────────────────────
//  ESTADO DE NAVEGAÇÃO
// ──────────────────────────────────────────
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let anoAnualAtual = new Date().getFullYear();

// Chart instances
let charts = {};

// ──────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun',
                     'Jul','Ago','Set','Out','Nov','Dez'];

function fmt(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function toast(msg, tipo = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${tipo} show`;
  setTimeout(() => { el.classList.remove('show'); }, 3000);
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// ──────────────────────────────────────────
//  NAVEGAÇÃO
// ──────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:   'Dashboard',
  lancamentos: 'Lançamentos',
  mensal:      'Visão Mensal',
  anual:       'Visão Anual',
  reservas:    'Reservas',
  conquistas:  'Conquistas',
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    navigateTo(page);
    // fechar sidebar em mobile
    document.getElementById('sidebar').classList.remove('open');
  });
});

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');

  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;

  // Atualizar a página exibida
  if (page === 'dashboard')   renderDashboard();
  if (page === 'lancamentos') renderLancamentos();
  if (page === 'mensal')      renderMensal();
  if (page === 'anual')       renderAnual();
  if (page === 'reservas')    renderReservas();
  if (page === 'conquistas')  renderConquistas();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ──────────────────────────────────────────
//  DATA ATUAL
// ──────────────────────────────────────────
function atualizarData() {
  const now = new Date();
  const opts = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('pt-BR', opts);
}

// ──────────────────────────────────────────
//  LANÇAMENTOS — CRUD
// ──────────────────────────────────────────
function adicionarLancamento() {
  const tipo       = document.getElementById('lanc-tipo').value;
  const desc       = document.getElementById('lanc-desc').value.trim();
  const valor      = parseFloat(document.getElementById('lanc-valor').value);
  const categoria  = document.getElementById('lanc-categoria').value;
  const data       = document.getElementById('lanc-data').value;
  const recorrencia= document.getElementById('lanc-recorrencia').value;

  if (!desc) { toast('Informe uma descrição', 'error'); return; }
  if (!valor || valor <= 0) { toast('Informe um valor válido', 'error'); return; }
  if (!data) { toast('Informe a data', 'error'); return; }

  const lanc = { id: uid(), tipo, desc, valor, categoria, data, recorrencia };
  lancamentos.push(lanc);
  save(KEY_LANC, lancamentos);

  // Limpar form
  document.getElementById('lanc-desc').value = '';
  document.getElementById('lanc-valor').value = '';

  toast(`${tipo === 'receita' ? 'Receita' : tipo === 'gasto' ? 'Gasto' : 'Reserva'} adicionado(a) com sucesso!`);
  renderLancamentos();
}

function excluirLancamento(id) {
  if (!confirm('Excluir este lançamento?')) return;
  lancamentos = lancamentos.filter(l => l.id !== id);
  save(KEY_LANC, lancamentos);
  renderLancamentos();
  toast('Lançamento excluído', 'info');
}

// ──────────────────────────────────────────
//  LANÇAMENTOS — RENDER
// ──────────────────────────────────────────
function renderLancamentos(lista) {
  if (!lista) lista = [...lancamentos].sort((a, b) => b.data.localeCompare(a.data));
  const tbody = document.getElementById('tbody-lancamentos');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span>📭</span><p>Nenhum lançamento encontrado.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(l => `
    <tr>
      <td>${fmtData(l.data)}</td>
      <td>${l.desc}</td>
      <td>${l.categoria}</td>
      <td><span class="badge badge-${l.tipo}">${l.tipo.charAt(0).toUpperCase() + l.tipo.slice(1)}</span></td>
      <td class="val-${l.tipo}">${fmt(l.valor)}</td>
      <td><button class="btn-danger" onclick="excluirLancamento('${l.id}')">✕</button></td>
    </tr>
  `).join('');
}

function filtrarLancamentos() {
  const busca = document.getElementById('filtro-busca').value.toLowerCase();
  const tipo  = document.getElementById('filtro-tipo').value;
  let lista = lancamentos.filter(l => {
    const matchBusca = l.desc.toLowerCase().includes(busca) || l.categoria.toLowerCase().includes(busca);
    const matchTipo  = !tipo || l.tipo === tipo;
    return matchBusca && matchTipo;
  });
  lista.sort((a, b) => b.data.localeCompare(a.data));
  renderLancamentos(lista);
}

// ──────────────────────────────────────────
//  DASHBOARD
// ──────────────────────────────────────────
function renderDashboard() {
  const hoje = new Date();
  const m = hoje.getMonth();
  const a = hoje.getFullYear();

  const doMes = lancamentos.filter(l => {
    const d = new Date(l.data + 'T00:00:00');
    return d.getMonth() === m && d.getFullYear() === a;
  });

  const receita  = somarTipo(doMes, 'receita');
  const gastos   = somarTipo(doMes, 'gasto');
  const guardado = somarTipo(lancamentos, 'reserva');
  const saldo    = receita - gastos - somarTipo(doMes, 'reserva');

  document.getElementById('dash-receita').textContent  = fmt(receita);
  document.getElementById('dash-gastos').textContent   = fmt(gastos);
  document.getElementById('dash-guardado').textContent = fmt(guardado);
  document.getElementById('dash-saldo').textContent    = fmt(saldo);

  // Gráfico Receita vs Gastos últimos 6 meses
  buildChartReceitaGastos();
  buildChartCategorias(doMes);
  buildChartReservasDash();
  renderDashConquistas();
}

function somarTipo(lista, tipo) {
  return lista.filter(l => l.tipo === tipo).reduce((s, l) => s + l.valor, 0);
}

function buildChartReceitaGastos() {
  destroyChart('chartReceitaGastos');
  const hoje = new Date();
  const labels = [], dataReceita = [], dataGastos = [], dataReservas = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    labels.push(MESES_CURTO[d.getMonth()] + '/' + String(d.getFullYear()).slice(2));
    const lista = lancamentos.filter(l => {
      const ld = new Date(l.data + 'T00:00:00');
      return ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear();
    });
    dataReceita.push(somarTipo(lista, 'receita'));
    dataGastos.push(somarTipo(lista, 'gasto'));
    dataReservas.push(somarTipo(lista, 'reserva'));
  }

  const ctx = document.getElementById('chartReceitaGastos');
  if (!ctx) return;
  charts['chartReceitaGastos'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Receita', data: dataReceita, backgroundColor: 'rgba(39,174,96,0.8)', borderRadius: 6 },
        { label: 'Gastos',  data: dataGastos,  backgroundColor: 'rgba(231,76,60,0.8)',  borderRadius: 6 },
        { label: 'Reserva', data: dataReservas, backgroundColor: 'rgba(52,152,219,0.8)', borderRadius: 6 },
      ]
    },
    options: chartOptions()
  });
}

function buildChartCategorias(lista) {
  destroyChart('chartCategorias');
  const gastos = lista.filter(l => l.tipo === 'gasto');
  const catMap = {};
  gastos.forEach(l => { catMap[l.categoria] = (catMap[l.categoria] || 0) + l.valor; });
  const labels = Object.keys(catMap);
  const data   = Object.values(catMap);

  if (!labels.length) return;

  const ctx = document.getElementById('chartCategorias');
  if (!ctx) return;
  charts['chartCategorias'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: pieColors(labels.length), borderWidth: 2, borderColor: '#1a1d27' }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'right', labels: { color: '#8892a4', font: { size: 12 } } } }
    }
  });
}

function buildChartReservasDash() {
  destroyChart('chartReservas');
  const reservas = lancamentos.filter(l => l.tipo === 'reserva').sort((a, b) => a.data.localeCompare(b.data));
  if (!reservas.length) return;

  let acum = 0;
  const labels = [], data = [];
  reservas.forEach(r => {
    acum += r.valor;
    labels.push(fmtData(r.data));
    data.push(acum);
  });

  const ctx = document.getElementById('chartReservas');
  if (!ctx) return;
  charts['chartReservas'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Reservas Acumuladas',
        data,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52,152,219,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#3498db',
      }]
    },
    options: chartOptions()
  });
}

function renderDashConquistas() {
  const el = document.getElementById('dash-conquistas-list');
  if (!el) return;
  if (!conquistas.length) {
    el.innerHTML = `<div class="empty-state"><span>🎯</span><p>Nenhuma conquista cadastrada ainda. Vá até "Conquistas" para adicionar suas metas!</p></div>`;
    return;
  }
  el.innerHTML = conquistas.map(c => {
    const pct = Math.min(100, ((c.guardado || 0) / c.valor) * 100).toFixed(1);
    return `
      <div class="dash-conq-item">
        <div class="dash-conq-row">
          <span class="dash-conq-nome">${c.icone || '🎯'} ${c.nome}</span>
          <span class="dash-conq-pct">${pct}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill ${pct >= 100 ? 'complete' : ''}" style="width:${pct}%"></div>
        </div>
        <small style="color:var(--text-muted)">${fmt(c.guardado || 0)} de ${fmt(c.valor)} — falta ${fmt(Math.max(0, c.valor - (c.guardado || 0)))}</small>
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────────
//  VISÃO MENSAL
// ──────────────────────────────────────────
function mudarMes(delta) {
  mesAtual += delta;
  if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
  if (mesAtual < 0)  { mesAtual = 11; anoAtual--; }
  renderMensal();
}

function renderMensal() {
  document.getElementById('mesAtualLabel').textContent = `${MESES[mesAtual]} / ${anoAtual}`;

  const lista = lancamentos.filter(l => {
    const d = new Date(l.data + 'T00:00:00');
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const receita  = somarTipo(lista, 'receita');
  const gastos   = somarTipo(lista, 'gasto');
  const guardado = somarTipo(lista, 'reserva');
  const saldo    = receita - gastos - guardado;

  document.getElementById('men-receita').textContent  = fmt(receita);
  document.getElementById('men-gastos').textContent   = fmt(gastos);
  document.getElementById('men-guardado').textContent = fmt(guardado);
  document.getElementById('men-saldo').textContent    = fmt(saldo);
  document.getElementById('men-saldo').style.color    = saldo >= 0 ? 'var(--green-light)' : 'var(--red)';

  // Tabela
  const sorted = [...lista].sort((a, b) => a.data.localeCompare(b.data));
  const tbody = document.getElementById('tbody-mensal');
  if (tbody) {
    if (!sorted.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><span>📭</span><p>Sem lançamentos neste mês.</p></div></td></tr>`;
    } else {
      tbody.innerHTML = sorted.map(l => `
        <tr>
          <td>${fmtData(l.data)}</td>
          <td>${l.desc}</td>
          <td>${l.categoria}</td>
          <td><span class="badge badge-${l.tipo}">${l.tipo.charAt(0).toUpperCase() + l.tipo.slice(1)}</span></td>
          <td class="val-${l.tipo}">${fmt(l.valor)}</td>
        </tr>
      `).join('');
    }
  }

  // Gráficos
  buildChartMensalCategorias(lista);
  buildChartMensalDias(lista);
}

function buildChartMensalCategorias(lista) {
  destroyChart('chartMensalCategorias');
  const gastos = lista.filter(l => l.tipo === 'gasto');
  const catMap = {};
  gastos.forEach(l => { catMap[l.categoria] = (catMap[l.categoria] || 0) + l.valor; });
  const labels = Object.keys(catMap);
  const data   = Object.values(catMap);
  const ctx = document.getElementById('chartMensalCategorias');
  if (!ctx || !labels.length) return;
  charts['chartMensalCategorias'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: pieColors(labels.length), borderWidth: 2, borderColor: '#1a1d27' }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#8892a4', font: { size: 11 }, padding: 10 } } }
    }
  });
}

function buildChartMensalDias(lista) {
  destroyChart('chartMensalDias');
  const gastos = lista.filter(l => l.tipo === 'gasto');
  const diaMap = {};
  gastos.forEach(l => {
    const dia = parseInt(l.data.split('-')[2]);
    diaMap[dia] = (diaMap[dia] || 0) + l.valor;
  });
  if (!Object.keys(diaMap).length) return;
  const labels = Object.keys(diaMap).sort((a, b) => a - b).map(d => `Dia ${d}`);
  const data   = Object.keys(diaMap).sort((a, b) => a - b).map(k => diaMap[k]);
  const ctx = document.getElementById('chartMensalDias');
  if (!ctx) return;
  charts['chartMensalDias'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Gastos', data, backgroundColor: 'rgba(231,76,60,0.7)', borderRadius: 5 }]
    },
    options: chartOptions()
  });
}

// ──────────────────────────────────────────
//  VISÃO ANUAL
// ──────────────────────────────────────────
function mudarAno(delta) {
  anoAnualAtual += delta;
  renderAnual();
}

function renderAnual() {
  document.getElementById('anoAtualLabel').textContent = `Ano ${anoAnualAtual}`;

  const doAno = lancamentos.filter(l => {
    const d = new Date(l.data + 'T00:00:00');
    return d.getFullYear() === anoAnualAtual;
  });

  const receita  = somarTipo(doAno, 'receita');
  const gastos   = somarTipo(doAno, 'gasto');
  const guardado = somarTipo(doAno, 'reserva');
  const taxa     = receita > 0 ? ((guardado / receita) * 100).toFixed(1) : 0;

  document.getElementById('anu-receita').textContent  = fmt(receita);
  document.getElementById('anu-gastos').textContent   = fmt(gastos);
  document.getElementById('anu-guardado').textContent = fmt(guardado);
  document.getElementById('anu-taxa').textContent     = `${taxa}%`;

  // Tabela resumo
  const tbody = document.getElementById('tbody-anual');
  if (tbody) {
    let rows = '';
    for (let m = 0; m < 12; m++) {
      const ml = lancamentos.filter(l => {
        const d = new Date(l.data + 'T00:00:00');
        return d.getMonth() === m && d.getFullYear() === anoAnualAtual;
      });
      const r = somarTipo(ml, 'receita');
      const g = somarTipo(ml, 'gasto');
      const gd = somarTipo(ml, 'reserva');
      const s = r - g - gd;
      rows += `<tr>
        <td>${MESES[m]}</td>
        <td class="val-receita">${fmt(r)}</td>
        <td class="val-gasto">${fmt(g)}</td>
        <td class="val-reserva">${fmt(gd)}</td>
        <td class="${s >= 0 ? 'val-receita' : 'val-gasto'}">${fmt(s)}</td>
      </tr>`;
    }
    tbody.innerHTML = rows;
  }

  buildChartAnual();
}

function buildChartAnual() {
  destroyChart('chartAnual');
  const labels = MESES_CURTO;
  const dataR = [], dataG = [], dataRes = [];

  for (let m = 0; m < 12; m++) {
    const ml = lancamentos.filter(l => {
      const d = new Date(l.data + 'T00:00:00');
      return d.getMonth() === m && d.getFullYear() === anoAnualAtual;
    });
    dataR.push(somarTipo(ml, 'receita'));
    dataG.push(somarTipo(ml, 'gasto'));
    dataRes.push(somarTipo(ml, 'reserva'));
  }

  const ctx = document.getElementById('chartAnual');
  if (!ctx) return;
  charts['chartAnual'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Receitas', data: dataR,   backgroundColor: 'rgba(39,174,96,0.8)',   borderRadius: 5 },
        { label: 'Gastos',   data: dataG,   backgroundColor: 'rgba(231,76,60,0.8)',   borderRadius: 5 },
        { label: 'Reservas', data: dataRes, backgroundColor: 'rgba(52,152,219,0.8)',  borderRadius: 5 },
      ]
    },
    options: chartOptions()
  });
}

// ──────────────────────────────────────────
//  RESERVAS
// ──────────────────────────────────────────
function renderReservas() {
  const reservas = lancamentos.filter(l => l.tipo === 'reserva').sort((a, b) => a.data.localeCompare(b.data));
  const hoje = new Date();
  const m = hoje.getMonth(), a = hoje.getFullYear();

  const total    = reservas.reduce((s, r) => s + r.valor, 0);
  const desMes   = reservas.filter(r => { const d = new Date(r.data + 'T00:00:00'); return d.getMonth() === m && d.getFullYear() === a; }).reduce((s, r) => s + r.valor, 0);
  const desAno   = reservas.filter(r => { const d = new Date(r.data + 'T00:00:00'); return d.getFullYear() === a; }).reduce((s, r) => s + r.valor, 0);

  document.getElementById('res-total').textContent = fmt(total);
  document.getElementById('res-mes').textContent   = fmt(desMes);
  document.getElementById('res-ano').textContent   = fmt(desAno);

  // Tabela
  const tbody = document.getElementById('tbody-reservas');
  if (tbody) {
    if (!reservas.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><span>🏦</span><p>Nenhuma reserva registrada ainda.</p></div></td></tr>`;
    } else {
      let acum = 0;
      tbody.innerHTML = reservas.map(r => {
        acum += r.valor;
        return `<tr>
          <td>${fmtData(r.data)}</td>
          <td>${r.desc}</td>
          <td class="val-reserva">${fmt(r.valor)}</td>
          <td>${fmt(acum)}</td>
        </tr>`;
      }).join('');
    }
  }

  buildChartReservasCres(reservas);
}

function buildChartReservasCres(reservas) {
  destroyChart('chartReservasCres');
  if (!reservas.length) return;
  let acum = 0;
  const labels = [], data = [];
  reservas.forEach(r => {
    acum += r.valor;
    labels.push(fmtData(r.data));
    data.push(parseFloat(acum.toFixed(2)));
  });
  const ctx = document.getElementById('chartReservasCres');
  if (!ctx) return;
  charts['chartReservasCres'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Total Acumulado',
        data,
        borderColor: '#4ecdc4',
        backgroundColor: 'rgba(78,205,196,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: '#4ecdc4',
      }]
    },
    options: chartOptions()
  });
}

// ──────────────────────────────────────────
//  CONQUISTAS — CRUD
// ──────────────────────────────────────────
function adicionarConquista() {
  const nome      = document.getElementById('conq-nome').value.trim();
  const valor     = parseFloat(document.getElementById('conq-valor').value);
  const guardado  = parseFloat(document.getElementById('conq-guardado').value) || 0;
  const data      = document.getElementById('conq-data').value;
  const icone     = document.getElementById('conq-icone').value.trim() || '🎯';
  const prioridade= document.getElementById('conq-prioridade').value;

  if (!nome)  { toast('Informe o nome da conquista', 'error'); return; }
  if (!valor || valor <= 0) { toast('Informe o valor necessário', 'error'); return; }

  conquistas.push({ id: uid(), nome, valor, guardado, data, icone, prioridade });
  save(KEY_CONQ, conquistas);

  document.getElementById('conq-nome').value    = '';
  document.getElementById('conq-valor').value   = '';
  document.getElementById('conq-guardado').value = '0';
  document.getElementById('conq-data').value    = '';
  document.getElementById('conq-icone').value   = '';

  toast(`Conquista "${nome}" adicionada!`);
  renderConquistas();
}

function excluirConquista(id) {
  if (!confirm('Excluir esta conquista?')) return;
  conquistas = conquistas.filter(c => c.id !== id);
  save(KEY_CONQ, conquistas);
  renderConquistas();
  toast('Conquista excluída', 'info');
}

// Modal para abater valor
let abaterConqId = null;

function abrirAbater(id) {
  abaterConqId = id;
  const c = conquistas.find(c => c.id === id);
  document.getElementById('abater-label').textContent = `Quanto você guardou para "${c.nome}"?`;
  document.getElementById('abater-valor').value = '';
  document.getElementById('abater-modal').classList.add('show');
}

function fecharAbater() {
  document.getElementById('abater-modal').classList.remove('show');
  abaterConqId = null;
}

function confirmarAbater() {
  const val = parseFloat(document.getElementById('abater-valor').value);
  if (!val || val <= 0) { toast('Informe um valor válido', 'error'); return; }
  const c = conquistas.find(c => c.id === abaterConqId);
  if (!c) return;
  c.guardado = (c.guardado || 0) + val;
  save(KEY_CONQ, conquistas);
  fecharAbater();
  toast(`${fmt(val)} adicionado à conquista "${c.nome}"!`);
  renderConquistas();
}

// ──────────────────────────────────────────
//  CONQUISTAS — RENDER
// ──────────────────────────────────────────
function renderConquistas() {
  const el = document.getElementById('conquistas-list');
  if (!el) return;

  if (!conquistas.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span>🎯</span><p>Nenhuma conquista cadastrada. Adicione sua primeira meta acima!</p></div>`;
    return;
  }

  const sorted = [...conquistas].sort((a, b) => {
    const ord = { alta: 0, media: 1, baixa: 2 };
    return ord[a.prioridade] - ord[b.prioridade];
  });

  el.innerHTML = sorted.map(c => {
    const guardado = c.guardado || 0;
    const falta    = Math.max(0, c.valor - guardado);
    const pct      = Math.min(100, (guardado / c.valor) * 100);
    const concluida = pct >= 100;

    // Cálculo de economia necessária
    let econInfo = '';
    if (!concluida && c.data) {
      const hoje = new Date();
      const alvo = new Date(c.data + 'T00:00:00');
      const mesesRestantes = Math.max(1,
        (alvo.getFullYear() - hoje.getFullYear()) * 12 + (alvo.getMonth() - hoje.getMonth())
      );
      const porMes = falta / mesesRestantes;
      econInfo = `<div class="conquista-economia">
        💡 Para alcançar até <strong>${fmtData(c.data)}</strong>, você precisa guardar <strong>${fmt(porMes)}/mês</strong> (${mesesRestantes} meses restantes)
      </div>`;
    }

    return `
      <div class="conquista-card prioridade-${c.prioridade}">
        <div class="conquista-header">
          <span class="conquista-icone">${c.icone || '🎯'}</span>
          <span class="conquista-prioridade">
            ${c.prioridade === 'alta' ? '🔴 Alta' : c.prioridade === 'media' ? '🟡 Média' : '🟢 Baixa'}
          </span>
        </div>
        <div class="conquista-nome">${c.nome}</div>
        ${c.data ? `<div class="conquista-data">📅 Meta: ${fmtData(c.data)}</div>` : ''}
        <div class="conquista-valores">
          <div class="conq-val-item">
            <div class="conq-val-label">Total</div>
            <div class="conq-val-num total">${fmt(c.valor)}</div>
          </div>
          <div class="conq-val-item">
            <div class="conq-val-label">Guardado</div>
            <div class="conq-val-num guardado">${fmt(guardado)}</div>
          </div>
          <div class="conq-val-item">
            <div class="conq-val-label">Falta</div>
            <div class="conq-val-num falta">${fmt(falta)}</div>
          </div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill ${concluida ? 'complete' : ''}" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="progress-pct">${pct.toFixed(1)}% ${concluida ? '✅ Conquistado!' : 'concluído'}</div>
        ${econInfo}
        <div class="conquista-actions">
          ${!concluida
            ? `<button class="btn-abater" onclick="abrirAbater('${c.id}')">💰 Adicionar Valor</button>`
            : `<button class="btn-abater" disabled>✅ Conquistado!</button>`
          }
          <button class="btn-danger" onclick="excluirConquista('${c.id}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────────
//  CHART OPTIONS (tema escuro)
// ──────────────────────────────────────────
function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: { color: '#8892a4', font: { size: 12 } }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${fmt(ctx.parsed.y ?? ctx.parsed)}`
        }
      }
    },
    scales: {
      x: { ticks: { color: '#8892a4' }, grid: { color: 'rgba(46,51,80,0.5)' } },
      y: { ticks: { color: '#8892a4', callback: v => 'R$' + v.toLocaleString('pt-BR') }, grid: { color: 'rgba(46,51,80,0.5)' } }
    }
  };
}

function pieColors(n) {
  const base = ['#6c63ff','#4ecdc4','#27ae60','#e74c3c','#f39c12','#3498db','#9b59b6','#1abc9c','#e67e22','#e91e63','#00bcd4','#8bc34a'];
  return Array.from({ length: n }, (_, i) => base[i % base.length]);
}

// ──────────────────────────────────────────
//  LIMPAR TUDO
// ──────────────────────────────────────────
function clearAllData() {
  if (!confirm('⚠️ Isso irá apagar TODOS os lançamentos e conquistas. Tem certeza?')) return;
  lancamentos = [];
  conquistas  = [];
  save(KEY_LANC, lancamentos);
  save(KEY_CONQ, conquistas);
  toast('Todos os dados foram limpos', 'info');
  renderDashboard();
}

// ──────────────────────────────────────────
//  INIT
// ──────────────────────────────────────────
function init() {
  atualizarData();

  // Definir data padrão como hoje
  const hoje = new Date().toISOString().split('T')[0];
  const lancData = document.getElementById('lanc-data');
  if (lancData) lancData.value = hoje;

  // Injetar modal de abater
  document.body.insertAdjacentHTML('beforeend', `
    <div class="abater-modal" id="abater-modal">
      <div class="abater-box">
        <h3>💰 Adicionar Valor à Conquista</h3>
        <p id="abater-label" style="font-size:13px;color:var(--text-muted);margin-bottom:14px;"></p>
        <input type="number" id="abater-valor" placeholder="Valor em R$" min="0" step="0.01" />
        <div class="abater-actions">
          <button class="btn-confirm" onclick="confirmarAbater()">Confirmar</button>
          <button class="btn-cancel"  onclick="fecharAbater()">Cancelar</button>
        </div>
      </div>
    </div>
  `);

  // Fechar modal ao clicar fora
  document.getElementById('abater-modal').addEventListener('click', function(e) {
    if (e.target === this) fecharAbater();
  });

  renderDashboard();
}

document.addEventListener('DOMContentLoaded', init);
