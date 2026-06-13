const MENU = {
  pizzas_tomate: {
    label: '🍕 Pizzas Base Tomate',
    sizes: true,
    items: [
      { id: 'burger_p', name: 'Burger', desc: 'Tomate, fromage, viande hachée, poivrons, cheddar' },
      { id: 'calzone', name: 'Calzone', desc: 'Tomate, fromage, jambon, champignons, œuf' },
      { id: 'canibale', name: 'Canibale', desc: 'Tomate, fromage, viande hachée, poulet, merguez, olives' },
      { id: 'hawaienne', name: 'Hawaïenne', desc: 'Tomate, fromage, jambon, ananas' },
      { id: 'indienne', name: 'Indienne 🆕', desc: 'Sauce curry, fromage, poulet, poivrons, oignons' },
      { id: 'margherita', name: 'Margherita', desc: 'Tomate, fromage, olives' },
      { id: 'neptune', name: 'Neptune', desc: 'Tomate, fromage, thon, poivrons, oignons' },
      { id: 'orientale', name: 'Orientale', desc: 'Tomate, fromage, merguez, poivrons, olives, œuf' },
      { id: 'reine', name: 'Reine', desc: 'Tomate, fromage, jambon, champignons' },
      { id: 'royale', name: 'Royale', desc: 'Tomate, fromage, merguez, viande hachée, poivrons, olives' },
      { id: 'western', name: 'Western 🆕', desc: 'Sauce BBQ, fromage, chorizo, lardons, oignons' },
      { id: '4fromages', name: '4 Fromages', desc: 'Tomate, assortiment de 4 fromages' },
    ]
  },
  pizzas_creme: {
    label: '🍕 Pizzas Base Crème Fraîche',
    sizes: true,
    items: [
      { id: 'boursin', name: 'Boursin', desc: 'Crème fraîche, fromage, boursin, viande hachée' },
      { id: 'chevre_miel', name: 'Chèvre Miel', desc: 'Crème fraîche, fromage, chèvre, miel' },
      { id: 'chicken', name: 'Chicken', desc: 'Crème fraîche, fromage, poulet, pommes de terre' },
      { id: 'kebab', name: 'Kebab 🆕', desc: 'Crème fraîche, fromage, émincés de kebab, poivrons, oignons' },
      { id: 'normande', name: 'Normande', desc: 'Crème fraîche, fromage, jambon, camembert, champignons' },
      { id: 'norvegienne', name: 'Norvégienne', desc: 'Crème fraîche, fromage, saumon, citron' },
      { id: 'raclette', name: 'Raclette', desc: 'Crème fraîche, fromage, jambon, pommes de terre, raclette' },
      { id: 'rpizz', name: "R'pizz", desc: 'Crème fraîche/moutarde, fromage, poulet, pommes de terre, raclette, oignons' },
      { id: 'tartiflette', name: 'Tartiflette', desc: 'Crème fraîche, fromage, lardons, reblochon, pommes de terre, oignons' },
    ]
  },
  burgers: {
    label: '🍔 Nos Burgers',
    sizes: false,
    note: 'Menu avec frites et boisson +2,50€',
    items: [
      { id: 'b_classic', name: 'Le Classic', desc: 'Steak, bacon, sauce burger, cheddar, salade, tomate, oignons', price: 8.00 },
      { id: 'b_raclette', name: 'La Raclette', desc: 'Steak, bacon, sauce burger, raclette, salade, tomate', price: 8.00 },
      { id: 'b_bburger', name: "Le B'Burger", desc: 'Steak, bacon, sauce burger, cheddar, salade, tomate', price: 8.00 },
      { id: 'b_chevremiel', name: 'Le Chèvre Miel', desc: 'Moutarde/miel, salami, chèvre, tomate, salade', price: 8.00 },
      { id: 'b_rpizz', name: "R'pizz Burger", desc: 'Steak, bacon, sauce maison, fromages, oignons', price: 8.00 },
    ]
  },
  paninis: {
    label: '🥖 Nos Paninis',
    sizes: false,
    note: 'Avec boisson 33cl',
    items: [
      { id: 'pan_saumon', name: 'Saumon', desc: 'Panini au saumon', price: 6.50 },
      { id: 'pan_jambon', name: 'Jambon', desc: 'Panini au jambon', price: 6.50 },
      { id: 'pan_4from', name: '4 Fromages', desc: 'Panini 4 fromages fondus', price: 6.50 },
      { id: 'pan_viande', name: 'Viande Hachée', desc: 'Panini à la viande hachée', price: 6.50 },
      { id: 'pan_poulet', name: 'Poulet', desc: 'Panini au poulet', price: 6.50 },
    ]
  },
  petites_faims: {
    label: '🧀 Petites Faims',
    sizes: false,
    note: 'x6 pièces',
    items: [
      { id: 'mozza', name: 'Mozzarella Sticks', desc: '6 pièces', price: 6.00 },
      { id: 'camembert', name: 'Bouchées Camembert', desc: '6 pièces', price: 6.00 },
      { id: 'nuggets', name: 'Nuggets', desc: '6 pièces', price: 6.00 },
      { id: 'tenders', name: 'Tenders', desc: '6 pièces', price: 7.00 },
      { id: 'wings', name: 'Chicken Wings', desc: '6 pièces', price: 6.00 },
      { id: 'oignons', name: 'Oignons Rings', desc: '6 pièces', price: 6.00 },
      { id: 'jalapenos', name: 'Jalapeños', desc: '6 pièces', price: 7.00 },
    ]
  },
  desserts: {
    label: '🍮 Desserts',
    sizes: false,
    items: [
      { id: 'tiramisu', name: 'Tiramisu', desc: 'Fait maison', price: 3.00 },
      { id: 'tarte_daim', name: 'Tarte aux Daims', desc: '', price: 3.00 },
      { id: 'glace', name: 'Glace Häagen-Dazs', desc: '100ml', price: 3.50 },
    ]
  },
  boissons: {
    label: '🥤 Boissons',
    sizes: false,
    items: [
      { id: 'canette', name: 'Canette 33cl', desc: 'Assortiment', price: 1.50 },
      { id: 'chill', name: 'Les Chill', desc: 'Boisson fraîche', price: 2.00 },
      { id: 'redbull', name: 'Red Bull', desc: '25cl', price: 2.50 },
      { id: 'bouteille', name: 'Bouteille 1,5L', desc: 'Eau plate ou gazeuse', price: 3.00 },
      { id: 'eau', name: 'Eau 50cl', desc: '', price: 1.00 },
      { id: 'cristaline', name: 'Cristaline', desc: 'Fraise ou pêche', price: 2.00 },
    ]
  }
};

const PIZZA_SIZES = [
  { key: 'junior', label: 'Junior', price: 8.00 },
  { key: 'senior', label: 'Senior', price: 10.00 },
  { key: 'mega', label: 'Méga', price: 15.00 },
];
