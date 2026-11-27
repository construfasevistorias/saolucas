// Service worker: guarda o sistema no celular para abrir e funcionar sem internet.
// Os DADOS (unidades, ocorrências, fila de envio) ficam no app.js (IndexedDB); aqui só os arquivos.
const VERSAO = "vistoria-v2";
const CDN = "https://cdn.jsdelivr.net";
const SUPABASE_JS = CDN + "/npm/@supabase/supabase-js@2/+esm";
const PLANTAS = ["final-01", "final-02", "final-03", "final-04", "final-05", "final-06", "final-07", "final-08", "final-09", "final-10", "501", "502", "503", "504"];
const ARQUIVOS = [
  "./", "index.html", "app.js", "config.js", "base-solucoes.js", "normas.js", "unidades-demo.js", "manifest.webmanifest",
  "img/logo-construfase.png", "img/icone-192.png", "img/icone-512.png",
  ...PLANTAS.map((p) => `img/plantas/${p}.jpg`),
];

// Baixa o supabase-js e todos os módulos que ele importa (o CDN divide em vários arquivos)
async function guardarModulo(cache, url, vistos = new Set()) {
  if (vistos.has(url)) return;
  vistos.add(url);
  const r = await fetch(url);
  if (!r.ok) return;
  await cache.put(url, r.clone());
  const txt = await r.text();
  const deps = [...txt.matchAll(/(?:from|import)\s*["'](\/npm\/[^"']+)["']/g)].map((m) => CDN + m[1]);
  await Promise.all(deps.map((d) => guardarModulo(cache, d, vistos)));
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSAO);
    await Promise.all(ARQUIVOS.map((a) => c.add(new Request(a, { cache: "reload" })).catch(() => null)));
    await guardarModulo(c, SUPABASE_JS).catch(() => null);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSAO) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Arquivos do site: tenta a internet (para pegar atualizações) e, se demorar ou cair, usa o guardado.
async function redePrimeiro(req) {
  const c = await caches.open(VERSAO);
  try {
    const r = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("tempo")), 5000)),
    ]);
    if (r && r.ok) c.put(req, r.clone());
    return r;
  } catch (e) {
    const g = await c.match(req, { ignoreSearch: true });
    if (g) return g;
    if (req.mode === "navigate") return (await c.match("index.html")) || Response.error();
    return Response.error();
  }
}

// Bibliotecas do CDN: usa o guardado na hora e atualiza em segundo plano.
async function guardadoPrimeiro(req) {
  const c = await caches.open(VERSAO);
  const g = await c.match(req);
  const rede = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  return g || (await rede) || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(redePrimeiro(req));
  else if (url.origin === CDN || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") e.respondWith(guardadoPrimeiro(req));
  // Supabase (dados, fotos, login) passa direto: quem cuida do modo sem internet é o app.js
});
