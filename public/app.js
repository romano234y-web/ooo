// ── CART STATE ────────────────────────────────
let cart = {};
let activeTab = 'pizzas_tomate';

function fmt(n) { return n.toFixed(2).replace('.', ',') + ' €'; }

// ── HEADER SCROLL EFFECT ──────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('header').classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── MOBILE NAV ────────────────────────────────
document.getElementById('burger-toggle').addEventListener('click', () => {
  document.getElementById('mobile-nav').classList.toggle('open');
});
function closeMobileNav() {
  document.getElementById('mobile-nav').classList.remove('open');
}

// ── CATEGORY TABS ─────────────────────────────
function initTabs() {
  document.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.cat;
      renderCategory(activeTab);
    });
  });
}

// ── RENDER CATEGORY ───────────────────────────
function renderCategory(catKey) {
  const cat = MENU[catKey];
  const container = document.getElementById('menu-container');
  let html = '<div class="menu-category">';
  if (cat.note) html += `<div class="cat-note">${cat.note}</div>`;
  html += '<div class="menu-grid">';

  for (const item of cat.items) {
    if (cat.sizes) {
      html += `<div class="menu-card" id="card-${item.id}">
        <div class="menu-name">${item.name}</div>
        <div class="menu-desc">${item.desc}</div>
        <div class="pizza-sizes">
          ${PIZZA_SIZES.map(s => `
            <button class="size-btn${cart[item.id+'|'+s.key]?.qty ? ' active' : ''}"
              id="sb-${item.id}-${s.key}"
              onclick="addPizza('${item.id}','${s.key}','${item.name.replace(/'/g,"\\'")}',${s.price})">
              ${s.label}<strong>${fmt(s.price)}</strong>
              <div class="qty-ind" id="qi-${item.id}-${s.key}">${cart[item.id+'|'+s.key]?.qty > 0 ? '× '+cart[item.id+'|'+s.key].qty : ''}</div>
            </button>`).join('')}
        </div>
      </div>`;
    } else {
      const qty = cart[item.id]?.qty || 0;
      html += `<div class="menu-card${qty > 0 ? ' in-cart' : ''}" id="card-${item.id}">
        <div class="menu-name">${item.name}</div>
        <div class="menu-desc">${item.desc}</div>
        <div class="menu-bottom">
          <div class="menu-price">${fmt(item.price)}</div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty('${item.id}',-1,'${item.name.replace(/'/g,"\\'")}',${item.price})">−</button>
            <span class="qty-val" id="qty-${item.id}">${qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.id}',1,'${item.name.replace(/'/g,"\\'")}',${item.price})">+</button>
          </div>
        </div>
      </div>`;
    }
  }

  html += '</div></div>';
  container.innerHTML = html;
}

// ── PIZZA ADD ─────────────────────────────────
function addPizza(id, sizeKey, name, price) {
  const key = `${id}|${sizeKey}`;
  const size = PIZZA_SIZES.find(s => s.key === sizeKey);
  if (cart[key]) cart[key].qty++;
  else cart[key] = { name: `${name} (${size.label})`, qty: 1, price };

  // Update button
  const btn = document.getElementById(`sb-${id}-${sizeKey}`);
  const qi = document.getElementById(`qi-${id}-${sizeKey}`);
  if (btn) btn.classList.add('active');
  if (qi) qi.textContent = '× ' + cart[key].qty;

  // Highlight card
  const card = document.getElementById(`card-${id}`);
  if (card) card.classList.add('in-cart');

  renderCart();
  flashCart();
}

// ── STANDARD QTY ──────────────────────────────
function changeQty(id, delta, name, price) {
  if (!cart[id] && delta > 0) cart[id] = { name, qty: 0, price };
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];

  const el = document.getElementById(`qty-${id}`);
  if (el) el.textContent = cart[id]?.qty || 0;
  const card = document.getElementById(`card-${id}`);
  if (card) card.classList.toggle('in-cart', !!cart[id]);
  renderCart();
  if (delta > 0) flashCart();
}

// ── RENDER CART ───────────────────────────────
function renderCart() {
  const entries = Object.entries(cart).filter(([, v]) => v.qty > 0);
  const count = entries.reduce((a, [, v]) => a + v.qty, 0);

  document.getElementById('cart-count').textContent = count;

  const cartItems = document.getElementById('cart-items');
  const cartTotalBlock = document.getElementById('cart-total-block');

  if (entries.length === 0) {
    cartItems.innerHTML = `<div class="cart-empty">
      <div class="cart-empty-icon">🍕</div>
      <p>Votre panier est vide</p>
      <a href="#menu" class="cart-empty-link">Voir la carte →</a>
    </div>`;
    cartTotalBlock.style.display = 'none';
    return;
  }

  cartItems.innerHTML = entries.map(([, v]) => {
    const sub = v.price * v.qty;
    return `<div class="cart-line">
      <span class="cart-line-name">${v.name} × ${v.qty}</span>
      <span class="cart-line-price">${fmt(sub)}</span>
    </div>`;
  }).join('');

  // Calcul des promotions selon le mode choisi
  const type = document.querySelector('input[name="type"]:checked')?.value || 'emporter';
  const items = entries.map(([k, v]) => ({ id: k, name: v.name, qty: v.qty, price: v.price }));
  const promo = Promo.compute(items, type);

  let footerHTML = '';
  footerHTML += `<div class="cart-sub-line"><span>Sous-total</span><span>${fmt(promo.subtotal)}</span></div>`;

  if (promo.discount > 0) {
    footerHTML += promo.details.map(d => `<div class="cart-promo-line">${d}</div>`).join('');
    footerHTML += `<div class="cart-sub-line discount"><span>Réduction</span><span>−${fmt(promo.discount)}</span></div>`;
  }

  footerHTML += `<div class="cart-total-line"><span>Total</span><strong>${fmt(promo.total)}</strong></div>`;

  // Avertissement livraison minimum
  if (type === 'livraison' && !Promo.livraisonAllowed(items)) {
    const reste = Promo.MIN_LIVRAISON - promo.subtotal;
    footerHTML += `<div class="cart-warning">🛵 Livraison dès ${Promo.MIN_LIVRAISON}€ — encore ${fmt(reste)}</div>`;
  }

  cartTotalBlock.innerHTML = footerHTML;
  cartTotalBlock.style.display = 'block';

  updateLivraisonAvailability(items);
}

// Active/désactive la livraison selon le minimum
function updateLivraisonAvailability(items) {
  const livRadio = document.querySelector('input[name="type"][value="livraison"]');
  if (!livRadio) return;
  const allowed = Promo.livraisonAllowed(items);
  const card = livRadio.closest('.type-card');
  livRadio.disabled = !allowed;
  if (card) card.classList.toggle('disabled', !allowed);
  // Si livraison sélectionnée mais désormais interdite → repasser en emporter
  if (!allowed && livRadio.checked) {
    document.querySelector('input[name="type"][value="emporter"]').checked = true;
    document.getElementById('adresse-group').style.display = 'none';
  }
}

function flashCart() {
  const badge = document.getElementById('cart-count');
  badge.style.transform = 'scale(1.4)';
  setTimeout(() => badge.style.transform = '', 200);
}

// ── CRENEAUX ──────────────────────────────────
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

// ── TYPE TOGGLE ───────────────────────────────
document.querySelectorAll('input[name="type"]').forEach(r => {
  r.addEventListener('change', () => {
    const isLiv = r.value === 'livraison';
    const ag = document.getElementById('adresse-group');
    ag.style.display = isLiv ? 'block' : 'none';
    document.getElementById('adresse').required = isLiv;
    renderCart();
  });
});

// ── SUBMIT ────────────────────────────────────
document.getElementById('order-form').addEventListener('submit', async e => {
  e.preventDefault();
  const entries = Object.entries(cart).filter(([, v]) => v.qty > 0);
  if (!entries.length) {
    alert('Votre panier est vide ! Ajoutez des articles depuis la carte.');
    document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const type = document.querySelector('input[name="type"]:checked').value;
  const items = entries.map(([k, v]) => ({ id: k, name: v.name, qty: v.qty, price: v.price }));

  if (type === 'livraison' && !Promo.livraisonAllowed(items)) {
    alert(`La livraison nécessite un minimum de ${Promo.MIN_LIVRAISON}€ de commande.`);
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Envoi en cours...';

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
        notes: document.getElementById('notes').value.trim() || null,
      })
    });
    if (!res.ok) { const er = await res.json(); throw new Error(er.error || 'Erreur'); }
    const order = await res.json();
    showConfirm(order);
  } catch (err) {
    alert('Erreur : ' + err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Valider ma commande';
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
  renderCategory(activeTab);
  renderCart();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── INIT ──────────────────────────────────────
initTabs();
renderCategory(activeTab);
loadCreneaux();
