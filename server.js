const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

/* =========================================================
   SITE PRINCIPAL — Nexa IA (dossier /site)
   ========================================================= */
app.use(express.static(path.join(__dirname, 'site')));

const LEADS_FILE = path.join(__dirname, 'leads.json');

function readLeads() {
  if (!fs.existsSync(LEADS_FILE)) return { leads: [], nextId: 1 };
  try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch { return { leads: [], nextId: 1 }; }
}
function writeLeads(db) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(db, null, 2));
}

// Protection optionnelle du back-office : activée seulement si ADMIN_KEY est défini.
// En production : lancez avec `ADMIN_KEY=monsecret node server.js`, puis ouvrez /admin?key=monsecret
function adminGuard(req, res, next) {
  const key = process.env.ADMIN_KEY;
  if (!key) return next();
  if ((req.query.key || req.headers['x-admin-key']) === key) return next();
  return res.status(401).json({ error: 'Non autorisé' });
}

// Réception d'une demande de contact (formulaire du site)
app.post('/api/leads', (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Champs requis manquants (nom, email, message).' });
  }
  const db = readLeads();
  const lead = {
    id: db.nextId++,
    name: String(name).slice(0, 120),
    email: String(email).slice(0, 160),
    company: req.body.company ? String(req.body.company).slice(0, 120) : null,
    phone: req.body.phone ? String(req.body.phone).slice(0, 40) : null,
    sector: req.body.sector ? String(req.body.sector).slice(0, 80) : null,
    message: String(message).slice(0, 4000),
    status: 'nouveau',
    created_at: new Date().toISOString(),
  };
  db.leads.push(lead);
  writeLeads(db);
  res.status(201).json({ ok: true, id: lead.id });
});

// Liste des demandes (pour le back-office)
app.get('/api/leads', adminGuard, (req, res) => {
  res.json(readLeads().leads.slice().reverse());
});

// Mise à jour du statut d'une demande
app.patch('/api/leads/:id', adminGuard, (req, res) => {
  const { status } = req.body || {};
  const valid = ['nouveau', 'contacte', 'gagne', 'perdu'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  const db = readLeads();
  const lead = db.leads.find(l => l.id === parseInt(req.params.id, 10));
  if (!lead) return res.status(404).json({ error: 'Demande introuvable' });
  lead.status = status;
  writeLeads(db);
  res.json({ ok: true });
});

// Back-office des demandes
app.get('/admin', adminGuard, (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'admin.html'));
});


/* =========================================================
   PROJET SÉPARÉ — Démo R'pizz (conservée, non liée au site Nexa)
   Accessible sous /demos/rpizz — laissé intact volontairement.
   ========================================================= */
const Promo = require('./public/promo.js');
const DB_FILE = path.join(__dirname, 'orders.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) return { orders: [], nextId: 1 };
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return { orders: [], nextId: 1 }; }
}
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.use('/demos/rpizz', express.static(path.join(__dirname, 'public')));
app.get('/demos/rpizz/backoffice', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'backoffice.html'));
});

function genNumero() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `RP${pad(now.getHours())}${pad(now.getMinutes())}-${Math.floor(Math.random() * 900 + 100)}`;
}

app.post('/api/promo-preview', (req, res) => {
  const { items, type } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Items invalides' });
  const promo = Promo.compute(items, type || 'emporter');
  promo.livraisonAllowed = Promo.livraisonAllowed(items);
  promo.minLivraison = Promo.MIN_LIVRAISON;
  res.json(promo);
});

app.post('/api/orders', (req, res) => {
  const { client_name, client_phone, type, adresse, creneau, items, notes } = req.body;
  if (!client_name || !client_phone || !type || !creneau || !items || !items.length) {
    return res.status(400).json({ error: 'Champs manquants' });
  }
  if (type === 'livraison' && !adresse) {
    return res.status(400).json({ error: 'Adresse requise pour la livraison' });
  }
  if (type === 'livraison' && !Promo.livraisonAllowed(items)) {
    return res.status(400).json({ error: `La livraison nécessite un minimum de ${Promo.MIN_LIVRAISON}€ de commande` });
  }

  const promo = Promo.compute(items, type);

  const db = readDB();
  const order = {
    id: db.nextId++,
    numero: genNumero(),
    client_name, client_phone, type,
    adresse: adresse || null,
    creneau, items,
    subtotal: promo.subtotal,
    discount: promo.discount,
    total: promo.total,
    promo_details: promo.details,
    notes: notes || null,
    status: 'en_attente',
    created_at: new Date().toISOString()
  };
  db.orders.push(order);
  writeDB(db);
  res.status(201).json(order);
});

app.get('/api/clients', (req, res) => {
  const db = readDB();
  const map = {};
  db.orders.forEach(o => {
    if (o.status === 'annule') return;
    const key = (o.client_phone || '').replace(/\s/g, '');
    if (!key) return;
    if (!map[key]) {
      map[key] = {
        phone: o.client_phone,
        name: o.client_name,
        addresses: new Set(),
        orders_count: 0,
        total_spent: 0,
        last_order: o.created_at,
        first_order: o.created_at,
      };
    }
    const c = map[key];
    c.name = o.client_name;
    if (o.adresse) c.addresses.add(o.adresse);
    c.orders_count++;
    c.total_spent += (o.total || 0);
    if (o.created_at > c.last_order) c.last_order = o.created_at;
    if (o.created_at < c.first_order) c.first_order = o.created_at;
  });
  const clients = Object.values(map).map(c => ({
    ...c,
    addresses: [...c.addresses],
    total_spent: Math.round(c.total_spent * 100) / 100,
    avg_basket: c.orders_count ? Math.round((c.total_spent / c.orders_count) * 100) / 100 : 0,
  })).sort((a, b) => b.total_spent - a.total_spent);
  res.json(clients);
});

app.get('/api/stats', (req, res) => {
  const db = readDB();
  const valid = db.orders.filter(o => o.status !== 'annule');
  const today = new Date().toISOString().split('T')[0];
  const sum = arr => Math.round(arr.reduce((s, o) => s + (o.total || 0), 0) * 100) / 100;
  const todayOrders = valid.filter(o => o.created_at.startsWith(today));
  const livraison = valid.filter(o => o.type === 'livraison');
  const emporter = valid.filter(o => o.type === 'emporter');
  const itemCount = {};
  valid.forEach(o => (o.items || []).forEach(i => {
    itemCount[i.name] = (itemCount[i.name] || 0) + i.qty;
  }));
  const topItems = Object.entries(itemCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));
  const totalDiscount = Math.round(valid.reduce((s, o) => s + (o.discount || 0), 0) * 100) / 100;
  res.json({
    ca_total: sum(valid),
    ca_today: sum(todayOrders),
    orders_total: valid.length,
    orders_today: todayOrders.length,
    avg_basket: valid.length ? Math.round((sum(valid) / valid.length) * 100) / 100 : 0,
    ca_livraison: sum(livraison),
    ca_emporter: sum(emporter),
    count_livraison: livraison.length,
    count_emporter: emporter.length,
    total_discount: totalDiscount,
    clients_count: new Set(valid.map(o => (o.client_phone || '').replace(/\s/g, '')).filter(Boolean)).size,
    top_items: topItems,
  });
});

app.get('/api/orders', (req, res) => {
  const { status, date } = req.query;
  const db = readDB();
  let orders = [...db.orders].reverse();
  if (status) orders = orders.filter(o => o.status === status);
  if (date) orders = orders.filter(o => o.created_at.startsWith(date));
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  res.json(order);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['en_attente', 'en_preparation', 'pret', 'livre', 'annule'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  const db = readDB();
  const order = db.orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  order.status = status;
  writeDB(db);
  res.json(order);
});

app.get('/api/creneaux', (req, res) => {
  const slots = [];
  const add = (h, m) => slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  for (let h = 11; h < 14; h++) { add(h, 0); add(h, 30); }
  add(14, 0);
  for (let h = 18; h < 22; h++) { add(h, 0); add(h, 30); }
  add(22, 0);
  res.json(slots);
});


/* ========================================================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  ✦ Nexa IA — site lancé sur http://localhost:${PORT}`);
  console.log(`  ✦ Back-office des demandes : http://localhost:${PORT}/admin\n`);
});
