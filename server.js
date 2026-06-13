const express = require('express');
const path = require('path');
const fs = require('fs');

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

// Créer une commande
app.post('/api/orders', (req, res) => {
  const { client_name, client_phone, type, adresse, creneau, items, total, notes } = req.body;
  if (!client_name || !client_phone || !type || !creneau || !items || total === undefined) {
    return res.status(400).json({ error: 'Champs manquants' });
  }
  if (type === 'livraison' && !adresse) {
    return res.status(400).json({ error: 'Adresse requise pour la livraison' });
  }
  const db = readDB();
  const order = {
    id: db.nextId++,
    numero: genNumero(),
    client_name, client_phone, type,
    adresse: adresse || null,
    creneau, items, total,
    notes: notes || null,
    status: 'en_attente',
    created_at: new Date().toISOString()
  };
  db.orders.push(order);
  writeDB(db);
  res.status(201).json(order);
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
