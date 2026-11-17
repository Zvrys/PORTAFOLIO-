/* =========================================================
   Motor del sitio: lee js/datos.js, dibuja las páginas y
   aplica las animaciones a todo el contenido automáticamente.
   ========================================================= */
(() => {
  let D = window.PORTFOLIO || { sitio: {}, proyectos: [] };
  let EDIT = false;
  try { EDIT = sessionStorage.getItem("editar") === "1"; } catch {}
  // Edición en línea: mientras se edita se trabaja sobre el borrador guardado en este navegador
  if (EDIT) try { const b = JSON.parse(localStorage.getItem("ocre-borrador") || "null"); if (b && b.datos && Array.isArray(b.datos.proyectos)) D = b.datos; } catch {}
  const S = D.sitio || {};
  const P = (D.proyectos || []).filter((p) => EDIT || !p.oculto);
  window.SITIO = { D, EDIT, proyecto: null };
  // La banda de texto en movimiento tiene sus propios textos (al principio copia los servicios)
  if (EDIT && !Array.isArray(S.banda)) S.banda = [...(S.servicios || [])];
  if (EDIT) document.body.classList.add("editando");
  const pagina = document.body.dataset.pagina;
  const main = document.getElementById("main");
  const telon = document.querySelector(".telon");

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const dos = (n) => String(n).padStart(2, "0");
  const esVideo = (r) => /\.(mp4|webm|mov)$/i.test(r || "");
  const parrafos = (t) => String(t || "").split(/\n\s*\n/).filter(Boolean).map((x) => `<p>${esc(x.trim())}</p>`).join("");
  const urlProy = (p) => `proyecto.html?id=${encodeURIComponent(p.id)}`;
  // Marcas para el modo edición: e() en textos, ei() en imágenes
  const e = (ruta) => (EDIT ? ` data-e="${esc(ruta)}"` : "");
  const ei = (ruta) => (EDIT ? ` data-ei="${esc(ruta)}"` : "");
  const pe = (p, c) => e(`proyectos.${p.id}.${c}`);
  const multi = (t, ruta) => (EDIT ? `<div class="texto" data-rev="sube" data-multi${e(ruta)}>${esc(t)}</div>` : `<div class="texto" data-rev="sube">${parrafos(t)}</div>`);
  const meta = (...v) => v.filter(Boolean).map(esc).join(" — ");

  const medio = (ruta, alt = "", pronto = false) =>
    !ruta ? "" : esVideo(ruta)
      ? `<video src="${esc(ruta)}" autoplay muted loop playsinline></video>`
      : `<img src="${esc(ruta)}" alt="${esc(alt)}" ${pronto ? "" : 'loading="lazy"'} decoding="async">`;

  const marco = (ruta, alt = "", clase = "", extra = "", pronto = false) =>
    `<div class="marco ${clase}" data-rev ${extra}><div class="marco-in" data-par>${medio(ruta, alt, pronto)}</div></div>`;

  /* ---------- Animaciones de entrada ---------- */
  function partir(el) {
    if (EDIT) return;
    const texto = el.textContent.trim();
    el.setAttribute("aria-label", texto);
    el.innerHTML = texto
      .split(/\s+/)
      .map((w, i) => `<span class="pal" aria-hidden="true"><span class="pal-i" style="--i:${Math.min(i, 28)}">${esc(w)}</span></span>`)
      .join(" ");
  }

  // Una imagen no se revela hasta que ha terminado de cargar (importante con renders pesados)
  function mostrar(el) {
    const im = el.classList.contains("marco") && el.querySelector("img");
    if (im && !im.complete) {
      const ya = () => el.classList.add("visible");
      im.loading = "eager"; // oculta por la máscara, la carga diferida no arrancaría sola
      setTimeout(ya, 4000);
      im.addEventListener("load", ya, { once: true });
      im.addEventListener("error", ya, { once: true });
    } else el.classList.add("visible");
  }
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => {
      if (e.isIntersecting) { mostrar(e.target); io.unobserve(e.target); }
    }),
    { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
  );

  let pars = [];
  function activar(raiz = document) {
    $$("[data-partir]", raiz).forEach((el) => { if (!el.dataset.ok) { partir(el); el.dataset.ok = "1"; } });
    $$("[data-rev]", raiz).forEach((el) => { if (EDIT) el.classList.add("visible"); else if (!el.closest(".pie")) io.observe(el); });
    registrar();
    if (EDIT) dispatchEvent(new Event("pintado"));
    pars = $$("[data-par]");
    parallax();
  }

  function parallax() {
    const vh = innerHeight;
    for (const el of pars) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      el.style.transform = `translate3d(0,${(-p * r.height * 0.08).toFixed(1)}px,0)`;
    }
  }

  /* ---------- Animaciones ligadas al scroll ----------
     Cada elemento con data-s recibe la variable CSS --p (suavizada).
     El movimiento en sí está definido en css/estilo.css. */
  const QUIETO = EDIT; // en modo edición la página se queda quieta
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const OBJETIVO = {
    top: () => clamp(scrollY / innerHeight),
    abre: (r, vh) => clamp((vh - r.top) / (vh * 0.75)),
    centro: (r, vh) => clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1),
    pin: (r, vh) => clamp(-r.top / Math.max(1, r.height - vh)),
    lee: (r, vh) => clamp((vh * 0.9 - r.top) / (vh * 0.55 + r.height)),
    pie: (r, vh) => clamp((vh - main.getBoundingClientRect().bottom) / Math.max(1, r.height)),
  };
  let scrubs = [], bandaIn = null, bandaMitad = 1, cab = null, prog = null, pie = null;
  function medir() {
    const hz = $(".hz"), pista = $(".hz-pista");
    if (hz && pista && !QUIETO) hz.style.setProperty("--dist", Math.max(0, pista.scrollWidth - innerWidth));
    bandaIn = $(".banda-in");
    if (bandaIn) bandaMitad = Math.max(1, bandaIn.scrollWidth / 2);
  }
  function registrar() {
    cab = $(".cabecera"); prog = $(".progreso"); pie = $(".pie");
    if (!QUIETO) {
      $$("[data-leer]").forEach((el) => {
        if (el.dataset.s) return;
        const pals = el.textContent.trim().split(/\s+/);
        el.setAttribute("aria-label", pals.join(" "));
        el.style.setProperty("--n", pals.length);
        el.innerHTML = pals.map((w, i) => `<span class="w" aria-hidden="true" style="--i:${i}">${esc(w)}</span>`).join(" ");
        el.dataset.s = "lee";
      });
      const antes = new Map(scrubs.map((s) => [s.el, s]));
      scrubs = $$("[data-s]").map((el) => antes.get(el) || { el, tipo: el.dataset.s, v: null });
    }
    medir();
  }
  addEventListener("resize", medir);
  addEventListener("load", medir);

  let ultimoY = scrollY, vel = 0, bandaX = 0, bandaDir = 1, pieVisto = false;
  function cuadro() {
    const vh = innerHeight, y = scrollY;
    for (const s of scrubs) {
      const r = s.el.getBoundingClientRect();
      if (s.v !== null && s.tipo !== "top" && s.tipo !== "pie" && (r.bottom < -vh || r.top > vh * 2)) continue;
      const t = OBJETIVO[s.tipo](r, vh);
      s.v = s.v === null || Math.abs(t - s.v) < 0.0005 ? t : s.v + (t - s.v) * 0.11;
      if (s.v !== s.puesto) { s.el.style.setProperty("--p", s.v.toFixed(4)); s.puesto = s.v; }
    }
    parallax();

    const d = y - ultimoY;
    vel += (d - vel) * 0.14;
    if (cab && Math.abs(d) > 2) cab.classList.toggle("oculta", d > 0 && y > 200);
    ultimoY = y;

    // La banda de texto corre sola y acelera / cambia de sentido con el scroll
    if (bandaIn && !EDIT) {
      if (Math.abs(vel) > 0.6) bandaDir = vel > 0 ? 1 : -1;
      bandaX = (((bandaX + (0.7 + Math.min(Math.abs(vel), 90) * 0.4) * bandaDir) % bandaMitad) + bandaMitad) % bandaMitad;
      bandaIn.style.transform = `translate3d(${(-bandaX).toFixed(1)}px,0,0) skewX(${clamp(vel * -0.14, -8, 8).toFixed(2)}deg)`;
    }
    if (prog) prog.style.transform = `scaleX(${clamp(y / Math.max(1, document.documentElement.scrollHeight - vh)).toFixed(4)})`;
    if (pie && !pieVisto && document.body.classList.contains("listo") && main.getBoundingClientRect().bottom < vh * 0.75) {
      pieVisto = true;
      $$("[data-rev]", pie).forEach((el) => el.classList.add("visible"));
    }
    requestAnimationFrame(cuadro);
  }

  const kin = (t) => `<div class="kin" data-s="centro" aria-hidden="true"><div class="kin-in">${`<span>${esc(t)}</span>`.repeat(5)}</div></div>`;

  /* ---------- Cabecera y pie (comunes) ---------- */
  function cromo() {
    document.body.insertAdjacentHTML("afterbegin", `
      <div class="progreso" aria-hidden="true"></div>
      <header class="cabecera etiqueta">
        <a class="cab-marca" href="index.html"${e("sitio.nombre")}>${esc(S.nombre)}</a>
        <nav>
          <a class="enlace" href="index.html#proyectos">Proyectos</a>
          <a class="enlace" href="index.html#estudio">Estudio</a>
          <a class="enlace" href="#contacto">Contacto</a>
        </nav>
        <span class="cab-fin m-no">${esc(S.ciudad)}</span>
      </header>`);
    const ig = String(S.instagram || "").replace(/^@/, "");
    main.insertAdjacentHTML("afterend", `
      <footer class="pie" id="contacto" data-s="pie">
        <div class="pie-in">
          <span class="etiqueta" data-rev="sube">Contacto</span>
          <a class="pie-titulo" href="mailto:${esc(S.email)}" data-partir data-rev${e("sitio.contactoTitulo")}>${esc(S.contactoTitulo || "Hablemos")}</a>
          <div class="pie-cols etiqueta" data-rev="sube">
            <div><span class="gris">Correo</span><a class="enlace" href="mailto:${esc(S.email)}"${e("sitio.email")}>${esc(S.email)}</a></div>
            ${ig || EDIT ? `<div><span class="gris">Instagram</span><a class="enlace" target="_blank" rel="noopener" href="https://instagram.com/${esc(ig)}"${e("sitio.instagram")}>@${esc(ig)}</a></div>` : "<div></div>"}
            <div><span class="gris">Ubicación</span><span${e("sitio.ciudad")}>${esc(S.ciudad)}</span></div>
            <div class="pie-fin"><span class="gris">© ${new Date().getFullYear()} ${esc(S.nombre)}</span><a class="enlace" href="#arriba">Volver arriba</a></div>
          </div>
        </div>
      </footer>
      <div class="cursor etiqueta" aria-hidden="true"></div>`);
  }

  /* Reparte elementos en filas de 3 (o 2), sin dejar uno solo al final si se puede evitar */
  function enFilas(lista) {
    const filas = [];
    for (let i = 0; i < lista.length; ) {
      const quedan = lista.length - i;
      const n = quedan === 4 || quedan === 2 ? 2 : Math.min(3, quedan);
      filas.push(lista.slice(i, i + n));
      i += n;
    }
    return filas;
  }
  const ANCHOS3 = [[2, 1, 1], [1, 1, 2], [1, 2, 1]], ANCHOS2 = [[3, 2], [2, 3]];
  const DERIVA = [-34, 26, -14], ENTRADA = ["", "r-centro", "r-izq"];

  /* ---------- Inicio ---------- */
  let alListo = () => {};

  function inicio() {
    document.title = `${S.nombre} — ${S.rol}`;
    const dest = P.filter((p) => p.destacado);
    const H = (dest.length ? dest : P).slice(0, 8);
    const tipos = [...new Set(P.map((p) => p.tipo).filter(Boolean))];
    const serv = S.servicios || [];
    const G = S.galeria || [];
    const B = Array.isArray(S.banda) ? S.banda : serv;
    const REPS = B.length ? 2 * Math.max(2, Math.ceil(6 / B.length)) : 0; // número par: el bucle se repite a la mitad

    main.innerHTML = `
      <section class="hero" data-s="top">
        <div class="hero-lienzo">
          ${H.map((p) => `<div class="slide"${ei(`proyectos.${p.id}.portada`)}>${medio(p.portada, p.titulo, true)}</div>`).join("")}
        </div>
        <a class="hero-pie" href="#">
          <span class="rot grande hero-titulo"></span>
          <span class="hero-resumen"></span>
        </a>
        <div class="hero-puntos">${H.map((p, i) => `<button data-n="${i}" aria-label="Proyecto ${i + 1}"></button>`).join("")}</div>
      </section>

      <div class="cuerpo">
        <section class="seccion contenedor centro manifiesto">
          <span class="etiqueta gris" data-rev="sube"${e("sitio.rol")}>${esc(S.rol)}</span>
          <p class="lead grande" data-leer${e("sitio.lema")}>${esc(S.lema)}</p>
        </section>

        <section class="contenedor" id="proyectos" style="padding-bottom:var(--seccion)">
          <div class="barra-proy">
            <h2 class="sr">Proyectos</h2>
            <div class="controles etiqueta" data-rev="sube">
              ${["Todos", ...tipos].map((t, i) => `<button class="chip enlace ${i ? "" : "activo"}" data-filtro="${esc(t)}">${esc(t)}</button>`).join("")}
              <span class="sep"></span>
              <button class="chip enlace activo" data-modo="galeria">Galería</button>
              <button class="chip enlace" data-modo="indice">Índice</button>
            </div>
          </div>
          <div class="vista"></div>
        </section>

        ${G.length || EDIT ? `
        <section class="hz" id="seleccion" data-s="pin">
          <div class="hz-pin">
            <div class="hz-fondo" aria-hidden="true">
              <i class="halo a"></i><i class="halo b"></i>
              <svg viewBox="0 0 3120 1000" preserveAspectRatio="xMinYMid slice">
                ${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 260} 1000V560a130 130 0 0 1 260 0V1000"/><path class="fino" d="M${i * 260 + 45} 1000V575a85 85 0 0 1 170 0V1000"/>`).join("")}
                ${[300, 1150, 2050, 2800].map((cx, i) => [90, 170, 250, 330].map((r) => `<circle class="fino" cx="${cx}" cy="${i % 2 ? 250 : 170}" r="${r}"/>`).join("")).join("")}
                <path d="M0 430H3120"/>
              </svg>
            </div>
            <div class="hz-pista">
              ${G.map((r, i) => `
                <figure class="hz-item t${i % 4}">
                  <div class="hz-img"${ei(`sitio.galeria.${i}`)}>${medio(r, `Imagen ${i + 1}`, EDIT)}</div>
                  <figcaption class="etiqueta">${dos(i + 1)} <span class="gris">/ ${dos(G.length)}</span></figcaption>
                </figure>`).join("")}
            </div>
          </div>
        </section>` : ""}

        <section class="seccion contenedor" id="estudio">
          <h2 class="sr">Estudio</h2>
          <div class="centro" style="margin-block:clamp(2.5rem,5vw,4.5rem) clamp(3rem,7vw,6rem)">
            <p class="lead" data-partir data-rev${e("sitio.sobreTitulo")}>${esc(S.sobreTitulo)}</p>
          </div>
          <div class="estudio">
            <div class="estudio-img" data-s="abre">${marco(S.retrato, S.nombre, "", ei("sitio.retrato"))}</div>
            <div class="estudio-txt">
              ${multi(S.sobre, "sitio.sobre")}
              <ul class="servicios etiqueta">
                ${serv.map((s, i) => `<li data-rev="sube" style="--retraso:${i * 90}ms"><span${e("sitio.servicios." + i)}>${esc(s)}</span><span class="gris">${dos(i + 1)}</span></li>`).join("")}
              </ul>
            </div>
          </div>
        </section>
      </div>
      <div class="previa-flotante" aria-hidden="true"><img alt=""></div>`;

    /* Portada: pase de proyectos */
    const slides = $$(".slide"), hTit = $(".hero-titulo"), hRes = $(".hero-resumen"), hLink = $(".hero-pie"), puntos = $$(".hero-puntos button");
    const TIEMPO = 6500;
    let cur = -1, reloj;
    function ir(n) {
      if (!H.length) return;
      n = (n + H.length) % H.length;
      if (n === cur) return;
      const ant = slides[cur];
      slides.forEach((s) => s.classList.remove("previa"));
      if (ant) { ant.classList.remove("activa"); ant.classList.add("previa"); setTimeout(() => ant.classList.remove("previa"), 1600); }
      slides[n].classList.add("activa");
      puntos.forEach((b, i) => b.classList.toggle("activo", i === n));
      cur = n;
      const p = H[n];
      hLink.href = urlProy(p);
      hLink.classList.remove("visible");
      hTit.textContent = p.titulo;
      hRes.textContent = p.resumen || [p.tipo, p.ubicacion, p.anio].filter(Boolean).join(" — ");
      if (EDIT) { hTit.dataset.e = `proyectos.${p.id}.titulo`; hRes.dataset.e = `proyectos.${p.id}.resumen`; hRes.textContent = p.resumen || ""; }
      partir(hTit);
      void hLink.offsetWidth;
      hLink.classList.add("visible");
      clearTimeout(reloj);
      if (H.length > 1 && !EDIT) reloj = setTimeout(() => ir(cur + 1), TIEMPO);
      if (EDIT) dispatchEvent(new Event("pintado"));
    }
    $(".hero-puntos").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) ir(+b.dataset.n); });
    if (H.length < 2) $(".hero-puntos").style.display = "none";
    alListo = () => ir(0);

    /* Lista de proyectos: galería / índice + filtro */
    const vista = $(".vista");
    let filtro = "Todos", modo = "galeria";
    const tarjeta = (p, f, i) => `
      <a class="tarjeta" data-s="centro" style="--f:${f};--vel:${DERIVA[i % 3]}px;--retraso:${i * 140}ms" href="${urlProy(p)}" data-cursor="Ver">
        ${marco(p.portada, p.titulo, ENTRADA[i % 3], ei(`proyectos.${p.id}.portada`))}
        <div class="tarjeta-pie" data-rev="sube">
          <h3 class="rot"${pe(p, "titulo")}>${esc(p.titulo)}</h3>
          <p class="tarjeta-res gris">${esc(p.resumen)}</p>
          <span class="etiqueta gris">${[p.tipo, p.ubicacion, p.anio].filter(Boolean).map(esc).join(" &nbsp;|&nbsp; ")}</span>
        </div>
      </a>`;
    function pintar() {
      const L = P.filter((p) => filtro === "Todos" || p.tipo === filtro);
      vista.innerHTML = modo === "galeria"
        ? `<div class="galeria">${enFilas(L).map((fila, r) => {
            const a = fila.length === 3 ? ANCHOS3[r % 3] : fila.length === 2 ? ANCHOS2[r % 2] : [1];
            return `<div class="fila-g n${fila.length}">${fila.map((p, i) => tarjeta(p, a[i], i)).join("")}</div>`;
          }).join("")}</div>`
        : `<div class="indice">${L.map((p, i) => `
            <a class="fila" href="${urlProy(p)}" data-prev="${esc(esVideo(p.portada) ? "" : p.portada)}" data-rev="sube" style="--retraso:${i * 60}ms">
              <span class="etiqueta gris">${dos(i + 1)}</span>
              <h3>${esc(p.titulo)}</h3>
              <span class="etiqueta m-no">${esc(p.tipo)}</span>
              <span class="etiqueta m-no">${esc(p.ubicacion)}</span>
              <span class="etiqueta fin">${esc(p.anio)}</span>
            </a>`).join("")}</div>`;
      if (document.body.classList.contains("listo")) activar(vista);
    }
    $(".controles").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b || b.classList.contains("activo")) return;
      const clave = b.dataset.filtro ? "filtro" : "modo";
      $$(`[data-${clave}]`).forEach((x) => x.classList.toggle("activo", x === b));
      if (clave === "filtro") filtro = b.dataset.filtro; else modo = b.dataset.modo;
      vista.classList.add("cambiando");
      setTimeout(() => { pintar(); vista.classList.remove("cambiando"); }, 450);
    });
    pintar();
  }

  /* ---------- Página de proyecto ---------- */
  function proyecto() {
    const id = new URLSearchParams(location.search).get("id");
    const i = Math.max(0, P.findIndex((p) => p.id === id));
    const p = P[i];
    if (!p) { main.innerHTML = `<div class="cuerpo"><section class="seccion contenedor centro"><p class="lead">Aún no hay proyectos publicados.</p></section></div>`; return; }
    const sig = P[(i + 1) % P.length];
    window.SITIO.proyecto = p;
    document.title = `${p.titulo} — ${S.nombre}`;
    const imgs = (p.imagenes || []).filter((r) => r !== p.portada);

    // Láminas: una imagen ancha que se abre, luego una pareja a distinta velocidad, y se repite
    const lam = (n, f, clase = "", extra = "") => marco(imgs[n], `${p.titulo} ${n + 1}`, `lamina ${clase}`, `data-n="${n}" style="--f:${f}" ${extra}` + ei(`proyectos.${p.id}.imagenes.${p.imagenes.indexOf(imgs[n])}`));
    const out = [];
    for (let n = 0, k = 0; n < imgs.length; k++) {
      if (k % 2 === 1 && n + 1 < imgs.length) {
        const a = ANCHOS2[((k - 1) / 2) % 2];
        out.push(`<div class="fila-l par"><div class="deriva" data-s="centro" style="--f:${a[0]};--vel:-36px">${lam(n, 1, "r-izq")}</div><div class="deriva" data-s="centro" style="--f:${a[1]};--vel:36px">${lam(n + 1, 1, "r-centro")}</div></div>`); n += 2;
      } else { out.push(`<div class="fila-l sola" data-s="abre">${lam(n, 1)}</div>`); n++; }
    }
    const dato = (k, v, c, n) => (v || EDIT ? `<li data-rev="sube" style="--retraso:${n * 70}ms"><span class="gris">${k}</span><span${pe(p, c)}>${esc(v)}</span></li>` : "");

    main.innerHTML = `
      <section class="p-hero" data-s="top">${marco(p.portada, p.titulo, "", ei(`proyectos.${p.id}.portada`), true)}</section>
      <div class="cuerpo">
        <section class="seccion contenedor ficha">
          <div class="centro">
            <span class="etiqueta gris" data-rev="sube">Proyecto ${dos(i + 1)}</span>
            <h1 class="rot grande" data-partir data-rev${pe(p, "titulo")}>${esc(p.titulo)}</h1>
            <p class="lead grande" data-leer${pe(p, "resumen")}>${esc(p.resumen)}</p>
          </div>
          <div class="ficha-cols">
            <ul class="ficha-datos etiqueta">
              ${dato("Año", p.anio, "anio", 0)}${dato("Ubicación", p.ubicacion, "ubicacion", 1)}${dato("Tipología", p.tipo, "tipo", 2)}${dato("Cliente", p.cliente, "cliente", 3)}${dato("Superficie", p.superficie, "superficie", 4)}${dato("Estado", p.estado, "estado", 5)}
            </ul>
            ${multi(p.descripcion, `proyectos.${p.id}.descripcion`)}
          </div>
        </section>
        <section class="laminas contenedor">${out.join("")}</section>
        ${sig && sig !== p ? `
        <a class="siguiente" href="${urlProy(sig)}" data-cursor="Ver" data-s="abre">
          ${marco(sig.portada, sig.titulo)}
          <div class="siguiente-txt"><span class="etiqueta">Siguiente proyecto</span><span class="rot grande" data-partir data-rev>${esc(sig.titulo)}</span></div>
        </a>` : ""}
      </div>`;

/* Visor a pantalla completa */
    if (!imgs.length || EDIT) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="visor etiqueta" role="dialog" aria-label="Visor de imágenes">
        <div class="visor-barra arriba"><span class="visor-n"></span><button class="enlace" data-v="x">Cerrar</button></div>
        <div class="visor-medio"></div>
        <div class="visor-barra abajo"><button class="enlace" data-v="-1">Anterior</button><button class="enlace" data-v="1">Siguiente</button></div>
      </div>`);
    const visor = $(".visor"), vm = $(".visor-medio"), vn = $(".visor-n");
    let v = 0;
    const ver = async (n) => {
      v = (n + imgs.length) % imgs.length;
      vm.classList.add("cambia");
      if (visor.classList.contains("on")) await espera(250);
      vm.innerHTML = medio(imgs[v], p.titulo, true);
      vn.textContent = `${dos(v + 1)} / ${dos(imgs.length)}`;
      visor.classList.add("on");
      vm.classList.remove("cambia");
    };
    const cerrar = () => visor.classList.remove("on");
    $(".laminas").addEventListener("click", (e) => { const l = e.target.closest(".lamina"); if (l) ver(+l.dataset.n); });
    visor.addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]");
      if (!b) { if (!e.target.closest("img,video")) cerrar(); return; }
      b.dataset.v === "x" ? cerrar() : ver(v + +b.dataset.v);
    });
    addEventListener("keydown", (e) => {
      if (!visor.classList.contains("on")) return;
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowRight") ver(v + 1);
      if (e.key === "ArrowLeft") ver(v - 1);
    });
  }

  /* ---------- Cursor y vista previa flotante ---------- */
  function puntero() {
    const cursor = $(".cursor"), previa = $(".previa-flotante"), pImg = previa && $("img", previa);
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      const el = e.target instanceof Element ? e.target : null;
      const t = el && el.closest("[data-cursor]");
      cursor.classList.toggle("on", !!t);
      if (t) cursor.textContent = t.dataset.cursor;
      if (previa) {
        const f = el && el.closest(".fila");
        const ruta = f && f.dataset.prev;
        previa.classList.toggle("on", !!ruta);
        if (ruta && pImg.getAttribute("src") !== ruta) { pImg.src = ruta; pImg.classList.add("on"); }
      }
    });
    (function bucle() {
      cx += (mx - cx) * 0.16; cy += (my - cy) * 0.16;
      cursor.style.setProperty("--x", cx.toFixed(1) + "px");
      cursor.style.setProperty("--y", cy.toFixed(1) + "px");
      if (previa) previa.style.transform = `translate3d(${(cx + 28).toFixed(1)}px,${(cy - previa.offsetHeight / 2).toFixed(1)}px,0)`;
      requestAnimationFrame(bucle);
    })();
  }

  /* ---------- Navegación con telón ---------- */
  const limpia = (u) => u.pathname.replace(/index\.html$/, "");
  function irAncla(hash, suave = true) {
    if (hash === "#arriba") { scrollTo({ top: 0, behavior: "smooth" }); return; }
    const el = hash && document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: suave ? "smooth" : "auto" });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (EDIT && e.target.closest("[data-e]")) { e.preventDefault(); return; }
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
    const u = new URL(a.href, location.href);
    if (u.protocol !== location.protocol || u.host !== location.host) return;
    e.preventDefault();
    if (limpia(u) === limpia(location) && u.search === location.search) { if (u.hash) irAncla(u.hash); return; }
    telon.classList.add("vacio", "abajo");
    telon.classList.remove("fuera");
    void telon.offsetWidth;
    telon.style.transitionDuration = "0.75s";
    telon.classList.remove("abajo");
    setTimeout(() => { location.href = a.href; }, 780);
  });
  addEventListener("pageshow", (e) => { if (e.persisted) telon.classList.add("fuera"); });

  /* ---------- Arranque ---------- */
  async function arrancar() {
    cromo();
    pagina === "proyecto" ? proyecto() : inicio();
    puntero();
    registrar();
    requestAnimationFrame(cuadro);

    const img = $("main img");
    const lista = !img || img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; });
    let primera = false;
    try { primera = pagina === "inicio" && !sessionStorage.getItem("visto"); sessionStorage.setItem("visto", "1"); } catch {}

    if (EDIT) {
      telon.style.transition = "none";
    } else if (primera) {
      const nom = $(".telon-nombre"), cta = $(".telon-cuenta");
      nom.textContent = S.nombre || "";
      partir(nom);
      requestAnimationFrame(() => requestAnimationFrame(() => nom.classList.add("visible")));
      const t0 = performance.now(), DUR = 1900;
      (function cuenta(t) {
        const k = Math.min(1, (t - t0) / DUR);
        cta.textContent = dos(Math.round((1 - Math.pow(1 - k, 3)) * 100));
        if (k < 1) requestAnimationFrame(cuenta);
      })(t0);
      await Promise.all([espera(DUR + 250), Promise.race([lista, espera(3500)])]);
    } else {
      await Promise.race([lista, espera(1200)]);
    }

    if (location.hash) irAncla(location.hash, false);
    telon.classList.add("fuera");
    if (!EDIT) await espera(380);
    document.body.classList.add("listo");
    activar();
    alListo();
  }
  arrancar();
})();
