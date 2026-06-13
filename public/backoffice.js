const STATUS_LABELS = {
  en_attente: { label: '⏳ En attente', cls: 'status-wait' },
  en_preparation: { label: '👨‍🍳 En préparation', cls: 'status-prep' },
  pret: { label: '✅ Prêt', cls: 'status-ready' },
  livre: { label: '📦 Livré', cls: 'status-done' },
  annule: { label: '❌ Annulé', cls: 'status-cancel' },
};

const STATUS_NEXT = {
  en_attente: 'en_preparation',
  en_preparation: 'pret',
  pret: 'livre',
};

const STATUS_NEXT_LABEL = {
  en_attente: '👨‍🍳 Prendre en charge',
  en_preparation: '✅ Marquer prêt',
  pret: '📦 Livré / Remis',
};

function fmt(n) { return n.toFixed(2).replace('.', ',') + ' €'; }
function fmtDate(str) {
  const d = new Date(str);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

let allOrders = [];

async function loadOrders() {
  const date = document.getElementById('filter-date').value;
  const status = document.getElementById('filter-status').value;
  let url = '/api/orders?';
  if (date) url += `date=${date}&`;
  if (status) url += `status=${status}`;
  const res = await fetch(url);
  allOrders = await res.json();
  renderStats();
  renderOrders();
}

function renderStats() {
  const counts = {};
  Object.keys(STATUS_LABELS).forEach(k => counts[k] = 0);
  allOrders.forEach(o => counts[o.status] = (counts[o.status] || 0) + 1);
  document.getElementById('bo-stats').innerHTML = Object.entries(STATUS_LABELS).map(([k, v]) =>
    `<div class="stat-chip ${v.cls}">${v.label} <strong>${counts[k]}</strong></div>`
  ).join('');
}

function renderOrders() {
  const container = document.getElementById('orders-container');
  if (allOrders.length === 0) {
    container.innerHTML = '<p class="loading">Aucune commande pour ce filtre.</p>';
    return;
  }
  container.innerHTML = allOrders.map(order => {
    const st = STATUS_LABELS[order.status];
    const nextStatus = STATUS_NEXT[order.status];
    const nextLabel = STATUS_NEXT_LABEL[order.status];
    return `
    <div class="order-card ${st.cls}" id="order-${order.id}">
      <div class="order-header">
        <span class="order-num">#${order.numero}</span>
        <span class="order-type">${order.type === 'livraison' ? '🛵 Livraison' : '🛍️ Emporter'}</span>
        <span class="order-time">${fmtDate(order.created_at)}</span>
      </div>
      <div class="order-client">
        <strong>${order.client_name}</strong> — ${order.client_phone}
        ${order.adresse ? `<br><small>📍 ${order.adresse}</small>` : ''}
      </div>
      <div class="order-creneau">🕐 Créneau : <strong>${order.creneau}</strong></div>
      <div class="order-items">
        ${order.items.map(i => `<div class="order-item">${i.qty}× ${i.name} <span>${fmt(i.price * i.qty)}</span></div>`).join('')}
        ${order.notes ? `<div class="order-notes">📝 ${order.notes}</div>` : ''}
      </div>
      <div class="order-total">
        ${order.discount > 0 ? `<span style="font-size:.8rem;color:#2ecc71;display:block;margin-bottom:2px;">🎁 Promo −${fmt(order.discount)}</span>` : ''}
        Total : <strong>${fmt(order.total)}</strong>
      </div>
      <div class="order-status-label ${st.cls}">${st.label}</div>
      <div class="order-actions">
        ${nextStatus ? `<button class="btn-action btn-next" onclick="updateStatus(${order.id}, '${nextStatus}')">${nextLabel}</button>` : ''}
        <button class="btn-action btn-print" onclick="printOrder(${order.id})">🖨️ Imprimer</button>
        ${order.status !== 'annule' ? `<button class="btn-action btn-cancel" onclick="updateStatus(${order.id}, 'annule')">Annuler</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function updateStatus(id, status) {
  await fetch(`/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  loadOrders();
}

function printOrder(id) {
  const order = allOrders.find(o => o.id === id);
  if (!order) return;
  const content = `
    <div class="ticket">
      <div class="ticket-header">
        <h1>🍕 R'pizz</h1>
        <div class="ticket-num">#${order.numero}</div>
        <div class="ticket-meta">${fmtDate(order.created_at)}</div>
      </div>
      <div class="ticket-type">${order.type === 'livraison' ? '🛵 LIVRAISON' : '🛍️ À EMPORTER'}</div>
      <div class="ticket-creneau">Créneau : ${order.creneau}</div>
      <hr>
      <div class="ticket-client">
        <strong>${order.client_name}</strong><br>
        ${order.client_phone}
        ${order.adresse ? `<br>📍 ${order.adresse}` : ''}
      </div>
      <hr>
      <div class="ticket-items">
        ${order.items.map(i => `
          <div class="ticket-line">
            <span>${i.qty}× ${i.name}</span>
            <span>${(i.price * i.qty).toFixed(2)} €</span>
          </div>
        `).join('')}
      </div>
      <hr>
      ${order.discount > 0 ? `
        <div class="ticket-line"><span>Sous-total</span><span>${(order.subtotal || 0).toFixed(2)} €</span></div>
        ${(order.promo_details || []).map(d => `<div class="ticket-line" style="color:#c0392b">${d}</div>`).join('')}
        <div class="ticket-line"><span>Réduction</span><span>-${order.discount.toFixed(2)} €</span></div>
        <hr>
      ` : ''}
      ${order.notes ? `<div class="ticket-notes">📝 ${order.notes}</div><hr>` : ''}
      <div class="ticket-total">TOTAL : ${order.total.toFixed(2)} €</div>
    </div>
    <div class="print-actions no-print">
      <button class="btn-primary" onclick="window.print()">🖨️ Imprimer</button>
      <button class="btn-action" onclick="closePrint()">Fermer</button>
    </div>
  `;
  document.getElementById('print-content').innerHTML = content;
  document.getElementById('print-modal').style.display = 'flex';
}

function closePrint() {
  document.getElementById('print-modal').style.display = 'none';
}

// Fermer en cliquant dehors
document.getElementById('print-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closePrint();
});

// ─── CLIENTS ─────────────────────────────────────
async function loadClients() {
  const res = await fetch('/api/clients');
  const clients = await res.json();
  const body = document.getElementById('clients-body');
  if (!clients.length) {
    body.innerHTML = '<tr><td colspan="7" class="loading">Aucun client pour le moment.</td></tr>';
    return;
  }
  body.innerHTML = clients.map(c => {
    const vip = c.orders_count >= 5 ? '<span class="client-vip">VIP</span>' : '';
    return `<tr>
      <td class="c-name">${c.name}${vip}</td>
      <td class="c-phone">${c.phone}</td>
      <td class="c-addr">${c.addresses.length ? c.addresses.join('<br>') : '—'}</td>
      <td>${c.orders_count}</td>
      <td class="c-spent">${fmt(c.total_spent)}</td>
      <td>${fmt(c.avg_basket)}</td>
      <td>${fmtDate(c.last_order)}</td>
    </tr>`;
  }).join('');
}

// ─── STATISTIQUES ────────────────────────────────
async function loadStats() {
  const res = await fetch('/api/stats');
  const s = await res.json();

  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi-card highlight">
      <div class="kpi-label">CA Total</div>
      <div class="kpi-value">${fmt(s.ca_total)}</div>
      <div class="kpi-sub">${s.orders_total} commandes</div>
    </div>
    <div class="kpi-card highlight">
      <div class="kpi-label">CA Aujourd'hui</div>
      <div class="kpi-value">${fmt(s.ca_today)}</div>
      <div class="kpi-sub">${s.orders_today} commandes aujourd'hui</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Panier moyen</div>
      <div class="kpi-value small">${fmt(s.avg_basket)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Clients</div>
      <div class="kpi-value small">${s.clients_count}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Promotions offertes</div>
      <div class="kpi-value small">−${fmt(s.total_discount)}</div>
      <div class="kpi-sub">Total des réductions accordées</div>
    </div>
  `;

  const totalCA = s.ca_livraison + s.ca_emporter || 1;
  document.getElementById('split-bars').innerHTML = `
    <div class="split-bar-row">
      <span class="split-bar-label">🛵 Livraison</span>
      <div class="split-bar-track"><div class="split-bar-fill liv" style="width:${(s.ca_livraison/totalCA*100).toFixed(0)}%"></div></div>
      <span class="split-bar-val">${fmt(s.ca_livraison)}</span>
    </div>
    <div class="split-bar-row">
      <span class="split-bar-label">🛍️ À emporter</span>
      <div class="split-bar-track"><div class="split-bar-fill emp" style="width:${(s.ca_emporter/totalCA*100).toFixed(0)}%"></div></div>
      <span class="split-bar-val">${fmt(s.ca_emporter)}</span>
    </div>
    <div class="split-bar-row" style="margin-top:8px;color:var(--muted);font-size:.8rem;">
      <span class="split-bar-label">Commandes</span>
      <span>🛵 ${s.count_livraison} &nbsp;·&nbsp; 🛍️ ${s.count_emporter}</span>
    </div>
  `;

  document.getElementById('top-list').innerHTML = s.top_items.length
    ? s.top_items.map((it, i) => `
      <div class="top-row">
        <span class="top-rank">${i + 1}</span>
        <span class="top-name">${it.name}</span>
        <span class="top-qty">×${it.qty}</span>
      </div>`).join('')
    : '<p class="loading">Pas encore de données.</p>';
}

// ─── ONGLETS ─────────────────────────────────────
let currentView = 'commandes';

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.bo-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.bo-view').forEach(v => v.style.display = 'none');
  document.getElementById('view-' + view).style.display = 'block';
  document.getElementById('orders-controls').style.visibility = view === 'commandes' ? 'visible' : 'hidden';
  refresh();
}

document.querySelectorAll('.bo-tab').forEach(tab => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

// Rafraîchit la vue active
function refresh() {
  if (currentView === 'commandes') loadOrders();
  else if (currentView === 'clients') loadClients();
  else if (currentView === 'stats') loadStats();
}

// Filtre date par défaut = aujourd'hui
const today = new Date().toISOString().split('T')[0];
document.getElementById('filter-date').value = today;

document.getElementById('filter-date').addEventListener('change', loadOrders);
document.getElementById('filter-status').addEventListener('change', loadOrders);

// Init + auto-refresh toutes les 30s
loadOrders();
setInterval(refresh, 30000);
