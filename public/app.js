let cart = {};

function fmt(n) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

function renderMenu(items, containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = items.map(item => `
    <div class="menu-card" id="card-${item.id}">
      <div class="menu-info">
        <div class="menu-name">${item.name}</div>
        <div class="menu-desc">${item.desc}</div>
        <div class="menu-price">${fmt(item.price)}</div>
      </div>
      <div class="menu-actions">
        <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
        <span class="qty-display" id="qty-${item.id}">0</span>
        <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
      </div>
    </div>
  `).join('');
}

function findItem(id) {
  for (const cat of Object.values(MENU)) {
    const found = cat.find(i => i.id === id);
    if (found) return found;
  }
}

function changeQty(id, delta) {
  const item = findItem(id);
  if (!item) return;
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  document.getElementById(`qty-${id}`).textContent = cart[id] || 0;
  const card = document.getElementById(`card-${id}`);
  card.classList.toggle('in-cart', !!cart[id]);
  renderCart();
}

function renderCart() {
  const el = document.getElementById('cart-items');
  const totalBlock = document.getElementById('cart-total-block');
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  document.getElementById('cart-count').textContent = count;

  if (count === 0) {
    el.innerHTML = '<p class="empty-cart">Votre panier est vide.<br>Sélectionnez des articles ci-dessus.</p>';
    totalBlock.style.display = 'none';
    return;
  }

  let total = 0;
  const lines = Object.entries(cart).map(([id, qty]) => {
    const item = findItem(id);
    const sub = item.price * qty;
    total += sub;
    return `<div class="cart-line">
      <span>${item.name} × ${qty}</span>
      <span>${fmt(sub)}</span>
    </div>`;
  });

  el.innerHTML = lines.join('');
  document.getElementById('cart-total').textContent = fmt(total);
  totalBlock.style.display = 'block';
}

async function loadCreneaux() {
  const res = await fetch('/api/creneaux');
  const slots = await res.json();
  const sel = document.getElementById('creneau');
  slots.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
}

document.querySelectorAll('input[name="type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isLiv = radio.value === 'livraison';
    document.getElementById('adresse-group').style.display = isLiv ? 'block' : 'none';
    document.getElementById('adresse').required = isLiv;
  });
});

document.getElementById('order-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (Object.keys(cart).length === 0) {
    alert('Votre panier est vide !');
    return;
  }
  const type = document.querySelector('input[name="type"]:checked').value;
  const items = Object.entries(cart).map(([id, qty]) => {
    const item = findItem(id);
    return { id, name: item.name, qty, price: item.price };
  });
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours...';

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
        items,
        total,
        notes: document.getElementById('notes').value.trim() || null,
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur serveur');
    }
    const order = await res.json();
    showConfirm(order);
  } catch (err) {
    alert('Erreur : ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Valider la commande';
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
  document.querySelectorAll('.qty-display').forEach(el => el.textContent = '0');
  document.querySelectorAll('.menu-card').forEach(el => el.classList.remove('in-cart'));
  renderCart();
}

// Init
renderMenu(MENU.classiques, 'menu-classiques');
renderMenu(MENU.signature, 'menu-signature');
renderMenu(MENU.boissons, 'menu-boissons');
loadCreneaux();
