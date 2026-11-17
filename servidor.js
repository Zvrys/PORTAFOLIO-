// Servidor local del portafolio: muestra el sitio y guarda lo que editas desde la página.
// Solo funciona en tu ordenador. Al publicar el sitio en internet este archivo no se usa.
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = __dirname, PUERTO = +process.env.PORT || 4173;
const TIPOS = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", json: "application/json", svg: "image/svg+xml", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", gif: "image/gif", mp4: "video/mp4", webm: "video/webm", ico: "image/x-icon" };
const SUBIBLES = /^(jpe?g|png|webp|avif|gif|svg|mp4|webm)$/;
const slug = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const json = (res, obj, cod = 200) => { res.writeHead(cod, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); };
const cuerpo = (req, max) => new Promise((ok, no) => {
  const partes = []; let n = 0;
  req.on("data", (c) => { n += c.length; if (n > max) { no(new Error("Archivo demasiado grande")); req.destroy(); } else partes.push(c); });
  req.on("end", () => ok(Buffer.concat(partes))); req.on("error", no);
});
let respaldado = false;

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://local");
  try {
    if (u.pathname === "/api/ping") return json(res, { ok: true });

    if (req.method === "POST") {
      // Solo se aceptan cambios hechos desde la propia página
      const origen = req.headers.origin;
      if (origen && new URL(origen).host !== req.headers.host) return json(res, { error: "Origen no permitido" }, 403);

      if (u.pathname === "/api/datos") {
        const d = JSON.parse((await cuerpo(req, 5e6)).toString("utf8"));
        if (!d || !d.sitio || !Array.isArray(d.proyectos)) throw new Error("Datos no válidos");
        const f = path.join(RAIZ, "js", "datos.js");
        if (!respaldado && fs.existsSync(f)) { fs.copyFileSync(f, path.join(RAIZ, "js", "datos.respaldo.js")); respaldado = true; }
        fs.writeFileSync(f + ".tmp", "// Contenido del sitio. Se edita desde la propia página (modo edición).\nwindow.PORTFOLIO = " + JSON.stringify(d, null, 2) + ";\n");
        fs.renameSync(f + ".tmp", f);
        return json(res, { ok: true });
      }

      if (u.pathname === "/api/subir") {
        const carpeta = slug(u.searchParams.get("carpeta")) || "varios";
        const original = u.searchParams.get("nombre") || "imagen.jpg";
        const ext = (original.split(".").pop() || "").toLowerCase();
        if (!SUBIBLES.test(ext)) return json(res, { error: "Tipo de archivo no admitido" }, 400);
        const base = slug(original.replace(/\.[^.]+$/, "")) || "imagen";
        const dir = path.join(RAIZ, "imagenes", carpeta);
        fs.mkdirSync(dir, { recursive: true });
        let nombre = `${base}.${ext}`, n = 2;
        while (fs.existsSync(path.join(dir, nombre))) nombre = `${base}-${n++}.${ext}`;
        fs.writeFileSync(path.join(dir, nombre), await cuerpo(req, 300e6));
        return json(res, { ruta: `imagenes/${carpeta}/${nombre}` });
      }
      return json(res, { error: "No existe" }, 404);
    }

    // Archivos del sitio
    let rel = decodeURIComponent(u.pathname);
    if (rel.endsWith("/")) rel += "index.html";
    let f = path.normalize(path.join(RAIZ, rel));
    if (!f.startsWith(RAIZ + path.sep) || rel.split("/").some((s) => s.startsWith(".")) || /servidor\.js$/i.test(f)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(f).slice(1).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(f).pipe(res);
  } catch (e) {
    console.error(e.message);
    if (!res.headersSent) json(res, { error: e.message }, 500);
  }
}).listen(PUERTO, "127.0.0.1", () => console.log(`Portafolio abierto en http://localhost:${PUERTO}  (cierra esta ventana para apagarlo)`));
