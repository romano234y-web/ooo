const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('orders.db');

// Init DB
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('emporter', 'livraison')),
    adresse TEXT,
    creneau TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'en_attente',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Générer un numéro de commande unique
function genNumero() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `RP${pad(now.getHours())}${pad(now.getMinutes())}-${Math.floor(Math.random() * 900 + 100)}`;
}

// Créer une commande
app.post('/api/orders', (req, res) => {
  const { client_name, client_phone, type, adresse, creneau, items, total, notes } = req.body;
  if (!client_name || !client_phone || !type || !creneau || !items || total === undefined) {
    return res.status(400).json({ error: 'Champs manquants' });
  }
  if (type === 'livraison' && !adresse) {
    return res.status(400).json({ error: 'Adresse requise pour la livraison' });
  }
  const numero = genNumero();
  const stmt = db.prepare(`
    INSERT INTO orders (numero, client_name, client_phone, type, adresse, creneau, items, total, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(numero, client_name, client_phone, type, adresse || null, creneau, JSON.stringify(items), total, notes || null);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  order.items = JSON.parse(order.items);
  res.status(201).json(order);
});

// Lister les commandes (back-office)
app.get('/api/orders', (req, res) => {
  const { status, date } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (date) { sql += ' AND DATE(created_at) = ?'; params.push(date); }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  rows.forEach(r => { r.items = JSON.parse(r.items); });
  res.json(rows);
});

// Mettre à jour le statut
app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['en_attente', 'en_preparation', 'pret', 'livre', 'annule'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Commande introuvable' });
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  order.items = JSON.parse(order.items);
  res.json(order);
});

// Détail d'une commande
app.get('/api/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  order.items = JSON.parse(order.items);
  res.json(order);
});

// Créneaux disponibles (30 min, de 11h à 14h et 18h à 22h)
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
