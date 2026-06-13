/* ════════════════════════════════════════════════
   Moteur de promotions R'pizz — partagé client/serveur
   - Emporter : 1 pizza achetée = 1 offerte (par paire)
   - Livraison : par groupe de 3 pizzas, 2ème à -50%, 3ème offerte
   - Livraison minimum : 20€
════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Promo = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const MIN_LIVRAISON = 20;

  // Un article est une pizza si son id contient une taille (ex: "margherita|senior")
  function isPizza(item) {
    return typeof item.id === 'string' && item.id.includes('|');
  }

  function round(n) { return Math.round(n * 100) / 100; }

  // items: [{ id, name, qty, price }]
  // type: 'emporter' | 'livraison'
  function compute(items, type) {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

    // Déplier les pizzas en unités individuelles
    let units = [];
    items.forEach(i => {
      if (isPizza(i)) {
        for (let k = 0; k < i.qty; k++) units.push({ name: i.name, price: i.price });
      }
    });
    // Trier de la plus chère à la moins chère (on offre/réduit les moins chères)
    units.sort((a, b) => b.price - a.price);

    let discount = 0;
    const details = [];

    units.forEach((u, idx) => {
      if (type === 'emporter') {
        // Une sur deux offerte
        if (idx % 2 === 1) {
          discount += u.price;
          details.push(`🎁 ${u.name} offerte (-${round(u.price)}€)`);
        }
      } else if (type === 'livraison') {
        // Par groupe de 3 : 2ème -50%, 3ème offerte
        const pos = idx % 3;
        if (pos === 1) {
          discount += u.price * 0.5;
          details.push(`➖ ${u.name} à -50% (-${round(u.price * 0.5)}€)`);
        } else if (pos === 2) {
          discount += u.price;
          details.push(`🎁 ${u.name} offerte (-${round(u.price)}€)`);
        }
      }
    });

    discount = round(discount);
    const total = round(subtotal - discount);

    return {
      subtotal: round(subtotal),
      discount,
      total,
      details,
      pizzaCount: units.length,
    };
  }

  function livraisonAllowed(items) {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    return subtotal >= MIN_LIVRAISON;
  }

  return { compute, livraisonAllowed, isPizza, MIN_LIVRAISON };
});
