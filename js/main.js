/* GSF Global Logistics — interacciones */
(function () {
  "use strict";

  /* ===== CONFIGURACIÓN DE FORMULARIOS =====
     Coloque aquí el endpoint que recibirá los formularios
     (por ejemplo, un script PHP propio, Formspree, Getform, etc.).
     Si se deja vacío, el formulario abre el cliente de correo del
     usuario con los datos prellenados hacia info@gsfcargo.com. */
  var FORM_ENDPOINT = "";
  var CONTACT_EMAIL = "info@gsfcargo.com";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Año del footer */
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* Header al hacer scroll + CTA móvil */
  var header = $("#header"), mcta = $(".mobile-cta");
  function onScroll() {
    var sc = window.scrollY > 40;
    header.classList.toggle("is-scrolled", sc);
    if (mcta) mcta.classList.toggle("is-visible", window.scrollY > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Menú móvil */
  var nav = $("#nav"), toggle = $("#navToggle");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open);
    toggle.innerHTML = '<svg class="ico ico--lg"><use href="#i-' + (open ? "x" : "menu") + '"/></svg>';
  }
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });

  /* Sección activa en el menú */
  var links = $$(".nav a[href^='#']:not(.btn)");
  var sections = links.map(function (l) { return $(l.getAttribute("href")); }).filter(Boolean);
  if ("IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.toggle("is-active", l.getAttribute("href") === "#" + e.target.id); });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { so.observe(s); });

    /* Animaciones de aparición */
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (el, i) {
      el.style.transitionDelay = (i % 5) * 70 + "ms";
      ro.observe(el);
    });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Slider del hero */
  var slides = $$(".hero__slide"), dotsWrap = $("#heroDots"), cur = 0, timer;
  function go(n) {
    slides[cur].classList.remove("is-active");
    dotsWrap.children[cur].classList.remove("is-active");
    cur = (n + slides.length) % slides.length;
    slides[cur].classList.add("is-active");
    dotsWrap.children[cur].classList.add("is-active");
  }
  function play() { clearInterval(timer); timer = setInterval(function () { go(cur + 1); }, 6000); }
  slides.forEach(function (_, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Imagen " + (i + 1));
    if (i === 0) b.className = "is-active";
    b.addEventListener("click", function () { go(i); play(); });
    dotsWrap.appendChild(b);
  });
  if (slides.length > 1) play();

  /* Contadores */
  $$("[data-count]").forEach(function (el) {
    var end = parseInt(el.getAttribute("data-count"), 10);
    var start = end > 1000 ? end - 40 : 0, done = false;
    function run() {
      if (done) return; done = true;
      var t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / 1400, 1);
        el.textContent = Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { run(); o.disconnect(); } }, { threshold: .6 }).observe(el);
    }
  });

  /* Formularios */
  var labels = { origen: "Origen", destino: "Destino", servicio: "Servicio", nombre: "Nombre", empresa: "Empresa", correo: "Correo", telefono: "Teléfono", mensaje: "Mensaje" };
  function validate(form) {
    var ok = true;
    $$("[required]", form).forEach(function (f) {
      var valid = f.value.trim() !== "" && (f.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
      var wrap = f.closest(".field");
      if (wrap) wrap.classList.toggle("is-invalid", !valid);
      if (!valid && ok) { f.focus(); ok = false; }
    });
    return ok;
  }
  function success(form) {
    var s = $(".form-success", form);
    if (s) s.hidden = false;
    form.reset();
    if (window.dataLayer) window.dataLayer.push({ event: "form_submit", form_type: form.getAttribute("data-form") });
  }
  $$("form[data-form]").forEach(function (form) {
    form.addEventListener("input", function (e) {
      var w = e.target.closest(".field"); if (w) w.classList.remove("is-invalid");
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var type = form.getAttribute("data-form");
      var data = new FormData(form);
      data.append("tipo_formulario", type);

      if (FORM_ENDPOINT) {
        var btn = $("button[type=submit]", form); if (btn) btn.disabled = true;
        fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } })
          .then(function () { success(form); })
          .catch(function () { alert("No pudimos enviar su solicitud. Por favor llámenos o escriba a " + CONTACT_EMAIL); })
          .finally(function () { if (btn) btn.disabled = false; });
        return;
      }
      /* Respaldo: mailto */
      var subject = type === "quote" ? "Solicitud de cotización" : type === "newsletter" ? "Suscripción a noticias" : "Mensaje desde el sitio web";
      var body = "";
      data.forEach(function (v, k) { if (k !== "tipo_formulario" && v) body += (labels[k] || k) + ": " + v + "\n"; });
      window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      success(form);
    });
  });
})();
