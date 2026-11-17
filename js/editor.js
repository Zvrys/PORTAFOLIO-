/* =========================================================
   Modo edición sobre la propia página. Guarda de dos formas:
   · LOCAL: abierto con "Abrir portafolio" (servidor del ordenador).
   · EN LÍNEA: en el sitio publicado, conectado a su repositorio de
     GitHub. Se entra añadiendo ?editar a la dirección; los cambios
     quedan como borrador en el navegador hasta pulsar "Publicar".
   Los visitantes nunca ven nada de esto.
   ========================================================= */
(async () => {
  let LOCAL = false;
  try { const r = await fetch("api/ping", { cache: "no-store" }); LOCAL = r.ok && /json/.test(r.headers.get("content-type") || ""); } catch {}
  const { D, EDIT } = window.SITIO;
  const CLAVE_GH = "ocre-github", CLAVE_BORRADOR = "ocre-borrador";
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
  let GH = LOCAL ? null : leer(CLAVE_GH);
  const pideEditar = /[?#&]editar\b/i.test(location.search + location.hash);
  if (!LOCAL && !GH) {
    if (EDIT) { sessionStorage.removeItem("editar"); location.reload(); return; }
    if (!pideEditar) return;
  }
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const slug = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const esVideo = (r) => /\.(mp4|webm|mov)$/i.test(r || "");
  const MAX_LADO = 2600, CALIDAD = 0.86; // los renders se optimizan a este tamaño al subirlos

  document.head.insertAdjacentHTML("beforeend", `<style>
    .ed-barra { position: fixed; left: 50%; bottom: 1.2rem; transform: translateX(-50%); z-index: 200; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: .4rem; max-width: calc(100vw - 2rem);
      background: #191815; color: #f4f1ec; padding: .5rem .6rem; border-radius: 1.7rem; box-shadow: 0 10px 40px rgba(0,0,0,.3); }
    .ed-barra.sola { left: auto; right: 1.2rem; transform: none; }
    .ed-b { padding: .55rem .9rem; border-radius: 999px; border: 1px solid rgba(255,255,255,.25); color: inherit; white-space: nowrap; transition: background .25s, color .25s; }
    .ed-b:hover, .ed-b.si { background: #f4f1ec; color: #191815; }
    .ed-estado { padding: 0 .7rem; opacity: .7; white-space: nowrap; }
    .ed-tira { position: absolute; top: .8rem; left: .8rem; z-index: 6; display: flex; flex-wrap: wrap; gap: .3rem; opacity: 0; transition: opacity .25s; }
    .hero .ed-tira, .p-hero .ed-tira { top: 5rem; left: var(--margen); opacity: 1; }
    [data-ei]:hover > .ed-tira, .ed-tira:focus-within { opacity: 1; }
    .ed-tira button { background: #f4f1ec; color: #191815; padding: .5rem .75rem; border-radius: 999px; box-shadow: 0 2px 12px rgba(0,0,0,.25); }
    .ed-tira button:hover { background: #191815; color: #f4f1ec; }
    .editando [data-ei] { outline: 1px dashed rgba(125,120,111,.7); outline-offset: -1px; }
    .editando [data-ei].soltar { outline: 3px solid #191815; }
    .editando [data-e] { outline: 1px dashed transparent; outline-offset: 4px; cursor: text; transition: outline-color .2s; min-width: 2em; display: inline-block; }
    .editando div[data-e], .editando p[data-e], .editando h1[data-e], .editando h3[data-e] { display: block; }
    .editando [data-multi] { white-space: pre-wrap; }
    .editando [data-e]:hover { outline-color: currentColor; }
    .editando [data-e]:focus { outline: 1px solid currentColor; }
    .editando [data-e]:empty::before { content: "Escribe aquí"; opacity: .4; }
    .editando .cursor, .editando .previa-flotante { display: none; }
    .editando .cabecera { mix-blend-mode: normal; background: var(--papel); color: var(--tinta); }
    .pie { padding-bottom: 5.5rem; } .editando .pie { padding-bottom: 7rem; }
    .ed-anadir { border: 1px dashed var(--gris); padding: 3rem 1rem; text-align: center; width: 100%; transition: background .25s; }
    .ed-anadir:hover, .ed-anadir.soltar { background: var(--papel-2); }
    .ed-mas { opacity: .5; padding: .9rem 0; } .ed-mas:hover { opacity: 1; }
    .ed-oculto { opacity: .45; }
    .editando .banda { white-space: normal; padding-inline: var(--margen); cursor: default; }
    .editando .banda-in { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem .4rem; transform: none; }
    .editando .banda span { padding-right: .15em; }
    .editando .banda span::after { content: none; }
    .ed-bx { margin-right: 1.6rem; padding: .3rem .7rem; }
    .ed-x { margin: 0 1.2rem 0 auto; opacity: .45; font: inherit; letter-spacing: inherit; text-transform: inherit; }
    .ed-x:hover { opacity: 1; color: #9a3b2a; }
    .ed-dlg { position: fixed; inset: 0; z-index: 300; background: rgba(15,14,12,.55); display: grid; place-items: center; padding: 1.5rem; }
    .ed-dlg-caja { background: #f6f3ea; color: #191815; padding: 2rem; width: min(26rem, 100%); border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
    .ed-dlg-caja p { white-space: pre-line; font-family: var(--f-display); font-size: 1.35rem; line-height: 1.3; }
    .ed-dlg-caja input { width: 100%; margin-top: 1.2rem; font: inherit; font-size: 1rem; padding: .7rem 0; border: 0; border-bottom: 1px solid #191815; background: transparent; outline: none; color: inherit; }
    .ed-dlg-caja label { display: block; margin-top: 1.1rem; font-size: .8rem; opacity: .7; }
    .ed-dlg-caja label input { margin-top: .1rem; }
    .ed-dlg-caja small { display: block; margin-top: 1rem; font-size: .8rem; line-height: 1.5; opacity: .7; }
    .ed-b.aviso { background: #a8414f; border-color: #a8414f; color: #fff; }
    .ed-dlg-b { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1.6rem; }
    .ed-dlg-b button { padding: .7rem 1.1rem; border-radius: 999px; border: 1px solid #191815; }
    .ed-dlg-b button.si, .ed-dlg-b button:hover { background: #191815; color: #f6f3ea; }
    .editando .pie { position: static; }
    .editando .hz { height: auto; }
    .editando .hz-pin { position: static; height: auto; overflow-x: auto; padding-block: 4rem; }
    .editando .hz-pista { transform: none; }
    .editando .hz-mas { color: #f6f3ea; border-color: rgba(246,243,234,.6); }
    .editando .hz-mas:hover { background: rgba(246,243,234,.12); }
    .editando .hz-item .hz-img img, .editando .hz-item .hz-img video { transform: none; }
    .hz-mas { flex: none; width: 16rem; align-self: stretch; min-height: 14rem; }
    .editando .tarjeta, .editando .deriva { transform: none; }
  </style>`);

  /* ---------- Diálogos propios (sustituyen a prompt/confirm del navegador) ---------- */
  function dialogo(texto, conCampo, soloAviso) {
    return new Promise((ok) => {
      const d = document.createElement("div");
      d.className = "ed-dlg";
      d.innerHTML = `<form class="ed-dlg-caja"><p></p>${conCampo ? '<input type="text">' : ""}<div class="ed-dlg-b etiqueta">${soloAviso ? "" : '<button type="button" data-x>Cancelar</button>'}<button type="submit" class="si">Aceptar</button></div></form>`;
      $("p", d).textContent = texto;
      document.body.appendChild(d);
      const inp = $("input", d);
      (inp || $("[type=submit]", d)).focus();
      const fin = (v) => { d.remove(); ok(v); };
      d.addEventListener("submit", (ev) => { ev.preventDefault(); fin(conCampo ? inp.value : true); });
      d.addEventListener("click", (ev) => { if (ev.target === d || ev.target.closest("[data-x]")) fin(conCampo ? null : false); });
      d.addEventListener("keydown", (ev) => { if (ev.key === "Escape") fin(conCampo ? null : false); });
    });
  }
  const pedir = (t) => dialogo(t, true), confirmar = (t) => dialogo(t, false), avisar = (t) => dialogo(t, false, true);

  function formulario(titulo, campos, nota) {
    return new Promise((ok) => {
      const d = document.createElement("div");
      d.className = "ed-dlg";
      d.innerHTML = `<form class="ed-dlg-caja"><p></p>${campos.map((c) => `<label>${c.t}<input name="${c.n}" type="${c.tipo || "text"}" autocomplete="off" required></label>`).join("")}${nota ? "<small></small>" : ""}<div class="ed-dlg-b etiqueta"><button type="button" data-x>Cancelar</button><button type="submit" class="si">Conectar</button></div></form>`;
      $("p", d).textContent = titulo;
      if (nota) $("small", d).textContent = nota;
      campos.forEach((c) => { $(`[name=${c.n}]`, d).value = c.v || ""; });
      document.body.appendChild(d);
      ($$("input", d).find((i) => !i.value) || $("input", d)).focus();
      const fin = (v) => { d.remove(); ok(v); };
      d.addEventListener("submit", (ev) => { ev.preventDefault(); fin(Object.fromEntries(campos.map((c) => [c.n, $(`[name=${c.n}]`, d).value.trim()]))); });
      d.addEventListener("click", (ev) => { if (ev.target.closest("[data-x]")) fin(null); });
    });
  }

  /* ---------- Edición en línea: conexión con GitHub ---------- */
  async function api(ruta, opc = {}, cfg = GH) {
    const r = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}${ruta}`, {
      method: opc.method || "GET", body: opc.body ? JSON.stringify(opc.body) : undefined, cache: "no-store",
      headers: { Accept: opc.crudo ? "application/vnd.github.raw+json" : "application/vnd.github+json", Authorization: `Bearer ${cfg.token}`, "X-GitHub-Api-Version": "2022-11-28", ...(opc.body ? { "Content-Type": "application/json" } : {}) },
    });
    if (!r.ok) {
      const e = new Error(r.status === 401 ? "la clave de acceso no es válida o ha caducado" : r.status === 404 ? "no se encontró el repositorio (revisa el usuario, el nombre y los permisos de la clave)" : r.status === 403 ? "la clave no tiene permiso de escritura sobre el repositorio" : `GitHub respondió con el error ${r.status}`);
      e.status = r.status; throw e;
    }
    return opc.crudo ? r.text() : r.json();
  }
  async function conectar(previo) {
    const m = location.hostname.match(/^(.+)\.github\.io$/i), seg = location.pathname.split("/")[1] || "";
    const v = await formulario("Conectar con GitHub para editar en línea", [
      { n: "owner", t: "Usuario de GitHub", v: previo ? previo.owner : m ? m[1] : "" },
      { n: "repo", t: "Nombre del repositorio", v: previo ? previo.repo : m ? (seg && !seg.includes(".") ? seg : `${m[1]}.github.io`) : "" },
      { n: "token", t: "Clave de acceso (token)", tipo: "password" },
    ], "La clave se guarda solo en este navegador. La guía «CÓMO PUBLICAR Y EDITAR EN LÍNEA» de la carpeta explica cómo crearla.");
    if (!v) return null;
    const cfg = { owner: v.owner, repo: v.repo, token: v.token };
    try {
      const info = await api("", {}, cfg);
      if (info.permissions && info.permissions.push === false) throw new Error("la clave no tiene permiso de escritura (Contents: Read and write)");
      cfg.rama = info.default_branch || "main";
    } catch (e) { await avisar("No se pudo conectar: " + e.message + "."); return conectar(cfg); }
    localStorage.setItem(CLAVE_GH, JSON.stringify(cfg));
    return cfg;
  }
  // Al entrar a editar en línea se parte siempre de lo último publicado (o del borrador sin publicar)
  async function entrar() {
    if (GH) {
      const b = leer(CLAVE_BORRADOR);
      if (!(b && b.sucio)) {
        try {
          const txt = await api(`/contents/js/datos.js?ref=${encodeURIComponent(GH.rama)}`, { crudo: true });
          localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ datos: JSON.parse(txt.slice(txt.indexOf("{")).replace(/;\s*$/, "")), sucio: false }));
        } catch (e) {
          if (e.status !== 401 && e.status !== 404 && e.status !== 403) { await avisar("No se pudo abrir el modo edición: " + e.message + "."); return; }
          await avisar("Hay que volver a conectar: " + e.message + ".");
          localStorage.removeItem(CLAVE_GH);
          GH = await conectar(GH);
          if (GH) return entrar();
          return;
        }
      }
    }
    sessionStorage.setItem("editar", "1");
    location.reload();
  }

  /* ---------- Fuera del modo edición: solo un botón ---------- */
  if (!EDIT) {
    if (!LOCAL && !GH) { GH = await conectar(); if (!GH) return; return entrar(); }
    const b = document.createElement("div");
    b.className = "ed-barra etiqueta sola";
    b.innerHTML = `<button class="ed-b" data-acc="entrar">✎ Editar página</button>`;
    document.body.appendChild(b);
    b.addEventListener("click", entrar);
    return;
  }

  const barra = document.createElement("div");
  barra.className = "ed-barra etiqueta";
  document.body.appendChild(barra);

  /* ---------- Guardado ---------- */
  const p = window.SITIO.proyecto;
  barra.innerHTML = `
    <span class="ed-estado">Modo edición</span>
    <button class="ed-b" data-acc="nuevo">+ Nuevo proyecto</button>
    ${p ? `
      <button class="ed-b" data-acc="anadir">+ Imágenes</button>
      <button class="ed-b ${p.destacado ? "si" : ""}" data-acc="destacado" title="Mostrar este proyecto en la portada animada">En portada</button>
      <button class="ed-b ${p.oculto ? "si" : ""}" data-acc="oculto" title="Borrador: no se muestra en el sitio">Oculto</button>
      <button class="ed-b" data-acc="antes" title="Mover antes en la lista">↑</button>
      <button class="ed-b" data-acc="despues" title="Mover después en la lista">↓</button>
      <button class="ed-b" data-acc="eliminar">Eliminar</button>` : ""}
    ${GH ? `<button class="ed-b" data-acc="publicar" title="Sube los cambios al sitio publicado">Publicar cambios</button>
      <button class="ed-b" data-acc="descartar" title="Vuelve a lo último publicado">Descartar</button>` : ""}
    <button class="ed-b" data-acc="salir">Terminar</button>`;
  const estado = $(".ed-estado");
  const decir = (t) => { estado.textContent = t; };

  let reloj, pendiente = Promise.resolve();
  const GUARDADO = GH ? "Borrador ✓ · falta publicar" : "Guardado ✓";
  let sucio = !!(GH && (leer(CLAVE_BORRADOR) || {}).sucio);
  const marcarSucio = (v) => { sucio = v; const b = $('[data-acc="publicar"]', barra); if (b) b.classList.toggle("aviso", v); };
  const enviar = async () => {
    if (GH) { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ datos: D, sucio: true })); marcarSucio(true); return; }
    const r = await fetch("api/datos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(D) });
    if (!r.ok) throw new Error("No se pudo guardar");
  };
  marcarSucio(sucio);
  if (sucio) decir("Borrador sin publicar");
  function guardar() {
    decir("Guardando…");
    clearTimeout(reloj);
    reloj = setTimeout(() => { reloj = null; pendiente = pendiente.then(enviar).then(() => decir(GUARDADO)).catch(() => decir("⚠ No se guardó")); }, 400);
  }
  async function guardarYa() {
    clearTimeout(reloj); reloj = null;
    decir("Guardando…");
    pendiente = pendiente.then(enviar);
    await pendiente;
  }
  async function recargar(url) {
    try { await guardarYa(); } catch { decir("⚠ No se guardó"); avisar(GH ? "No se pudo guardar el borrador en este navegador." : "No se pudo guardar el cambio. Comprueba que la ventana «Portafolio» sigue abierta."); return; }
    if (url) { location.href = url; return; }
    sessionStorage.setItem("ed-scroll", String(scrollY));
    location.reload();
  }

  /* ---------- Datos ---------- */
  function resolver(ruta) {
    const k = ruta.split(".");
    let o, proy = null;
    if (k[0] === "sitio") { o = D.sitio; k.shift(); }
    else { proy = o = D.proyectos.find((x) => x.id === k[1]); k.splice(0, 2); }
    while (k.length > 1) o = o[k.shift()];
    return { o, k: /^\d+$/.test(k[0]) ? +k[0] : k[0], proy };
  }

  /* ---------- Subida de imágenes ---------- */
  const elegir = (varias) => new Promise((ok) => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = "image/*,video/mp4,video/webm"; i.multiple = varias;
    i.onchange = () => ok([...i.files]);
    i.click();
  });
  async function optimizar(file) {
    if (!/^image\/(jpeg|png|webp|avif|bmp)$/.test(file.type)) return null;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 1.5e6 && /jpeg|webp/.test(file.type)) return null; // ya es ligera
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((ok) => c.toBlob(ok, "image/jpeg", CALIDAD));
  }
  /* En línea: las imágenes nuevas esperan en el navegador hasta que se publica */
  const almacen = (modo, fn) => new Promise((ok, no) => {
    const a = indexedDB.open("ocre-editor", 1);
    a.onupgradeneeded = () => a.result.createObjectStore("img");
    a.onerror = () => no(a.error);
    a.onsuccess = () => { const tx = a.result.transaction("img", modo), q = fn(tx.objectStore("img")); tx.oncomplete = () => { a.result.close(); ok(q && q.result); }; tx.onerror = () => no(tx.error); };
  });
  const base64 = (blob) => new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(",")[1]); f.onerror = () => no(f.error); f.readAsDataURL(blob); });
  if (GH) {
    // Una imagen que aún no está en el sitio publicado se muestra desde el navegador o desde el repositorio
    const suplir = async (el) => {
      const ruta = el.getAttribute("src");
      if (!ruta || el.dataset.suplida || /^(blob|data|https?):/i.test(ruta)) return;
      el.dataset.suplida = "1";
      let r = null;
      try { r = await almacen("readonly", (s) => s.get(ruta)); } catch {}
      el.src = r ? URL.createObjectURL(r.blob) : `https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.rama}/${ruta}`;
    };
    document.addEventListener("error", (ev) => { if (ev.target && /^(IMG|VIDEO)$/.test(ev.target.tagName)) suplir(ev.target); }, true);
    $$("img").forEach((i) => { if (i.complete && !i.naturalWidth) suplir(i); });
  }
  async function publicar() {
    await guardarYa();
    const [claves, vals] = [await almacen("readonly", (s) => s.getAllKeys()), await almacen("readonly", (s) => s.getAll())];
    const usado = JSON.stringify(D);
    const arbol = [{ path: "js/datos.js", mode: "100644", type: "blob", content: "// Contenido del sitio. Se edita desde la propia página (modo edición).\nwindow.PORTFOLIO = " + JSON.stringify(D, null, 2) + ";\n" }];
    const nuevas = claves.map((c, i) => i).filter((i) => !vals[i].pub && usado.includes(JSON.stringify(claves[i])));
    let n = 0;
    for (const i of nuevas) {
      decir(`Subiendo imagen ${++n} de ${nuevas.length}…`);
      const { sha } = await api("/git/blobs", { method: "POST", body: { content: await base64(vals[i].blob), encoding: "base64" } });
      arbol.push({ path: claves[i], mode: "100644", type: "blob", sha });
    }
    decir("Publicando…");
    const ref = await api(`/git/ref/heads/${GH.rama}`);
    const base = await api(`/git/commits/${ref.object.sha}`);
    const tree = await api("/git/trees", { method: "POST", body: { base_tree: base.tree.sha, tree: arbol } });
    const commit = await api("/git/commits", { method: "POST", body: { message: "Cambios desde el editor del sitio", tree: tree.sha, parents: [ref.object.sha] } });
    await api(`/git/refs/heads/${GH.rama}`, { method: "PATCH", body: { sha: commit.sha } });
    for (const i of nuevas) await almacen("readwrite", (s) => s.put({ blob: vals[i].blob, pub: true }, claves[i]));
    localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ datos: D, sucio: false }));
    marcarSucio(false);
    decir("Publicado ✓");
    await avisar("Publicado.\nLos visitantes verán los cambios en 1 o 2 minutos.");
  }

  async function subir(files, carpeta) {
    const rutas = [];
    let n = 0;
    for (const f of files) {
      decir(`Subiendo ${++n} de ${files.length}…`);
      let cuerpo = f, nombre = f.name;
      try { const o = await optimizar(f); if (o) { cuerpo = o; nombre = nombre.replace(/\.[^.]+$/, "") + ".jpg"; } } catch (e) { console.warn(e); }
      if (GH) {
        const ext = (nombre.split(".").pop() || "").toLowerCase();
        if (!/^(jpe?g|png|webp|avif|gif|svg|mp4|webm)$/.test(ext)) throw new Error(`${f.name}: tipo de archivo no admitido`);
        if (cuerpo.size > 45e6) throw new Error(`${f.name}: pesa demasiado para subirlo en línea (máximo 45 MB)`);
        const ruta = `imagenes/${slug(carpeta) || "varios"}/${slug(nombre.replace(/\.[^.]+$/, "")) || "imagen"}-${Date.now().toString(36)}${n}.${ext}`;
        await almacen("readwrite", (s) => s.put({ blob: cuerpo, pub: false }, ruta));
        rutas.push(ruta);
        continue;
      }
      const r = await fetch(`api/subir?carpeta=${encodeURIComponent(carpeta)}&nombre=${encodeURIComponent(nombre)}`, { method: "POST", body: cuerpo });
      const j = await r.json();
      if (!r.ok) throw new Error(`${f.name}: ${j.error || "no se pudo subir"}`);
      rutas.push(j.ruta);
    }
    return rutas;
  }
  const fallo = (e) => { console.error(e); decir("⚠ Error"); avisar("No se pudo completar: " + e.message); };

  async function cambiarImagen(ruta, files) {
    files = files || (await elegir(false));
    if (!files.length) return;
    const { o, k, proy } = resolver(ruta);
    const [nueva] = await subir(files.slice(0, 1), proy ? proy.id : ruta.startsWith("sitio.galeria") ? "galeria" : "estudio");
    const vieja = o[k];
    o[k] = nueva;
    if (proy) {
      if (k === "portada") { const i = proy.imagenes.indexOf(vieja); if (i >= 0) proy.imagenes[i] = nueva; else proy.imagenes.unshift(nueva); }
      else if (proy.portada === vieja) proy.portada = nueva;
    }
    await recargar();
  }
  async function anadirImagenes(files) {
    files = files || (await elegir(true));
    if (!files.length) return;
    const rutas = await subir(files, p.id);
    p.imagenes.push(...rutas);
    if (!p.portada) p.portada = p.imagenes.find((r) => !esVideo(r)) || p.imagenes[0];
    await recargar();
  }

  async function anadirGaleria(files) {
    files = files || (await elegir(true));
    if (!files.length) return;
    const rutas = await subir(files, "galeria");
    (D.sitio.galeria ||= []).push(...rutas);
    await recargar();
  }

  /* ---------- Controles sobre cada imagen y texto ---------- */
  function decorar() {
    $$("[data-ei]").forEach((el) => {
      if ($(":scope > .ed-tira", el)) return;
      const enGaleria = /\.(imagenes|galeria)\.\d+$/.test(el.dataset.ei), deProyecto = /\.imagenes\.\d+$/.test(el.dataset.ei);
      const vacia = !$("img,video", el);
      el.insertAdjacentHTML("beforeend", `<div class="ed-tira etiqueta">
        <button data-img="cambiar">${vacia ? "Elegir imagen" : "Cambiar imagen"}</button>
        ${enGaleria ? `<button data-img="izq" title="Mover antes">←</button><button data-img="der" title="Mover después">→</button>${deProyecto ? `<button data-img="portada">Usar de portada</button>` : ""}<button data-img="quitar">Quitar</button>` : ""}
      </div>`);
    });
    $$("[data-e]").forEach((el) => {
      if (el.isContentEditable) return;
      el.contentEditable = "plaintext-only";
      if (!el.isContentEditable) el.contentEditable = "true";
      el.spellcheck = false;
    });
    $$(".tarjeta, .fila").forEach((a) => {
      const id = new URL(a.href).searchParams.get("id"), x = D.proyectos.find((q) => q.id === id);
      a.classList.toggle("ed-oculto", !!(x && x.oculto));
    });
  }
  addEventListener("pintado", decorar);
  decorar();

  const lam = $(".laminas");
  if (lam && p) lam.insertAdjacentHTML("beforeend", `<button class="ed-anadir etiqueta" data-acc="anadir">+ Añadir imágenes o vídeos — haz clic o arrástralos aquí</button>`);
  const pista = $(".hz-pista");
  if (pista) pista.insertAdjacentHTML("beforeend", `<button class="ed-anadir hz-mas etiqueta" data-acc="galeria">+ Añadir imágenes a la selección</button>`);
  const bandaEd = $(".banda-in");
  if (bandaEd) {
    $$("[data-e]", bandaEd).forEach((s) => s.insertAdjacentHTML("afterend", `<button class="ed-b ed-bx etiqueta" data-acc="quitar-banda" data-n="${s.dataset.e.split(".").pop()}" title="Quitar este texto">×</button>`));
    bandaEd.insertAdjacentHTML("beforeend", `<button class="ed-b etiqueta" data-acc="banda">+ Añadir texto</button>`);
  }
  const serv = $(".servicios");
  if (serv) serv.insertAdjacentHTML("beforeend", `<li><button class="ed-mas" data-acc="servicio">+ Añadir servicio</button></li>`);
  $$('.servicios [data-e^="sitio.servicios."]').forEach((s) => {
    const n = s.dataset.e.split(".").pop();
    s.insertAdjacentHTML("afterend", `<button class="ed-x" data-acc="quitar-servicio" data-n="${n}" title="Quitar este servicio">× Quitar</button>`);
  });

  /* Textos: se guardan mientras escribes */
  document.addEventListener("input", (ev) => {
    const el = ev.target.closest && ev.target.closest("[data-e]");
    if (!el) return;
    const { o, k } = resolver(el.dataset.e);
    let v = "multi" in el.dataset ? el.innerText.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim() : el.innerText.replace(/\s+/g, " ").trim();
    if (el.dataset.e === "sitio.instagram") v = v.replace(/^@/, "");
    o[k] = v;
    guardar();
  });
  document.addEventListener("keydown", (ev) => {
    const el = ev.target.closest && ev.target.closest("[data-e]");
    if (el && ev.key === "Enter" && !("multi" in el.dataset)) { ev.preventDefault(); el.blur(); }
  });
  document.addEventListener("focusout", (ev) => {
    const el = ev.target.closest && ev.target.closest('[data-e^="sitio.servicios."], [data-e^="sitio.banda."]');
    if (el && !el.innerText.trim()) { const { o, k } = resolver(el.dataset.e); o.splice(k, 1); recargar(); }
  });

  /* Clics en los controles (antes que la navegación del sitio) */
  document.addEventListener("click", async (ev) => {
    const bi = ev.target.closest("[data-img]"), ba = ev.target.closest("[data-acc]");
    if (!bi && !ba) return;
    ev.preventDefault(); ev.stopPropagation();
    try {
      if (bi) {
        const ruta = bi.closest("[data-ei]").dataset.ei, a = bi.dataset.img;
        if (a === "cambiar") return await cambiarImagen(ruta);
        const { o: lista, k: n, proy } = resolver(ruta);
        if (a === "izq" || a === "der") {
          const d = a === "izq" ? -1 : 1;
          let j = n + d;
          while (proy && lista[j] !== undefined && lista[j] === proy.portada) j += d; // la portada no cuenta: va arriba
          if (lista[j] === undefined) return;
          [lista[n], lista[j]] = [lista[j], lista[n]];
        } else if (a === "portada") proy.portada = lista[n];
        else if (a === "quitar") {
          if (!await confirmar("¿Quitar esta imagen?\nEl archivo no se borra.")) return;
          lista.splice(n, 1);
        }
        return await recargar();
      }
      const a = ba.dataset.acc, L = D.proyectos, i = L.indexOf(p);
      if (a === "salir") {
        if (reloj || !GH) await guardarYa();
        if (GH && sucio && !await confirmar("Tienes cambios sin publicar.\nSe conservan como borrador en este navegador, pero los visitantes aún no los ven. ¿Salir del modo edición?")) return;
        sessionStorage.removeItem("editar"); location.reload();
      }
      else if (a === "publicar") {
        if (reloj) await guardarYa();
        if (!sucio) return void avisar("No hay cambios pendientes de publicar.");
        await publicar();
      }
      else if (a === "descartar") {
        if (!await confirmar("¿Descartar los cambios sin publicar y volver a lo último publicado?")) return;
        clearTimeout(reloj); reloj = null;
        localStorage.removeItem(CLAVE_BORRADOR);
        await entrar();
      }
      else if (a === "anadir") await anadirImagenes();
      else if (a === "galeria") await anadirGaleria();
      else if (a === "banda") { D.sitio.banda.push("Nuevo texto"); await recargar(); }
      else if (a === "quitar-banda") { D.sitio.banda.splice(+ba.dataset.n, 1); await recargar(); }
      else if (a === "quitar-servicio") { D.sitio.servicios.splice(+ba.dataset.n, 1); await recargar(); }
      else if (a === "servicio") { (D.sitio.servicios ||= []).push("Nuevo servicio"); await recargar(); }
      else if (a === "nuevo") {
        const titulo = ((await pedir("Título del nuevo proyecto")) || "").trim();
        if (!titulo) return;
        const base = slug(titulo) || "proyecto";
        let id = base, n = 2;
        while (L.some((x) => x.id === id)) id = `${base}-${n++}`;
        L.unshift({ id, titulo, tipo: "", ubicacion: "", anio: String(new Date().getFullYear()), cliente: "", superficie: "", estado: "", destacado: true, oculto: false, resumen: "", descripcion: "", portada: "", imagenes: [] });
        await recargar(`proyecto.html?id=${encodeURIComponent(id)}`);
      }
      else if (a === "destacado" || a === "oculto") { p[a] = !p[a]; ba.classList.toggle("si", p[a]); guardar(); }
      else if (a === "antes" || a === "despues") {
        const j = i + (a === "antes" ? -1 : 1);
        if (!L[j]) return;
        [L[i], L[j]] = [L[j], L[i]];
        await guardarYa(); decir(`Posición ${j + 1} de ${L.length} ✓`);
      }
      else if (a === "eliminar") {
        if (!await confirmar(`¿Eliminar el proyecto «${p.titulo}» del sitio?\nSus imágenes se conservan en la carpeta imagenes/${p.id}.`)) return;
        L.splice(i, 1);
        await recargar("index.html#proyectos");
      }
    } catch (e) { fallo(e); }
  }, true);

  /* Arrastrar archivos sobre una imagen (la sustituye) o sobre "Añadir" */
  const zona = (ev) => ev.target.closest && (ev.target.closest(".ed-anadir") || ev.target.closest("[data-ei]"));
  let ultima = null;
  const marcar = (z) => { if (ultima && ultima !== z) ultima.classList.remove("soltar"); if (z) z.classList.add("soltar"); ultima = z; };
  document.addEventListener("dragover", (ev) => { ev.preventDefault(); marcar(zona(ev)); });
  document.addEventListener("dragleave", (ev) => { if (!ev.relatedTarget) marcar(null); });
  document.addEventListener("drop", async (ev) => {
    ev.preventDefault();
    const z = zona(ev), files = [...(ev.dataTransfer.files || [])];
    marcar(null);
    if (!z || !files.length) return;
    try { z.classList.contains("hz-mas") ? await anadirGaleria(files) : z.classList.contains("ed-anadir") ? await anadirImagenes(files) : await cambiarImagen(z.dataset.ei, files); } catch (e) { fallo(e); }
  });

  const y = sessionStorage.getItem("ed-scroll");
  if (y !== null) { sessionStorage.removeItem("ed-scroll"); scrollTo(0, +y); }
})();
