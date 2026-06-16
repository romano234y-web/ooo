/* =========================================================
   NEXA IA — Scripts
   ========================================================= */

/* ▼▼▼  À PERSONNALISER — remplace par tes vraies infos  ▼▼▼ */
const CONFIG = {
  // Lien de réservation Calendly (ou autre). Ex : "https://calendly.com/romain/30min"
  CALENDLY_URL: "https://calendly.com/ton-compte/audit-30min",
  // Numéro WhatsApp au format international SANS + ni espaces. Ex : "33612345678"
  WHATSAPP_NUMBER: "33600000000",
  // Message pré-rempli WhatsApp
  WHATSAPP_MESSAGE: "Bonjour Romain, je souhaite automatiser mon entreprise avec l'IA.",
  // Email de contact
  EMAIL: "romano234y@outlook.fr",
};
/* ▲▲▲  Fin de la zone à personnaliser  ▲▲▲ */

(function () {
  "use strict";

  /* ---------- Année footer ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Navbar : ombre au scroll ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  const burger = document.getElementById("burger");
  const mobilemenu = document.getElementById("mobilemenu");
  const toggleMenu = (force) => {
    const open = force !== undefined ? force : !burger.classList.contains("open");
    burger.classList.toggle("open", open);
    mobilemenu.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    mobilemenu.setAttribute("aria-hidden", String(!open));
  };
  burger.addEventListener("click", () => toggleMenu());
  mobilemenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => toggleMenu(false))
  );

  /* ---------- CTA dynamiques (Calendly / WhatsApp / Email) ---------- */
  const waLink = () =>
    `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(CONFIG.WHATSAPP_MESSAGE)}`;

  document.querySelectorAll("[data-cta]").forEach((el) => {
    const type = el.getAttribute("data-cta");
    if (type === "calendly") {
      el.setAttribute("href", CONFIG.CALENDLY_URL);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    } else if (type === "whatsapp") {
      el.setAttribute("href", waLink());
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    } else if (type === "email") {
      const email = el.getAttribute("data-email") || CONFIG.EMAIL;
      el.setAttribute("href", `mailto:${email}`);
    }
  });

  /* ---------- Scroll reveal ---------- */
  const reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Compteurs animés ---------- */
  const counters = document.querySelectorAll("[data-count]");
  const animateCount = (el) => {
    const target = parseFloat(el.getAttribute("data-count"));
    const prefix = (el.getAttribute("data-prefix") || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const suffix = el.getAttribute("data-suffix") || "";
    const dur = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            co.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => co.observe(el));
  } else {
    counters.forEach(animateCount);
  }

  /* ---------- Formulaire de contact ---------- */
  const form = document.getElementById("leadForm");
  const statusEl = document.getElementById("formStatus");
  const submitBtn = document.getElementById("leadSubmit");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      statusEl.textContent = "";
      statusEl.className = "form__status";

      const data = Object.fromEntries(new FormData(form).entries());

      if (!data.name || !data.email || !data.message) {
        statusEl.textContent = "Merci de remplir au moins le nom, l'email et votre besoin.";
        statusEl.classList.add("err");
        return;
      }

      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = "Envoi en cours…";

      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset();
        statusEl.textContent = "✓ Merci ! Votre demande a bien été envoyée. Je vous recontacte sous 24h.";
        statusEl.classList.add("ok");
      } catch (err) {
        statusEl.textContent =
          "Une erreur est survenue. Réessayez ou écrivez-moi directement à " + CONFIG.EMAIL + ".";
        statusEl.classList.add("err");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });
  }
})();
