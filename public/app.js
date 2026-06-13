// cart: { 'itemId|size': { name, qty, price } }
let cart = {};

function fmt(n) { return n.toFixed(2).replace('.', ',') + ' €'; }

// ─── RENDER MENU ────────────────────────────────────────────────
function renderMenu() {
  const container = document.getElementById('menu-container');
  let html = '';

  for (const [catKey, cat] of Object.entries(MENU)) {
    html += `<div class="menu-category">
      <div class="menu-category-header">
        <h3>${cat.label}</h3>
        ${cat.note ? `<span class="menu-note">${cat.note}</span>` : ''}
      </div>
      <div class="menu-grid">`;

    for (const item of cat.items) {
      if (cat.sizes) {
        // Pizza avec 3 tailles
        html += `<div class="menu-card" id="card-${item.id}">
          <div class="menu-name">${item.name}</div>
          <div class="menu-desc">${item.desc}</div>
          <div class="pizza-sizes">
            ${PIZZA_SIZES.map(s => `
              <button class="size-btn" id="sizebtn-${item.id}-${s.key}" onclick="togglePizza('${item.id}','${s.key}','${item.name}',${s.price})">
                ${s.label}<strong>${fmt(s.price)}</strong>
                <div class="qty-indicator" id="sqty-${item.id}-${s.key}"></div>
              </button>
            `).join('')}
          </div>
        </div>`;
      } else {
        // Article standard
        html += `<div class="menu-card" id="card-${item.id}">
          <div class="menu-name">${item.name}</div>
          <div class="menu-desc">${item.desc}</div>
          <div class="menu-bottom">
            <div class="menu-price">${fmt(item.price)}</div>
            <div class="menu-actions">
              <button class="qty-btn" onclick="changeQty('${item.id}',-1,'${item.name.replace(/'/g,"\\'")}',${item.price})">−</button>
              <span class="qty-display" id="qty-${item.id}">0</span>
              <button class="qty-btn" onclick="changeQty('${item.id}',1,'${item.name.replace(/'/g,"\\'")}',${item.price})">+</button>
            </div>
          </div>
        </div>`;
      }
    }

    html += `</div></div>`;
  }

  container.innerHTML = html;
}

// ─── PIZZA SIZE TOGGLE ───────────────────────────────────────────
function togglePizza(id, sizeKey, name, price) {
  const cartKey = `${id}|${sizeKey}`;
  const size = PIZZA_SIZES.find(s => s.key === sizeKey);
  if (cart[cartKey]) {
    cart[cartKey].qty++;
  } else {
    cart[cartKey] = { name: `${name} (${size.label})`, qty: 1, price };
  }
  updatePizzaBtn(id, sizeKey);
  renderCart();
}

function updatePizzaBtn(id, sizeKey) {
  const cartKey = `${id}|${sizeKey}`;
  const btn = document.getElementById(`sizebtn-${id}-${sizeKey}`);
  const qtyEl = document.getElementById(`sqty-${id}-${sizeKey}`);
  if (!btn) return;
  const qty = cart[cartKey]?.qty || 0;
  btn.classList.toggle('active', qty > 0);
  qtyEl.textContent = qty > 0 ? `× ${qty}` : '';

  // Surligner la carte si au moins une taille sélectionnée
  const card = document.getElementById(`card-${id}`);
  const hasAny = PIZZA_SIZES.some(s => cart[`${id}|${s.key}`]?.qty > 0);
  card.classList.toggle('in-cart', hasAny);
}

// ─── STANDARD QTY ───────────────────────────────────────────────
function changeQty(id, delta, name, price) {
  const cartKey = id;
  if (!cart[cartKey] && delta > 0) cart[cartKey] = { name, qty: 0, price };
  if (!cart[cartKey]) return;
  cart[cartKey].qty += delta;
  if (cart[cartKey].qty <= 0) delete cart[cartKey];

  const qtyEl = document.getElementById(`qty-${id}`);
  if (qtyEl) qtyEl.textContent = cart[cartKey]?.qty || 0;
  const card = document.getElementById(`card-${id}`);
  if (card) card.classList.toggle('in-cart', !!cart[cartKey]);
  renderCart();
}

// ─── RENDER CART ─────────────────────────────────────────────────
function renderCart() {
  const el = document.getElementById('cart-items');
  const totalBlock = document.getElementById('cart-total-block');
  const entries = Object.entries(cart).filter(([, v]) => v.qty > 0);
  const count = entries.reduce((a, [, v]) => a + v.qty, 0);
  document.getElementById('cart-count').textContent = count;

  if (entries.length === 0) {
    el.innerHTML = '<p class="empty-cart">Votre panier est vide.<br>Sélectionnez des articles ci-dessus.</p>';
    totalBlock.style.display = 'none';
    return;
  }

  let total = 0;
  el.innerHTML = entries.map(([, v]) => {
    const sub = v.price * v.qty;
    total += sub;
    return `<div class="cart-line"><span>${v.name} × ${v.qty}</span><span>${fmt(sub)}</span></div>`;
  }).join('');
  document.getElementById('cart-total').textContent = fmt(total);
  totalBlock.style.display = 'block';
}

// ─── CRENEAUX ───────────────────────────────────────────────────
async function loadCreneaux() {
  const res = await fetch('/api/creneaux');
  const slots = await res.json();
  const sel = document.getElementById('creneau');
  slots.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    sel.appendChild(opt);
  });
}

// ─── TYPE TOGGLE ────────────────────────────────────────────────
document.querySelectorAll('input[name="type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isLiv = radio.value === 'livraison';
    document.getElementById('adresse-group').style.display = isLiv ? 'block' : 'none';
    document.getElementById('adresse').required = isLiv;
  });
});

// ─── SUBMIT ─────────────────────────────────────────────────────
document.getElementById('order-form').addEventListener('submit', async e => {
  e.preventDefault();
  const entries = Object.entries(cart).filter(([, v]) => v.qty > 0);
  if (entries.length === 0) { alert('Votre panier est vide !'); return; }

  const type = document.querySelector('input[name="type"]:checked').value;
  const items = entries.map(([key, v]) => ({ id: key, name: v.name, qty: v.qty, price: v.price }));
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.textContent = 'Envoi en cours...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: document.getElementById('client_name').value.trim(),
        client_phone: document.getElementById('client_phone').value.trim(),
        type,
        adresse: document.getElementById('adresse').value.trim() || null,
        creneau: document.getElementById('creneau').value,
        items, total,
        notes: document.getElementById('notes').value.trim() || null,
      })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erreur'); }
    const order = await res.json();
    showConfirm(order);
  } catch (err) {
    alert('Erreur : ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Valider la commande';
  }
});

function showConfirm(order) {
  document.getElementById('confirm-numero').textContent = order.numero;
  document.getElementById('confirm-creneau').textContent = order.creneau;
  document.getElementById('confirm-type').textContent =
    order.type === 'livraison' ? `🛵 Livraison — ${order.adresse}` : '🛍️ À emporter';
  document.getElementById('confirmation-overlay').style.display = 'flex';
}

function closeConfirm() {
  document.getElementById('confirmation-overlay').style.display = 'none';
  document.getElementById('order-form').reset();
  document.getElementById('adresse-group').style.display = 'none';
  cart = {};
  renderMenu();
  renderCart();
}

// ─── INIT ────────────────────────────────────────────────────────
renderMenu();
loadCreneaux();
