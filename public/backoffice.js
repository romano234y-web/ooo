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
      <div class="order-total">Total : <strong>${fmt(order.total)}</strong></div>
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

// Filtre date par défaut = aujourd'hui
const today = new Date().toISOString().split('T')[0];
document.getElementById('filter-date').value = today;

document.getElementById('filter-date').addEventListener('change', loadOrders);
document.getElementById('filter-status').addEventListener('change', loadOrders);

// Auto-refresh toutes les 30s
loadOrders();
setInterval(loadOrders, 30000);
