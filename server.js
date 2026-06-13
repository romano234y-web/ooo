const express = require('express');
const path = require('path');
const fs = require('fs');
const Promo = require('./public/promo.js');

const app = express();
const DB_FILE = path.join(__dirname, 'orders.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) return { orders: [], nextId: 1 };
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return { orders: [], nextId: 1 }; }
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route propre pour le back office
app.get('/backoffice', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'backoffice.html'));
});

function genNumero() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `RP${pad(now.getHours())}${pad(now.getMinutes())}-${Math.floor(Math.random() * 900 + 100)}`;
}

// Aperçu des promos (avant validation, pour affichage côté client)
app.post('/api/promo-preview', (req, res) => {
  const { items, type } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Items invalides' });
  const promo = Promo.compute(items, type || 'emporter');
  promo.livraisonAllowed = Promo.livraisonAllowed(items);
  promo.minLivraison = Promo.MIN_LIVRAISON;
  res.json(promo);
});

// Créer une commande
app.post('/api/orders', (req, res) => {
  const { client_name, client_phone, type, adresse, creneau, items, notes } = req.body;
  if (!client_name || !client_phone || !type || !creneau || !items || !items.length) {
    return res.status(400).json({ error: 'Champs manquants' });
  }
  if (type === 'livraison' && !adresse) {
    return res.status(400).json({ error: 'Adresse requise pour la livraison' });
  }
  // Livraison : minimum 20€
  if (type === 'livraison' && !Promo.livraisonAllowed(items)) {
    return res.status(400).json({ error: `La livraison nécessite un minimum de ${Promo.MIN_LIVRAISON}€ de commande` });
  }

  // Recalcul autoritaire des promos côté serveur
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

// Base de données clients (agrégée par téléphone)
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
    c.name = o.client_name; // dernier nom connu
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

// Statistiques / Chiffre d'affaires
app.get('/api/stats', (req, res) => {
  const db = readDB();
  const valid = db.orders.filter(o => o.status !== 'annule');
  const today = new Date().toISOString().split('T')[0];

  const sum = arr => Math.round(arr.reduce((s, o) => s + (o.total || 0), 0) * 100) / 100;

  const todayOrders = valid.filter(o => o.created_at.startsWith(today));
  const livraison = valid.filter(o => o.type === 'livraison');
  const emporter = valid.filter(o => o.type === 'emporter');

  // Top articles
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

// Lister les commandes
app.get('/api/orders', (req, res) => {
  const { status, date } = req.query;
  const db = readDB();
  let orders = [...db.orders].reverse();
  if (status) orders = orders.filter(o => o.status === status);
  if (date) orders = orders.filter(o => o.created_at.startsWith(date));
  res.json(orders);
});

// Détail d'une commande
app.get('/api/orders/:id', (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  res.json(order);
});

// Mettre à jour le statut
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

// Créneaux disponibles
app.get('/api/creneaux', (req, res) => {
  const slots = [];
  const add = (h, m) => slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  for (let h = 11; h < 14; h++) { add(h, 0); add(h, 30); }
  add(14, 0);
  for (let h = 18; h < 22; h++) { add(h, 0); add(h, 30); }
  add(22, 0);
  res.json(slots);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`R'pizz démarré sur http://localhost:${PORT}`));
