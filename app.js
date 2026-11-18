// =====================================================================
// Vistoria de Entrega · Construfase
// Um único arquivo com: camada de dados (Supabase ou demonstração),
// telas (vistoria, painel do engenheiro, base de soluções, cadastro).
// =====================================================================

const CFG = window.VISTORIA_CONFIG || {};
const DEMO = !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY;

const COMODOS = ["Sala", "Cozinha", "Área de serviço", "Banheiro", "Quarto 1", "Quarto 2", "Suíte", "Banheiro da suíte", "Varanda", "Circulação", "Unidade toda"];
const AREAS = ["Pintura", "Cerâmica e revestimentos", "Piso", "Esquadrias e portas", "Vidros", "Elétrica", "Hidráulica", "Louças e metais", "Gesso e forro", "Umidade e infiltração", "Limpeza", "Outros"];
const EQUIPES = ["Pintura", "Cerâmica", "Elétrica", "Hidráulica", "Esquadrias", "Vidraçaria", "Gesso", "Limpeza", "Manutenção geral"];
const ST_UNI = { pendente: "Pendente", em_vistoria: "Em vistoria", concluida: "Concluída" };
const ST_OCC = { aberta: "Pendente", resolvida_na_hora: "Resolvida na hora", equipe_acionada: "Equipe acionada", resolvida: "Resolvida" };
// Lista de Serviços Corriqueiros (FS014-02 Rev. 04). Fora dela: aprovação da gerência de Engenharia e Administrativa.
const LISTA_CORRIQUEIROS = ["Infiltração", "Vazamento", "Pintura", "Problemas elétricos", "Pisos danificados (lascas, trincas e desplacamentos)", "Azulejos danificados (lascas, trincas e desplacamentos)", "Interfones", "Metais dos banheiros", "Vazamentos de gás", "Telhados (telhas, calhas e rufos)", "Pavimentação abaloada", "Infiltração nas esquadrias (janelas)", "Fechadura com defeito"];
function corriqueiroLocal(area, texto) {
  if (["Pintura", "Cerâmica e revestimentos", "Piso", "Elétrica", "Hidráulica", "Louças e metais", "Umidade e infiltração", "Limpeza"].includes(area)) return true;
  if (area === "Esquadrias e portas") return /fechadur|janela|infiltr|veda|chave|porta|regul|trilho|ma[cç]aneta/i.test(texto || "");
  return false;
}
// A agenda usa primeiros nomes ("Ricardo", "Junior/João Victor"): confere com o nome do perfil
const ehMeu = (a) => !!(a.responsavel && EU && norm(a.responsavel).split("/").some((p) => { const w = p.trim().split(/\s+/)[0]; return w && norm(EU.nome).split(/[^a-z0-9]+/).includes(w); }));
const comodosDe = (u) => [...((u && u.comodos && u.comodos.length) ? u.comodos : COMODOS.filter((c) => c !== "Unidade toda")), "Unidade toda"];
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const diaSemana = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); };
const PAPEIS = { vistoriador: "Vistoriador(a)", engenheiro: "Engenharia", admin: "Administrador" };


// ---------------------------------------------------------------- ícones (traço, 24×24)
const ICONES = {
  back: '<path d="M15 18l-6-6 6-6"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M20 6L9 17l-5-5"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
  chevron: '<path d="M9 18l6-6-6-6"/>',
  relatorio: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 18v-3M12 18v-6M16 18v-4"/>',
  wifi: '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.4a5 5 0 0 1 7 0"/><path d="M12 20h.01"/><path d="M3 3l18 18"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.2"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/>',
  ia: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v3M3.5 18.5h3"/>',
  vistoria: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 13l2 2 4-4"/>',
  painel: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6M14 6a6 6 0 0 1 6 6v3"/>',
  base: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  predio: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  agenda: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  chave: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  cadeado: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  impressora: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  planta: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h8v11M11 14h10M15 3v7"/>',
  alerta: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  ferramenta: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  busca: '<circle cx="11" cy="11" r="7.5"/><path d="M21 21l-4.3-4.3"/>',
  fala: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  inicio: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  lixo: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  // áreas
  "Pintura": '<rect x="2" y="2" width="16" height="6" rx="2"/><path d="M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="8" y="16" width="4" height="6" rx="1"/>',
  "Cerâmica e revestimentos": '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  "Piso": '<path d="M12 2L2 7l10 5 10-5z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/>',
  "Esquadrias e portas": '<path d="M5 22V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v19"/><path d="M2 22h20M15 12h.01"/>',
  "Vidros": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18M6.5 6.5l3 3"/>',
  "Elétrica": '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  "Hidráulica": '<path d="M12 2.7l5.7 5.7a8 8 0 1 1-11.3 0z"/>',
  "Louças e metais": '<path d="M9 6L6.5 3.5a1.5 1.5 0 0 0-1-.5C4.7 3 4 3.7 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M2 12h20M7 19v2M17 19v2"/>',
  "Gesso e forro": '<path d="M2 4h20"/><path d="M4 4v4h16V4"/><path d="M12 8v4"/><path d="M9 15a3 3 0 0 0 6 0"/>',
  "Umidade e infiltração": '<path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/><path d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v1M12 15v2"/>',
  "Limpeza": '<path d="M19.4 2.6l-7.8 7.8"/><path d="M11 10l3 3-6 8-5-5z"/><path d="M5.5 16.5l3 3"/>',
  "Outros": '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
};
const ic = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[n] || ICONES.Outros}</svg>`;

// ---------------------------------------------------------------- utilidades
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const fmtHora = (iso) => { if (!iso) return ""; const d = new Date(iso); return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); };
const fmtDataHora = (iso) => { if (!iso) return ""; const d = new Date(iso); return d.toLocaleDateString("pt-BR") + " " + fmtHora(iso); };
const unidadeNome = (u) => (u.bloco ? `Bloco ${u.bloco} · ` : "") + `Apto ${u.numero}`;
const sortUnidades = (a, b) => (a.bloco || "").localeCompare(b.bloco || "", "pt", { numeric: true }) || String(a.numero).localeCompare(String(b.numero), "pt", { numeric: true });

function toast(msg, ms = 2600) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function zoom(src) {
  const z = document.createElement("div");
  z.className = "zoom"; z.innerHTML = `<img src="${esc(src)}" alt="">`;
  z.onclick = () => z.remove();
  document.body.appendChild(z);
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; g.gain.value = 0.06; o.connect(g); g.connect(ctx.destination);
    o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 160);
  } catch (e) { /* sem som */ }
}

// Reduz a foto no próprio celular antes de enviar (economiza dados e espaço)
function comprimir(file, max = 1600, q = 0.8) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao processar a foto"))), "image/jpeg", q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Arquivo de imagem inválido")); };
    img.src = url;
  });
}
const blobToDataURL = (b) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });

// Sugestão local: procura na base o problema mais parecido (usada no modo demo e se a IA falhar)
const STOP = new Set("a o e de da do das dos em no na nos nas com sem por para um uma uns umas que se ao ou mais esta esta tem ta ja nao muito pouco".split(" "));
function sugestaoLocal(base, area, descricao) {
  const palavras = norm(descricao).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
  let melhor = null, nota = 0;
  for (const b of base) {
    if (b.ativo === false) continue;
    const alvo = norm(b.problema + " " + b.solucao);
    let s = b.area === area ? 2 : 0;
    for (const w of palavras) if (alvo.includes(w.slice(0, Math.max(4, w.length - 2)))) s += 1;
    if (s > nota) { nota = s; melhor = b; }
  }
  if (!melhor || nota < 3) {
    return {
      solucao: "Não encontrei um caso parecido na base. Fotografe bem o problema, descreva onde está e marque como pendente para o engenheiro avaliar.",
      resolve_na_hora: false, equipe: "Manutenção geral", gravidade: "media", chamar_engenheiro: true,
      o_que_dizer_ao_cliente: "Registrei o ponto com foto e o engenheiro vai avaliar e retornar com a solução.", origem: "base",
      corriqueiro: corriqueiroLocal(area, descricao),
    };
  }
  return {
    solucao: melhor.solucao, resolve_na_hora: !!melhor.resolve_na_hora, equipe: melhor.equipe || "Manutenção geral",
    gravidade: melhor.resolve_na_hora ? "baixa" : "media", chamar_engenheiro: /engenheiro/i.test(melhor.solucao),
    o_que_dizer_ao_cliente: melhor.resolve_na_hora ? "Isso a nossa equipe resolve ainda hoje, já estou acionando." : "Registrei com foto. A equipe técnica vai programar o reparo e entramos em contato.",
    origem: "base", base_problema: melhor.problema, corriqueiro: corriqueiroLocal(area, descricao + " " + melhor.problema),
  };
}

// =====================================================================
// CAMADA DE DADOS · DEMONSTRAÇÃO (localStorage + BroadcastChannel)
// =====================================================================
function DemoStore() {
  const KEY = "vistoria-demo-v4";
  const ch = "BroadcastChannel" in window ? new BroadcastChannel("vistoria-demo") : null;
  const ouvintes = new Set();
  let db = null;
  const load = () => { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; } };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { toast("Memória do navegador cheia (modo demonstração). Apague fotos antigas."); throw e; }
    ch && ch.postMessage("mudou");
  };
  load();
  if (!db) {
    const empId = uid();
    db = {
      empreendimentos: [{ id: empId, nome: CFG.EMPREENDIMENTO_PADRAO || "Residencial São Lucas", cidade: "Criciúma-SC", endereco: "" }],
      unidades: (window.UNIDADES_DEMO || []).map((u) => ({ id: uid(), empreendimento_id: empId, status: "pendente", ...u })),
      vistorias: [], ocorrencias: [], fotos: {}, agendamentos: [],
      base: (window.BASE_SOLUCOES || []).map((b) => ({ id: uid(), ativo: true, ...b })),
      perfis: [
        { id: "demo-adm", nome: "Eduardo", papel: "admin" },
        { id: "demo-eng1", nome: "Renata", papel: "engenheiro" },
        { id: "demo-eng2", nome: "Maria Eduarda", papel: "engenheiro" },
        ...["Ricardo", "Henrique", "Wesley", "Junior", "João Victor", "Gabriel", "Mario André", "Ana"].map((n, i) => ({ id: "demo-v" + i, nome: n, papel: "vistoriador" })),
      ],
    };
    db.agendamentos = (window.AGENDA_DEMO || []).map((a) => {
      const u = db.unidades.find((x) => x.bloco === a.bloco && x.numero === a.numero);
      return u ? { id: uid(), empreendimento_id: empId, unidade_id: u.id, data: a.data, hora: a.hora, cliente: a.cliente || u.proprietario, responsavel: a.responsavel, equipe: a.equipe, observacao: "" } : null;
    }).filter(Boolean);
    save();
  }
  const avisar = () => ouvintes.forEach((f) => f());
  ch && (ch.onmessage = () => { load(); avisar(); });
  window.addEventListener("storage", (e) => { if (e.key === KEY) { load(); avisar(); } });
  const meId = () => sessionStorage.getItem("demo-me");

  return {
    demo: true,
    async session() { return meId() ? db.perfis.find((p) => p.id === meId()) || null : null; },
    async signIn(perfilId) { sessionStorage.setItem("demo-me", perfilId); return db.perfis.find((p) => p.id === perfilId); },
    async signOut() { sessionStorage.removeItem("demo-me"); },
    async perfis() { return db.perfis; },
    async empreendimentos() { return db.empreendimentos; },
    async salvarEmp(id, patch) { Object.assign(db.empreendimentos.find((e) => e.id === id), patch); save(); },
    async unidades(empId) { return db.unidades.filter((u) => u.empreendimento_id === empId); },
    async unidade(id) { return db.unidades.find((u) => u.id === id) || null; },
    async agenda(empId) { return (db.agendamentos || []).filter((a) => a.empreendimento_id === empId).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)); },
    async salvarUnidades(empId, rows) {
      let n = 0;
      for (const r of rows) {
        const ex = db.unidades.find((u) => u.empreendimento_id === empId && u.bloco === r.bloco && u.numero === r.numero);
        if (ex) Object.assign(ex, { proprietario: r.proprietario, telefone: r.telefone || "" });
        else db.unidades.push({ id: uid(), empreendimento_id: empId, status: "pendente", ...r });
        n++;
      }
      save(); return n;
    },
    async apagarUnidade(id) { db.unidades = db.unidades.filter((u) => u.id !== id); save(); },
    async statusUnidade(id, status) { const u = db.unidades.find((x) => x.id === id); if (u) { u.status = status; save(); } },
    async vistoriaAberta(unidadeId) { return db.vistorias.filter((v) => v.unidade_id === unidadeId).sort((a, b) => b.iniciada_em.localeCompare(a.iniciada_em))[0] || null; },
    async iniciarVistoria(u, acompanhante) {
      const v = { id: uid(), unidade_id: u.id, empreendimento_id: u.empreendimento_id, vistoriador_id: meId(), acompanhante, observacoes: "", status: "em_andamento", iniciada_em: new Date().toISOString(), concluida_em: null };
      db.vistorias.push(v); const x = db.unidades.find((y) => y.id === u.id); if (x) x.status = "em_vistoria"; save(); return v;
    },
    async atualizarVistoria(id, patch) { const v = db.vistorias.find((x) => x.id === id); Object.assign(v, patch); save(); return v; },
    async vistoriasEmp(empId) { return db.vistorias.filter((v) => v.empreendimento_id === empId); },
    async ocorrenciasEmp(empId) { return db.ocorrencias.filter((o) => o.empreendimento_id === empId); },
    async ocorrenciasUnidade(unidadeId) { return db.ocorrencias.filter((o) => o.unidade_id === unidadeId); },
    async novaOcorrencia(o, blobs) {
      const fotos = [];
      for (const b of blobs) { const p = `demo/${uid()}.jpg`; db.fotos[p] = await blobToDataURL(await comprimir(b, 900, 0.7)); fotos.push(p); }
      const row = { id: uid(), status: "aberta", criado_por: meId(), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(), ...o, fotos };
      db.ocorrencias.push(row); save(); return row;
    },
    async atualizarOcorrencia(id, patch, novasFotos = []) {
      const o = db.ocorrencias.find((x) => x.id === id);
      for (const b of novasFotos) { const p = `demo/${uid()}.jpg`; db.fotos[p] = await blobToDataURL(await comprimir(b, 900, 0.7)); (patch.fotos = patch.fotos || [...o.fotos]).push(p); }
      Object.assign(o, patch, { atualizado_em: new Date().toISOString(), atualizado_por: meId() }); save(); return o;
    },
    async apagarOcorrencia(id) { const o = db.ocorrencias.find((x) => x.id === id); (o?.fotos || []).forEach((p) => delete db.fotos[p]); db.ocorrencias = db.ocorrencias.filter((x) => x.id !== id); save(); },
    async fotoUrls(paths) { const r = {}; paths.forEach((p) => (r[p] = db.fotos[p] || "")); return r; },
    async base() { return db.base; },
    async salvarBase(item) {
      if (item.id) Object.assign(db.base.find((b) => b.id === item.id), item);
      else db.base.push({ ...item, id: uid(), ativo: true });
      save();
    },
    async sugerir(p) { await new Promise((r) => setTimeout(r, 700)); return sugestaoLocal(db.base, p.area, p.descricao); },
    assinar(empId, fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },
    resetar() { localStorage.removeItem(KEY); location.reload(); },
  };
}

// =====================================================================
// CAMADA DE DADOS · SUPABASE
// =====================================================================
// Login curto: "ricardo" vira "ricardo@vistoria.construfase.com.br" (DOMINIO_LOGIN no config.js)
function emailDoUsuario(u) {
  const t = String(u || "").trim().toLowerCase();
  if (t.includes("@")) return t;
  const limpo = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
  return `${limpo}@${CFG.DOMINIO_LOGIN || "vistoria.construfase.com.br"}`;
}

async function SupaStore() {
  const { createClient } = await import(CFG.SUPABASE_JS || "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  // Com sinal fraco a requisição pode ficar "pendurada": corta e deixa o modo sem internet assumir
  const fetchComTempo = (url, opt = {}) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), /\/storage\/v1\/object/.test(String(url)) ? 90000 : 15000);
    if (opt.signal) opt.signal.addEventListener("abort", () => ctl.abort());
    return fetch(url, { ...opt, signal: ctl.signal }).finally(() => clearTimeout(t));
  };
  const sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true }, global: { fetch: fetchComTempo } });
  const urlCache = {};
  let eu = null;
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  // Usuário da sessão guardada no celular (funciona sem internet)
  const usuarioGuardado = () => {
    try {
      const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x));
      return k ? JSON.parse(localStorage.getItem(k)).user || null : null;
    } catch (e) { return null; }
  };
  const meuPerfil = async (userDado) => {
    let user = userDado;
    if (!user) { const { data } = await sb.auth.getSession(); user = data.session?.user || null; }
    if (!user) return null;
    let perfil = null;
    try { const r = await sb.from("perfis").select("*").eq("id", user.id).maybeSingle(); if (r.error) throw r.error; perfil = r.data; localStorage.setItem("vistoria-eu", JSON.stringify(perfil)); }
    catch (e) { try { const g = JSON.parse(localStorage.getItem("vistoria-eu") || "null"); if (g && g.id === user.id) perfil = g; } catch (er) { /* sem perfil guardado */ } }
    eu = perfil ? { ...perfil } : { id: user.id, nome: (user.user_metadata && user.user_metadata.nome) || user.email, papel: "vistoriador" };
    eu.email = user.email; eu.usuario = (user.email || "").split("@")[0];
    eu.trocar = !!(user.user_metadata && user.user_metadata.trocar_senha); return eu;
  };
  async function subirFotos(empId, unidadeId, blobs) {
    const paths = [];
    for (const b of blobs) {
      const c = await comprimir(b);
      const p = `${empId}/${unidadeId}/${uid()}.jpg`;
      ok(await sb.storage.from("fotos").upload(p, c, { contentType: "image/jpeg", upsert: false }));
      paths.push(p);
    }
    return paths;
  }
  return {
    demo: false, sb,
    async session() {
      let user = null;
      try { const { data } = await sb.auth.getSession(); user = data.session?.user || null; } catch (e) { /* sem internet */ }
      if (!user && !navigator.onLine) user = usuarioGuardado(); // sessão vencida e sem sinal: segue com o usuário guardado
      return user ? meuPerfil(user) : null;
    },
    async signIn(usuario, senha) { ok(await sb.auth.signInWithPassword({ email: emailDoUsuario(usuario), password: senha })); return meuPerfil(); },
    async trocarSenha(nova) { ok(await sb.auth.updateUser({ password: nova, data: { trocar_senha: false } })); return meuPerfil(); },
    async signOut() { await sb.auth.signOut(); },
    async perfis() { return ok(await sb.from("perfis").select("*")); },
    async empreendimentos() { return ok(await sb.from("empreendimentos").select("*").order("nome")); },
    async salvarEmp(id, patch) { ok(await sb.from("empreendimentos").update(patch).eq("id", id)); },
    async unidades(empId) { return ok(await sb.from("unidades").select("*").eq("empreendimento_id", empId)); },
    async unidade(id) { return ok(await sb.from("unidades").select("*").eq("id", id).maybeSingle()); },
    async agenda(empId) { return ok(await sb.from("agendamentos").select("*").eq("empreendimento_id", empId).order("data").order("hora")).map((a) => ({ ...a, hora: String(a.hora).slice(0, 5) })); },
    async salvarUnidades(empId, rows) {
      const data = rows.map((r) => ({ empreendimento_id: empId, bloco: r.bloco || "", numero: r.numero, proprietario: r.proprietario || "", telefone: r.telefone || "" }));
      ok(await sb.from("unidades").upsert(data, { onConflict: "empreendimento_id,bloco,numero" }));
      return data.length;
    },
    async apagarUnidade(id) { ok(await sb.from("unidades").delete().eq("id", id)); },
    async statusUnidade(id, status) { ok(await sb.from("unidades").update({ status }).eq("id", id)); },
    async vistoriaAberta(unidadeId) { return ok(await sb.from("vistorias").select("*").eq("unidade_id", unidadeId).order("iniciada_em", { ascending: false }).limit(1))[0] || null; },
    async iniciarVistoria(u, acompanhante) {
      const v = ok(await sb.from("vistorias").insert({ unidade_id: u.id, empreendimento_id: u.empreendimento_id, vistoriador_id: eu?.id, acompanhante }).select().single());
      await sb.from("unidades").update({ status: "em_vistoria" }).eq("id", u.id);
      return v;
    },
    async atualizarVistoria(id, patch) { return ok(await sb.from("vistorias").update(patch).eq("id", id).select().single()); },
    async vistoriasEmp(empId) { return ok(await sb.from("vistorias").select("*").eq("empreendimento_id", empId)); },
    async ocorrenciasEmp(empId) { return ok(await sb.from("ocorrencias").select("*").eq("empreendimento_id", empId).order("criado_em", { ascending: false })); },
    async ocorrenciasUnidade(unidadeId) { return ok(await sb.from("ocorrencias").select("*").eq("unidade_id", unidadeId).order("criado_em")); },
    async novaOcorrencia(o, blobs) {
      const fotos = await subirFotos(o.empreendimento_id, o.unidade_id, blobs);
      return ok(await sb.from("ocorrencias").insert({ ...o, fotos, criado_por: eu?.id }).select().single());
    },
    async atualizarOcorrencia(id, patch, novasFotos = []) {
      if (novasFotos.length) {
        const atual = ok(await sb.from("ocorrencias").select("fotos, empreendimento_id, unidade_id").eq("id", id).single());
        const extra = await subirFotos(atual.empreendimento_id, atual.unidade_id, novasFotos);
        patch.fotos = [...(patch.fotos || atual.fotos || []), ...extra];
      }
      return ok(await sb.from("ocorrencias").update({ ...patch, atualizado_por: eu?.id }).eq("id", id).select().single());
    },
    async apagarOcorrencia(id) {
      const o = ok(await sb.from("ocorrencias").select("fotos").eq("id", id).single());
      if (o.fotos?.length) await sb.storage.from("fotos").remove(o.fotos);
      ok(await sb.from("ocorrencias").delete().eq("id", id));
    },
    // Executa uma alteração da fila do modo sem internet (pode repetir sem duplicar)
    async executar(op) {
      for (const f of op.fotos || []) ok(await sb.storage.from("fotos").upload(f.path, f.blob, { contentType: "image/jpeg", upsert: true }));
      if (op.tipo === "vist_ins") {
        ok(await sb.from("vistorias").upsert(op.dados, { onConflict: "id" }));
        ok(await sb.from("unidades").update({ status: "em_vistoria" }).eq("id", op.dados.unidade_id));
      } else if (op.tipo === "vist_upd") ok(await sb.from("vistorias").update(op.patch).eq("id", op.id));
      else if (op.tipo === "uni_status") ok(await sb.from("unidades").update({ status: op.status }).eq("id", op.id));
      else if (op.tipo === "occ_ins") ok(await sb.from("ocorrencias").upsert(op.dados, { onConflict: "id" }));
      else if (op.tipo === "occ_upd") ok(await sb.from("ocorrencias").update(op.patch).eq("id", op.id));
      else if (op.tipo === "occ_del") {
        if (op.remover?.length) await sb.storage.from("fotos").remove(op.remover);
        ok(await sb.from("ocorrencias").delete().eq("id", op.id));
      } else throw new Error("Tipo desconhecido: " + op.tipo);
    },
    get euId() { return eu?.id; },
    async fotoUrls(paths) {
      const falta = paths.filter((p) => !urlCache[p]);
      if (falta.length) {
        const { data } = await sb.storage.from("fotos").createSignedUrls(falta, 60 * 60 * 6);
        (data || []).forEach((d) => { if (d.signedUrl) urlCache[d.path] = d.signedUrl; });
      }
      const r = {}; paths.forEach((p) => (r[p] = urlCache[p] || "")); return r;
    },
    async base() { return ok(await sb.from("base_solucoes").select("*").order("area").order("problema")); },
    async salvarBase(item) {
      const { id, ...rest } = item;
      if (id) ok(await sb.from("base_solucoes").update(rest).eq("id", id));
      else ok(await sb.from("base_solucoes").insert(rest));
    },
    async sugerir(p) {
      if (!CFG.IA) return sugestaoLocal(await this.base(), p.area, p.descricao); // custo zero: só a base de soluções
      try {
        const { data, error } = await sb.functions.invoke("sugerir", { body: p });
        if (error || !data || data.error) throw new Error((data && data.error) || error?.message || "IA indisponível");
        return { ...data, origem: "ia" };
      } catch (e) {
        const base = await this.base();
        return { ...sugestaoLocal(base, p.area, p.descricao), aviso: "IA indisponível agora; sugestão tirada da base de soluções." };
      }
    },
    assinar(empId, fn) {
      const c = sb.channel("emp-" + empId)
        .on("postgres_changes", { event: "*", schema: "public", table: "ocorrencias", filter: `empreendimento_id=eq.${empId}` }, (p) => fn(p))
        .on("postgres_changes", { event: "*", schema: "public", table: "unidades", filter: `empreendimento_id=eq.${empId}` }, (p) => fn(p))
        .on("postgres_changes", { event: "*", schema: "public", table: "vistorias", filter: `empreendimento_id=eq.${empId}` }, (p) => fn(p))
        .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos", filter: `empreendimento_id=eq.${empId}` }, (p) => fn(p))
        .subscribe();
      return () => sb.removeChannel(c);
    },
  };
}

// =====================================================================
// MODO SEM INTERNET
// O celular guarda uma cópia dos dados (IndexedDB). Toda alteração entra numa fila e sobe
// sozinha quando o sinal volta. A tela sempre mostra a cópia local + o que está na fila.
// =====================================================================
const ehErroRede = (e) => !navigator.onLine || /failed to fetch|load failed|networkerror|network request failed|abort|timeout|tempo esgotado/i.test(String((e && (e.message || e.name)) || e));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function abrirIDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("vistoria-offline", 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("fila", { keyPath: "seq", autoIncrement: true }); d.createObjectStore("espelho"); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function idbReq(db, store, modo, fn) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, modo); let out;
    const req = fn(tx.objectStore(store));
    if (req) req.onsuccess = () => (out = req.result);
    tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
}

async function ComOffline(R) {
  let db;
  try { db = await abrirIDB(); } catch (e) { console.warn("Sem IndexedDB: modo sem internet desligado", e); return R; }
  const TABS = ["perfis", "empreendimentos", "unidades", "vistorias", "ocorrencias", "agendamentos", "base"];
  const M = {};
  for (const t of TABS) M[t] = (await idbReq(db, "espelho", "readonly", (s) => s.get(t))) || [];
  let fila = (await idbReq(db, "fila", "readonly", (s) => s.getAll())) || [];
  let enviando = false, semServidor = false;
  const ouvintes = new Set();
  const estado = () => ({ online: navigator.onLine && !semServidor, pendentes: fila.length, enviando, erro: fila[0] && fila[0].erros >= 3 ? fila[0].ultimoErro || "erro" : "" });
  const avisar = () => { const st = estado(); ouvintes.forEach((f) => { try { f(st); } catch (e) { console.error(e); } }); };

  // ---- espelho local
  const tSalvar = {};
  const salvarTab = (t) => { clearTimeout(tSalvar[t]); tSalvar[t] = setTimeout(() => idbReq(db, "espelho", "readwrite", (s) => s.put(M[t], t)).catch(console.error), 300); };
  const porId = (t, id) => M[t].find((r) => r.id === id);
  const upsertM = (t, row) => { const i = M[t].findIndex((r) => r.id === row.id); if (i >= 0) M[t][i] = { ...M[t][i], ...row }; else M[t].push({ ...row }); salvarTab(t); };
  const patchM = (t, id, patch) => { const r = porId(t, id); if (r) Object.assign(r, patch); salvarTab(t); };
  const removerM = (t, id) => { M[t] = M[t].filter((r) => r.id !== id); salvarTab(t); };
  function aplicar(op) {
    if (op.tipo === "vist_ins") { upsertM("vistorias", op.dados); patchM("unidades", op.dados.unidade_id, { status: "em_vistoria" }); }
    else if (op.tipo === "vist_upd") patchM("vistorias", op.id, op.patch);
    else if (op.tipo === "uni_status") patchM("unidades", op.id, { status: op.status });
    else if (op.tipo === "occ_ins") upsertM("ocorrencias", op.dados);
    else if (op.tipo === "occ_upd") patchM("ocorrencias", op.id, op.patch);
    else if (op.tipo === "occ_del") removerM("ocorrencias", op.id);
  }
  // fotos que ainda não subiram aparecem direto do celular
  const fotoLocal = {};
  const indexarFotos = (op) => (op.fotos || []).forEach((f) => { if (!fotoLocal[f.path]) fotoLocal[f.path] = URL.createObjectURL(f.blob); });
  fila.forEach(indexarFotos);

  // ---- leitura: internet (até 6 s) ou cópia local; a fila é reaplicada por cima
  async function ler(t, rede, filtro) {
    if (navigator.onLine) {
      const p = rede().then((rows) => {
        M[t] = M[t].filter((r) => !filtro(r)).concat(rows.map((r) => ({ ...r })));
        fila.forEach(aplicar); salvarTab(t);
        if (semServidor) { semServidor = false; avisar(); sincronizar(); }
      });
      try { await Promise.race([p, dormir(6000).then(() => { throw new Error("tempo esgotado"); })]); }
      catch (e) {
        if (!ehErroRede(e)) throw e;
        p.catch(() => null);
        if (!semServidor) { semServidor = true; avisar(); }
      }
    }
    return M[t].filter(filtro).map((r) => ({ ...r }));
  }
  const ordem = (campos) => (a, b) => { for (const [c, d] of campos) { const x = String(a[c] ?? ""), y = String(b[c] ?? ""); if (x !== y) return (x < y ? -1 : 1) * d; } return 0; };

  // ---- fila de envio
  async function enfileirar(op) {
    op.criado = Date.now(); op.erros = 0;
    aplicar(op); indexarFotos(op);
    op.seq = await idbReq(db, "fila", "readwrite", (s) => s.add(op));
    fila.push(op); avisar();
    sincronizar();
  }
  async function sincronizar(manual = false) {
    if (enviando || !fila.length || !navigator.onLine) { avisar(); return; }
    if (fila[0].erros >= 3 && !manual) { avisar(); return; }
    if (manual) fila[0].erros = 0;
    enviando = true; avisar();
    try {
      while (fila.length && navigator.onLine) {
        const op = fila[0];
        try { await R.executar(op); }
        catch (e) {
          if (ehErroRede(e)) { semServidor = true; break; }
          op.erros = (op.erros || 0) + 1; op.ultimoErro = e.message;
          await idbReq(db, "fila", "readwrite", (s) => s.put(op));
          if (op.erros >= 3) break;
          await dormir(2000); continue;
        }
        semServidor = false;
        await idbReq(db, "fila", "readwrite", (s) => s.delete(op.seq));
        fila.shift(); avisar();
      }
    } finally { enviando = false; avisar(); }
  }
  window.addEventListener("online", () => { semServidor = false; sincronizar(); });
  window.addEventListener("offline", avisar);
  setInterval(() => { semServidor = false; sincronizar(); }, 20000);

  async function prepararFotos(empId, unidadeId, blobs) {
    const out = [];
    for (const b of blobs || []) out.push({ path: `${empId}/${unidadeId}/${uid()}.jpg`, blob: await comprimir(b) });
    return out;
  }
  const precisaRede = (fn) => async (...a) => {
    if (!navigator.onLine) throw new Error("Sem internet. Isso só funciona com conexão.");
    return fn(...a);
  };

  const W = {
    demo: false, sb: R.sb, offline: true,
    // sessão e conta
    session: () => R.session(),
    signIn: precisaRede((u, s) => R.signIn(u, s)),
    trocarSenha: precisaRede((n) => R.trocarSenha(n)),
    async signOut() {
      if (fila.length) throw new Error(`Ainda há ${fila.length} alteração(ões) aguardando envio. Conecte-se à internet antes de sair.`);
      await R.signOut().catch(() => null);
      for (const t of TABS) M[t] = [];
      await idbReq(db, "espelho", "readwrite", (s) => s.clear()).catch(() => null);
      localStorage.removeItem("vistoria-eu");
    },
    // leituras
    perfis: () => ler("perfis", () => R.perfis(), () => true),
    empreendimentos: async () => (await ler("empreendimentos", () => R.empreendimentos(), () => true)).sort(ordem([["nome", 1]])),
    unidades: (empId) => ler("unidades", () => R.unidades(empId), (r) => r.empreendimento_id === empId),
    unidade: async (id) => (await ler("unidades", async () => { const u = await R.unidade(id); return u ? [u] : []; }, (r) => r.id === id))[0] || null,
    agenda: async (empId) => (await ler("agendamentos", () => R.agenda(empId), (r) => r.empreendimento_id === empId)).sort(ordem([["data", 1], ["hora", 1]])),
    async vistoriaAberta(unidadeId) {
      const vs = await ler("vistorias", async () => { const v = await R.vistoriaAberta(unidadeId); return v ? [v] : []; }, (r) => r.unidade_id === unidadeId);
      return vs.sort(ordem([["iniciada_em", -1]]))[0] || null;
    },
    vistoriasEmp: (empId) => ler("vistorias", () => R.vistoriasEmp(empId), (r) => r.empreendimento_id === empId),
    ocorrenciasEmp: async (empId) => (await ler("ocorrencias", () => R.ocorrenciasEmp(empId), (r) => r.empreendimento_id === empId)).sort(ordem([["criado_em", -1]])),
    ocorrenciasUnidade: async (unidadeId) => (await ler("ocorrencias", () => R.ocorrenciasUnidade(unidadeId), (r) => r.unidade_id === unidadeId)).sort(ordem([["criado_em", 1]])),
    base: async () => (await ler("base", () => R.base(), () => true)).sort(ordem([["area", 1], ["problema", 1]])),
    async precarregar(empId) {
      if (!navigator.onLine) return;
      await Promise.all([W.perfis(), W.unidades(empId), W.agenda(empId), W.vistoriasEmp(empId), W.ocorrenciasEmp(empId), W.base()]).catch(console.error);
    },
    // alterações (funcionam sem internet)
    async iniciarVistoria(u, acompanhante) {
      const dados = { id: uid(), unidade_id: u.id, empreendimento_id: u.empreendimento_id, vistoriador_id: R.euId || null, acompanhante, observacoes: "", chaves: "", prazo_reparo: null, status: "em_andamento", iniciada_em: new Date().toISOString(), concluida_em: null };
      await enfileirar({ tipo: "vist_ins", dados });
      return { ...dados };
    },
    async atualizarVistoria(id, patch) { await enfileirar({ tipo: "vist_upd", id, patch }); return { ...(porId("vistorias", id) || { id }) }; },
    async statusUnidade(id, status) { await enfileirar({ tipo: "uni_status", id, status }); },
    async novaOcorrencia(o, blobs) {
      const fotos = await prepararFotos(o.empreendimento_id, o.unidade_id, blobs);
      const agora = new Date().toISOString();
      const dados = { ...o, id: uid(), fotos: fotos.map((f) => f.path), criado_por: R.euId || null, criado_em: agora, atualizado_em: agora };
      await enfileirar({ tipo: "occ_ins", dados, fotos });
      return { ...dados };
    },
    async atualizarOcorrencia(id, patch, novasFotos = []) {
      const atual = porId("ocorrencias", id) || {};
      const fotos = await prepararFotos(atual.empreendimento_id, atual.unidade_id, novasFotos);
      const p = { ...patch, atualizado_por: R.euId || null, atualizado_em: new Date().toISOString() };
      if (fotos.length) p.fotos = [...(patch.fotos || atual.fotos || []), ...fotos.map((f) => f.path)];
      await enfileirar({ tipo: "occ_upd", id, patch: p, fotos });
      return { ...(porId("ocorrencias", id) || { id }) };
    },
    async apagarOcorrencia(id) { const o = porId("ocorrencias", id); await enfileirar({ tipo: "occ_del", id, remover: (o && o.fotos) || [] }); },
    async fotoUrls(paths) {
      const r = {}, rede = paths.filter((p) => !fotoLocal[p]);
      let u = {};
      if (rede.length && navigator.onLine) { try { u = await R.fotoUrls(rede); } catch (e) { /* sem internet */ } }
      paths.forEach((p) => (r[p] = fotoLocal[p] || u[p] || ""));
      return r;
    },
    async sugerir(p) {
      if (!CFG.IA || !navigator.onLine) return sugestaoLocal(await W.base(), p.area, p.descricao);
      return R.sugerir(p);
    },
    // só com internet (cadastros e administração)
    salvarUnidades: precisaRede((e, r) => R.salvarUnidades(e, r)),
    apagarUnidade: precisaRede((id) => R.apagarUnidade(id)),
    salvarEmp: precisaRede((id, p) => R.salvarEmp(id, p)),
    salvarBase: precisaRede((i) => R.salvarBase(i)),
    assinar: (empId, fn) => R.assinar(empId, fn),
    // estado da fila
    estado, sincronizar,
    aoMudar(fn) { ouvintes.add(fn); fn(estado()); return () => ouvintes.delete(fn); },
    pendente: (id) => fila.some((op) => op.id === id || (op.dados && op.dados.id === id)),
    errosFila: () => fila.filter((op) => op.erros >= 3).map((op) => ({ seq: op.seq, tipo: op.tipo, erro: op.ultimoErro })),
    async descartarPrimeiro() {
      const op = fila[0]; if (!op) return;
      await idbReq(db, "fila", "readwrite", (s) => s.delete(op.seq));
      fila.shift(); avisar(); sincronizar();
    },
  };
  return W;
}

// =====================================================================
// ESTADO E NAVEGAÇÃO
// =====================================================================
let S = null;            // camada de dados
let EU = null;           // usuário logado
let EMP = null;          // empreendimento atual
let EMPS = [];
let PERFIS = {};
let desassinar = null;   // cancela tempo real da tela anterior
let SEQ = 0;             // número da tela atual (evita assinaturas duplicadas)

const go = (h) => { if (location.hash === h) rotear(); else location.hash = h; };
function vincular(meu, cancelar) { if (meu !== SEQ) cancelar(); else desassinar = cancelar; }
function topo({ titulo, sub, voltar } = {}) {
  $("#top").innerHTML = `
    ${voltar ? `<button class="back" aria-label="Voltar" data-back="${esc(voltar)}">${ic("back")}</button>` : `<img class="logo" src="img/logo-construfase.png" alt="Construfase">`}
    <div class="ttl"><b>${esc(titulo || "Vistoria de Entrega")}</b><small>${esc(sub || (EMP ? EMP.nome : ""))}</small></div>
    ${EU ? `<button class="me" id="btnMe"><span class="avatar">${esc((EU.nome || "?").trim().charAt(0).toUpperCase())}</span>${esc((EU.nome || "").split(" ")[0] || "Conta")}</button>` : ""}`;
  const b = $("[data-back]"); if (b) b.onclick = () => go(b.dataset.back);
  const m = $("#btnMe"); if (m) m.onclick = menuConta;
}
const rodape = (html) => { $("#bottom").innerHTML = html ? `<div class="bottom"><div class="in">${html}</div></div>` : ""; };
// Barra de navegação das telas principais
function navegacao(ativa) {
  const it = (h, n, t, k) => `<a href="${h}" class="${ativa === k ? "on" : ""}">${ic(n)}<span>${t}</span></a>`;
  $("#bottom").innerHTML = `<nav class="nav"><div class="in">${it("#/", "inicio", "Início", "inicio")}${it("#/unidades", "vistoria", "Vistoria", "unidades")}${it("#/painel", "painel", "Painel", "painel")}${it("#/base", "base", "Soluções", "base")}</div></nav>`;
}
const app = (html) => { $("#app").innerHTML = html; window.scrollTo(0, 0); };

function menuConta() {
  sheet(`<h3>Conta</h3>`, `
    <div class="card"><b>${esc(EU.nome)}</b><div class="muted small">${esc(PAPEIS[EU.papel] || EU.papel)}${EU.usuario ? " · usuário: " + esc(EU.usuario) : ""}</div></div>
    <label class="f">Empreendimento</label>
    <select class="inp" id="selEmp">${EMPS.map((e) => `<option value="${e.id}" ${EMP && e.id === EMP.id ? "selected" : ""}>${esc(e.nome)}</option>`).join("")}</select>
    ${S.demo ? "" : `<div style="height:12px"></div><button class="btn block" id="btnSenha">${ic("chave")} Trocar minha senha</button>`}
    ${S.demo ? `<label class="f">Modo demonstração</label><button class="btn danger block" id="btnReset">Apagar dados de teste</button>` : ""}`,
    `<button class="btn" data-close>Fechar</button><button class="btn dark" id="btnSair">Sair</button>`,
    (el, fechar) => {
      $("#selEmp", el).onchange = (e) => { EMP = EMPS.find((x) => x.id === e.target.value); localStorage.setItem("vistoria-emp", EMP.id); fechar(); rotear(); };
      $("#btnSair", el).onclick = async () => { try { await S.signOut(); EU = null; fechar(); go("#/"); } catch (e) { toast(e.message, 5000); } };
      const bs = $("#btnSenha", el); if (bs) bs.onclick = () => { fechar(); telaTrocarSenha(false); };
      const r = $("#btnReset", el); if (r) r.onclick = async () => { if (await confirmar("Apagar todos os dados de teste deste navegador?", "Apagar")) S.resetar(); };
    });
}

// Folha (modal) reutilizável
function sheet(head, body, foot, onMount) {
  const bg = document.createElement("div");
  bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="hd">${head}<button class="x" data-close aria-label="Fechar">${ic("x")}</button></div>${body}<div class="ft"><div class="in">${foot || ""}</div></div></div>`;
  const fechar = () => { bg.remove(); document.body.style.overflow = ""; };
  bg.addEventListener("click", (e) => { if (e.target === bg || e.target.closest("[data-close]")) fechar(); });
  document.body.appendChild(bg); document.body.style.overflow = "hidden";
  onMount && onMount(bg, fechar);
  return fechar;
}

// Diálogos próprios (não dependem de confirm/prompt do navegador)
function confirmar(msg, ok = "Confirmar") {
  return new Promise((res) => {
    let feito = false;
    const fechar = sheet(`<h3>Confirmar</h3>`, `<p>${esc(msg)}</p>`, `<button class="btn" data-close>Cancelar</button><button class="btn dark" id="cfOk">${esc(ok)}</button>`,
      (el, f) => { $("#cfOk", el).onclick = () => { feito = true; f(); res(true); }; });
    const obs = new MutationObserver(() => { if (!document.body.contains(document.querySelector("#cfOk")) && !feito) { obs.disconnect(); res(false); } });
    obs.observe(document.body, { childList: true });
    return fechar;
  });
}
function perguntar(msg, dica = "") {
  return new Promise((res) => {
    let feito = false;
    sheet(`<h3>${esc(msg)}</h3>`, `<input class="inp" id="pgIn" placeholder="${esc(dica)}">`, `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="pgOk">OK</button>`,
      (el, f) => { const i = $("#pgIn", el); i.focus(); const ok = () => { feito = true; const v = i.value.trim(); f(); res(v); }; $("#pgOk", el).onclick = ok; i.onkeydown = (e) => { if (e.key === "Enter") ok(); }; });
    const obs = new MutationObserver(() => { if (!document.querySelector("#pgOk") && !feito) { obs.disconnect(); res(""); } });
    obs.observe(document.body, { childList: true });
  });
}

async function rotear() {
  if (desassinar) { desassinar(); desassinar = null; }
  SEQ++;
  rodape("");
  const h = location.hash || "#/";
  const [, rota, arg] = h.split("/");
  try {
    if (!EU) return telaLogin();
    if (EU.trocar) return telaTrocarSenha(true);
    if (!EMP) return app(`<div class="empty">Nenhum empreendimento cadastrado.</div>`);
    if (rota === "unidades") return telaUnidades();
    if (rota === "vistoria" && arg) return telaVistoria(arg);
    if (rota === "painel") return telaPainel();
    if (rota === "base") return telaBase();
    if (rota === "termo" && arg && CFG.TERMO_IMPRESSO) return telaTermo(arg);
    if (rota === "relatorio") return telaRelatorio();
    if (rota === "cadastro") return telaCadastro();
    return telaInicio();
  } catch (e) {
    console.error(e);
    app(`<div class="card"><b>Algo deu errado.</b><p class="muted small">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Tentar de novo</button></div>`);
  }
}

// =====================================================================
// TELAS
// =====================================================================
async function telaLogin() {
  topo({ titulo: "Vistoria de Entrega", sub: "Construfase" });
  if (S.demo) {
    const ps = await S.perfis();
    app(`<h1>Entrar</h1><p class="sub">Modo demonstração: escolha como quer testar.</p>
      <div class="list">${ps.map((p) => `<button class="unit" data-p="${p.id}"><span class="num on">${ic(p.papel === "engenheiro" ? "painel" : p.papel === "admin" ? "predio" : "vistoria")}</span><span class="who"><b>${esc(p.nome)}</b><small>${esc(PAPEIS[p.papel])}</small></span>${ic("chevron")}</button>`).join("")}</div>`);
    document.querySelectorAll("[data-p]").forEach((b) => (b.onclick = async () => { EU = await S.signIn(b.dataset.p); await posLogin(); }));
    return;
  }
  app(`<div style="max-width:420px;margin:30px auto">
    <h1>Entrar</h1><p class="sub">Digite seu usuário (seu primeiro nome, ex.: <b>ricardo</b>) e sua senha.</p>
    <form id="fLogin" class="card">
      <label class="f" for="em">Usuário</label><input class="inp" id="em" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="ex.: ricardo" required>
      <label class="f" for="pw">Senha</label><input class="inp" id="pw" type="password" autocomplete="current-password" required>
      <div style="height:14px"></div><button class="btn primary block" type="submit">Entrar</button>
      <p class="muted small" id="msg"></p>
    </form></div>`);
  $("#fLogin").onsubmit = async (e) => {
    e.preventDefault();
    $("#msg").textContent = "Entrando...";
    try { EU = await S.signIn($("#em").value.trim(), $("#pw").value); await posLogin(); }
    catch (err) { $("#msg").textContent = "Não foi possível entrar: confira usuário e senha."; }
  };
}

// Troca de senha (obrigatória no primeiro acesso)
function telaTrocarSenha(obrigatoria) {
  topo({ titulo: "Vistoria de Entrega", sub: "Construfase" });
  rodape("");
  app(`<div style="max-width:420px;margin:30px auto">
    <h1>${obrigatoria ? "Crie sua senha" : "Trocar senha"}</h1>
    <p class="sub">${obrigatoria ? `Olá, ${esc((EU.nome || "").split(" ")[0])}! É seu primeiro acesso: troque a senha provisória por uma só sua.` : "Escolha a nova senha."} Mínimo de 6 caracteres.</p>
    <form id="fSenha" class="card">
      <label class="f" for="s1">Nova senha</label><input class="inp" id="s1" type="password" autocomplete="new-password" minlength="6" required>
      <label class="f" for="s2">Repita a senha</label><input class="inp" id="s2" type="password" autocomplete="new-password" minlength="6" required>
      <div style="height:14px"></div><button class="btn primary block" type="submit">Salvar senha</button>
      ${obrigatoria ? "" : `<div style="height:8px"></div><a class="btn block" href="#/">Cancelar</a>`}
      <p class="muted small" id="msg"></p>
    </form></div>`);
  $("#fSenha").onsubmit = async (e) => {
    e.preventDefault();
    const a = $("#s1").value, b = $("#s2").value;
    if (a.length < 6) return ($("#msg").textContent = "A senha precisa ter pelo menos 6 caracteres.");
    if (a !== b) return ($("#msg").textContent = "As duas senhas não são iguais.");
    $("#msg").textContent = "Salvando...";
    try { EU = await S.trocarSenha(a); toast("Senha salva"); if (obrigatoria) await posLogin(); else go("#/"); }
    catch (err) { $("#msg").textContent = "Não foi possível salvar: " + err.message; }
  };
}

async function posLogin() {
  EMPS = await S.empreendimentos();
  const salvo = localStorage.getItem("vistoria-emp");
  EMP = EMPS.find((e) => e.id === salvo) || EMPS.find((e) => e.nome === CFG.EMPREENDIMENTO_PADRAO) || EMPS[0] || null;
  (await S.perfis()).forEach((p) => (PERFIS[p.id] = p));
  if (EMP && S.precarregar) S.precarregar(EMP.id); // guarda tudo no celular para usar sem sinal
  if ((!location.hash || location.hash === "#/") && EU.papel === "engenheiro") go("#/painel");
  else rotear();
}

async function telaInicio() {
  topo({});
  navegacao("inicio");
  const [us, os, ag] = await Promise.all([S.unidades(EMP.id), S.ocorrenciasEmp(EMP.id), S.agenda(EMP.id)]);
  const conc = us.filter((u) => u.status === "concluida").length;
  const emV = us.filter((u) => u.status === "em_vistoria").length;
  const hoje = ag.filter((a) => a.data === hojeISO());
  const meus = hoje.filter((a) => ehMeu(a));
  const proxDia = ag.find((a) => a.data > hojeISO());
  const abertas = os.filter((o) => o.status === "aberta" || o.status === "equipe_acionada").length;
  const pct = us.length ? Math.round((conc / us.length) * 100) : 0;
  const agora = new Date().toTimeString().slice(0, 5);
  const prox = (meus.length ? meus : hoje).find((a) => a.hora >= agora);
  const uMap = {}; us.forEach((u) => (uMap[u.id] = u));
  const item = (href, n, t, d) => `<a class="card home-card" href="${href}"><span class="ic">${ic(n)}</span><span><b>${t}</b><small>${d}</small></span><span class="go">${ic("chevron")}</span></a>`;
  app(`
    <div class="hero">
      <div class="row" style="align-items:center">
        <div style="flex:1;min-width:0">
          <div class="eyebrow">Entrega de chaves</div>
          <h1 style="margin-top:6px">Olá, ${esc((EU.nome || "").split(" ")[0])}</h1>
          <div class="muted small">${esc(EMP.nome)} · ${esc(PAPEIS[EU.papel] || "")}</div>
        </div>
        <div class="ring" style="--p:${pct}"><div><b>${conc}</b><small>de ${us.length}</small></div></div>
      </div>
      <div class="row wrap" style="margin-top:14px;gap:8px">
        <span class="tag em_vistoria">${emV} em vistoria</span><span class="tag ${abertas ? "equipe_acionada" : "concluida"}">${abertas} pendência(s)</span>
      </div>
    </div>
    ${hoje.length ? `<a class="card home-card" href="#/unidades" style="border-color:rgba(240,125,26,.55);margin-bottom:12px">
        <span class="ic">${ic("agenda")}</span>
        <span><b>Hoje: ${hoje.length} vistoria(s) agendada(s)</b><small>${meus.length ? `${meus.length} com você` : "Toque para ver a agenda"}${prox ? ` · próxima às ${esc(prox.hora)} · ${esc(uMap[prox.unidade_id] ? unidadeNome(uMap[prox.unidade_id]) : "")}` : ""}</small></span>
        <span class="go">${ic("chevron")}</span></a>`
      : proxDia ? `<a class="card home-card" href="#/unidades" style="margin-bottom:12px"><span class="ic">${ic("agenda")}</span><span><b>Próximas vistorias</b><small>${esc(diaSemana(proxDia.data))} · ${ag.filter((a) => a.data === proxDia.data).length} horário(s)</small></span><span class="go">${ic("chevron")}</span></a>` : ""}
    <div class="grid g2">
      ${item("#/unidades", "vistoria", "Fazer vistoria", "Agenda do dia, unidades e ocorrências com o cliente")}
      ${item("#/painel", "painel", "Painel do engenheiro", "Mapa dos blocos e ocorrências em tempo real")}
      ${EU.papel !== "vistoriador" ? item("#/relatorio", "relatorio", "Relatórios", "Resumo do dia e relatório geral em PDF") : ""}
      ${item("#/base", "base", "Base de soluções", "Problemas comuns e como resolver")}
      ${item("#/cadastro", "predio", "Unidades e proprietários", "Cadastro e importação da planilha")}
    </div>`);
}

// ---------------------------------------------------------- relatórios (resumo do dia e geral) → PDF
const dataLocalISO = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const PERIODOS = { manha: "Manhã (até 12h)", tarde: "Tarde (a partir das 12h)", dia: "Dia todo" };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
function contar(lista, chave) {
  const m = {}; lista.forEach((x) => { const k = typeof chave === "function" ? chave(x) : x[chave]; if (k) m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
function barras(pares, total, max = 12) {
  if (!pares.length) return `<p class="vazio">Nenhum registro.</p>`;
  const topo = pares[0][1];
  return `<table class="barras">${pares.slice(0, max).map(([k, n]) => `<tr><td class="k">${esc(k)}</td><td class="b"><span style="width:${Math.max(3, pct(n, topo))}%"></span></td><td class="n">${n}</td><td class="p">${pct(n, total)}%</td></tr>`).join("")}</table>`;
}
const situacaoOcc = (o) => o.status === "equipe_acionada" ? `Equipe acionada${o.equipe ? ": " + o.equipe : ""}` : ST_OCC[o.status] || o.status;

async function telaRelatorio() {
  topo({ titulo: "Relatórios", sub: EMP.nome, voltar: "#/" });
  rodape("");
  const [us, os, vs, ag] = await Promise.all([S.unidades(EMP.id), S.ocorrenciasEmp(EMP.id), S.vistoriasEmp(EMP.id), S.agenda(EMP.id)]);
  const uMap = {}; us.forEach((u) => (uMap[u.id] = u));
  const datasAg = [...new Set(ag.map((a) => a.data))].sort();
  const hoje = hojeISO();
  const f = {
    tipo: sessionStorage.getItem("rel-tipo") || "dia",
    data: hoje, periodo: new Date().getHours() < 13 ? "manha" : "dia",
    de: datasAg[0] || hoje, ate: datasAg[datasAg.length - 1] || hoje, fotos: false,
  };
  app(`<div class="noprint">
    <div class="opts two" id="rTipo">
      <button class="opt ${f.tipo === "dia" ? "on" : ""}" data-t="dia">${ic("agenda")}<span>Resumo do dia</span></button>
      <button class="opt ${f.tipo === "geral" ? "on" : ""}" data-t="geral">${ic("painel")}<span>Relatório geral</span></button>
    </div>
    <div class="card" id="rFiltros"></div>
    <button class="btn primary block" id="rPdf">${ic("impressora")} Salvar em PDF</button>
    <p class="muted small" style="margin:8px 2px 16px">No celular: toque em <b>Salvar em PDF</b> e, na tela de impressão, escolha <b>Salvar como PDF</b>. Depois é só mandar no WhatsApp ou e-mail.</p>
  </div>
  <div id="rel"></div>`);

  function filtros() {
    $("#rFiltros").innerHTML = f.tipo === "dia"
      ? `<label class="f" for="rData">Dia</label><input class="inp" type="date" id="rData" value="${f.data}">
         ${datasAg.length ? `<div class="chips" style="margin-top:8px">${datasAg.map((d) => `<span class="chip ${f.data === d ? "on" : ""}" data-d="${d}">${esc(diaSemana(d))}</span>`).join("")}</div>` : ""}
         <label class="f">Período</label><div class="chips" id="rPer">${Object.entries(PERIODOS).map(([k, t]) => `<span class="chip ${f.periodo === k ? "on" : ""}" data-p="${k}">${t}</span>`).join("")}</div>
         <label class="f" style="margin-top:12px"><input type="checkbox" id="rFotos" ${f.fotos ? "checked" : ""}> Incluir fotos das pendências</label>`
      : `<div class="row"><div style="flex:1"><label class="f" for="rDe">De</label><input class="inp" type="date" id="rDe" value="${f.de}"></div>
         <div style="flex:1"><label class="f" for="rAte">Até</label><input class="inp" type="date" id="rAte" value="${f.ate}"></div></div>
         <p class="muted small">Padrão: toda a semana de entrega. Mostra quais áreas, cômodos, blocos e tipologias tiveram mais ocorrências.</p>`;
    const on = (sel, ev, fn) => { const e = $(sel); if (e) e[ev] = fn; };
    on("#rData", "onchange", (e) => { f.data = e.target.value; filtros(); gerar(); });
    on("#rDe", "onchange", (e) => { f.de = e.target.value; gerar(); });
    on("#rAte", "onchange", (e) => { f.ate = e.target.value; gerar(); });
    on("#rFotos", "onchange", (e) => { f.fotos = e.target.checked; gerar(); });
    $("#rFiltros").querySelectorAll("[data-d]").forEach((c) => (c.onclick = () => { f.data = c.dataset.d; filtros(); gerar(); }));
    $("#rFiltros").querySelectorAll("[data-p]").forEach((c) => (c.onclick = () => { f.periodo = c.dataset.p; filtros(); gerar(); }));
  }
  $("#rTipo").querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => {
    f.tipo = b.dataset.t; sessionStorage.setItem("rel-tipo", f.tipo);
    $("#rTipo").querySelectorAll("[data-t]").forEach((x) => x.classList.toggle("on", x === b));
    filtros(); gerar();
  }));

  // dentro do período escolhido?
  const noPeriodo = (iso) => {
    if (!iso) return false;
    const d = dataLocalISO(iso);
    if (f.tipo === "geral") return d >= f.de && d <= f.ate;
    if (d !== f.data) return false;
    const h = new Date(iso).getHours();
    return f.periodo === "dia" || (f.periodo === "manha" ? h < 12 : h >= 12);
  };
  const nomeArquivo = () => f.tipo === "dia"
    ? `Resumo vistorias ${EMP.nome} ${f.data.split("-").reverse().join("-")} ${f.periodo === "dia" ? "dia todo" : f.periodo === "manha" ? "manha" : "tarde"}`
    : `Relatorio geral vistorias ${EMP.nome} ${f.de.split("-").reverse().join("-")} a ${f.ate.split("-").reverse().join("-")}`;

  async function gerar() {
    const occ = os.filter((o) => noPeriodo(o.criado_em));
    const vIni = vs.filter((v) => noPeriodo(v.iniciada_em));
    const vFim = vs.filter((v) => v.status === "concluida" && noPeriodo(v.concluida_em));
    const tocadas = new Set([...vIni, ...vFim].map((v) => v.unidade_id).concat(occ.map((o) => o.unidade_id)));
    const naHora = occ.filter((o) => o.status === "resolvida_na_hora").length;
    const pend = occ.filter((o) => o.status === "aberta" || o.status === "equipe_acionada");
    const concluidasTotal = us.filter((u) => u.status === "concluida").length;
    const cab = (titulo, sub) => `<div class="th"><img src="img/logo-construfase.png" alt="Construfase"><div style="flex:1"><h1>${titulo}</h1><div class="sub">${sub}</div></div>
      <div class="small" style="text-align:right">Gerado em ${fmtDataHora(new Date().toISOString())}<br>por ${esc(EU.nome || "")}</div></div>`;
    const kpi = (n, t) => `<div class="kpi"><b>${n}</b><span>${t}</span></div>`;
    const ultimaVist = (uid) => vs.filter((v) => v.unidade_id === uid).sort((a, b) => String(b.iniciada_em).localeCompare(String(a.iniciada_em)))[0];
    let html = "";

    if (f.tipo === "dia") {
      const agDia = ag.filter((a) => a.data === f.data && (f.periodo === "dia" || (f.periodo === "manha" ? a.hora < "12:00" : a.hora >= "12:00")));
      const linhasUni = [...tocadas].map((id) => uMap[id]).filter(Boolean).sort(sortUnidades).map((u) => {
        const v = ultimaVist(u.id); const oU = occ.filter((o) => o.unidade_id === u.id);
        return `<tr><td><b>${esc(unidadeNome(u))}</b><br><span class="sm">${esc(u.proprietario || "")}</span></td><td>${esc(PERFIS[v?.vistoriador_id]?.nome || "")}</td>
          <td>${v ? fmtHora(v.iniciada_em) : ""}${v?.concluida_em ? "–" + fmtHora(v.concluida_em) : ""}</td><td class="c">${oU.length}</td><td class="c">${oU.filter((o) => o.status === "resolvida_na_hora").length}</td>
          <td class="c">${oU.filter((o) => o.status === "aberta" || o.status === "equipe_acionada").length}</td>
          <td>${v?.status === "concluida" ? (v.chaves === "retidas" ? `Retidas · até ${fmtData(v.prazo_reparo)}` : v.chaves === "entregues" ? "Entregues" : "Concluída") : "Em andamento"}</td></tr>`;
      }).join("");
      let fotos = {};
      if (f.fotos) { const ps = pend.flatMap((o) => (o.fotos || []).slice(0, 2)); if (ps.length) fotos = await S.fotoUrls(ps); }
      html = `${cab(`Resumo das vistorias · ${esc(EMP.nome)}`, `${esc(diaSemana(f.data).replace(/^./, (c) => c.toUpperCase()))} · ${PERIODOS[f.periodo]}`)}
        <div class="kpis">${kpi(tocadas.size, "unidades vistoriadas")}${kpi(vFim.length, "vistorias concluídas")}${kpi(occ.length, "ocorrências anotadas")}${kpi(naHora, "resolvidas na hora")}${kpi(pend.length, "pendentes")}${kpi(vFim.filter((v) => v.chaves === "retidas").length, "chaves retidas")}</div>
        <p class="sm">Andamento da entrega: <b>${concluidasTotal} de ${us.length}</b> unidades concluídas (${pct(concluidasTotal, us.length)}%).</p>
        ${f.data && agDia.length ? `<h2>Agenda do período</h2><table><tr><th>Hora</th><th>Unidade</th><th>Cliente</th><th>Responsável</th><th>Situação</th></tr>
          ${agDia.map((a) => { const u = uMap[a.unidade_id]; const v = u && ultimaVist(u.id); const sit = !u ? "" : u.status === "concluida" ? "Concluída" : v ? "Em vistoria" : "Não iniciada";
            return `<tr><td>${esc(a.hora)}</td><td>${u ? esc(unidadeNome(u)) : ""}</td><td>${esc(a.cliente || u?.proprietario || "")}</td><td>${esc(a.responsavel || "")}</td><td class="${sit === "Não iniciada" ? "alerta" : ""}">${sit}</td></tr>`; }).join("")}</table>` : ""}
        <h2>Unidades vistoriadas</h2>
        ${linhasUni ? `<table><tr><th>Unidade</th><th>Vistoriador</th><th>Horário</th><th class="c">Ocorr.</th><th class="c">Na hora</th><th class="c">Pend.</th><th>Chaves</th></tr>${linhasUni}</table>` : `<p class="vazio">Nenhuma vistoria neste período.</p>`}
        <h2>Ocorrências por área</h2>${barras(contar(occ, "area"), occ.length)}
        <h2>Pendências para a engenharia (${pend.length})</h2>
        ${pend.length ? `<table><tr><th>Unidade</th><th>Cômodo · Área</th><th>Descrição</th><th>Grav.</th><th>Situação</th></tr>
          ${pend.slice().sort((a, b) => sortUnidades(uMap[a.unidade_id] || {}, uMap[b.unidade_id] || {})).map((o) => `<tr><td>${esc(uMap[o.unidade_id] ? unidadeNome(uMap[o.unidade_id]) : "")}</td><td>${esc(o.comodo)} · ${esc(o.area)}</td>
            <td>${esc(o.descricao)}${o.corriqueiro === false ? ` <i>(fora da lista FS014-02)</i>` : ""}${f.fotos && o.fotos?.length ? `<div class="fotos">${o.fotos.slice(0, 2).map((p) => fotos[p] ? `<img src="${esc(fotos[p])}" alt="">` : "").join("")}</div>` : ""}</td>
            <td>${o.gravidade === "media" ? "média" : o.gravidade}</td><td>${esc(situacaoOcc(o))}</td></tr>`).join("")}</table>` : `<p class="vazio">Nenhuma pendência. 👏</p>`}`;
    } else {
      const vistUni = new Set(vs.filter((v) => noPeriodo(v.iniciada_em)).map((v) => v.unidade_id));
      const nU = vistUni.size || 1;
      const porTip = contar(occ, (o) => uMap[o.unidade_id]?.tipologia || "Sem tipologia").map(([k, n]) => {
        const qtd = [...vistUni].filter((id) => (uMap[id]?.tipologia || "Sem tipologia") === k).length || 1;
        return [k, n, qtd];
      });
      const porBloco = contar(occ, (o) => uMap[o.unidade_id] ? `Bloco ${uMap[o.unidade_id].bloco}` : "");
      const retidas = vs.filter((v) => v.chaves === "retidas" && v.status === "concluida");
      const abertas = os.filter((o) => o.status === "aberta" || o.status === "equipe_acionada");
      html = `${cab(`Relatório geral da entrega · ${esc(EMP.nome)}`, `${fmtData(f.de)} a ${fmtData(f.ate)}`)}
        <div class="kpis">${kpi(`${concluidasTotal}/${us.length}`, "unidades concluídas")}${kpi(occ.length, "ocorrências")}${kpi((occ.length / nU).toFixed(1).replace(".", ","), "ocorrências por unidade")}${kpi(pct(naHora, occ.length) + "%", "resolvidas na hora")}${kpi(abertas.length, "pendentes hoje")}${kpi(retidas.length, "chaves retidas")}</div>
        <h2>Principais ocorrências por área</h2>${barras(contar(occ, "area"), occ.length, 20)}
        <h2>Onde mais aparece (área + cômodo)</h2>${barras(contar(occ, (o) => `${o.area} · ${o.comodo}`), occ.length, 10)}
        <div class="duas"><div><h2>Por cômodo</h2>${barras(contar(occ, "comodo"), occ.length, 10)}</div><div><h2>Por bloco</h2>${barras(porBloco, occ.length)}</div></div>
        <h2>Por tipologia</h2>
        ${porTip.length ? `<table><tr><th>Tipologia</th><th class="c">Ocorrências</th><th class="c">Unid. vistoriadas</th><th class="c">Média por unidade</th></tr>${porTip.map(([k, n, q]) => `<tr><td>${esc(k)}</td><td class="c">${n}</td><td class="c">${q}</td><td class="c">${(n / q).toFixed(1).replace(".", ",")}</td></tr>`).join("")}</table>` : `<p class="vazio">Nenhum registro.</p>`}
        <div class="duas"><div><h2>Gravidade</h2>${barras(contar(occ, (o) => ({ baixa: "Baixa", media: "Média", alta: "Alta" })[o.gravidade]), occ.length)}</div>
        <div><h2>Como foi resolvido</h2>${barras(contar(occ, (o) => ST_OCC[o.status]), occ.length)}</div></div>
        <div class="duas"><div><h2>Equipes acionadas</h2>${barras(contar(occ.filter((o) => o.status === "equipe_acionada" || o.status === "resolvida"), "equipe"), occ.length)}</div>
        <div><h2>Lista de Serviços Corriqueiros (FS014-02)</h2>${barras([["Na lista", occ.filter((o) => o.corriqueiro !== false).length], ["Fora da lista (aprovação Eng./Adm.)", occ.filter((o) => o.corriqueiro === false).length]].filter((x) => x[1]), occ.length)}</div></div>
        <h2>Chaves com a Construfase (${retidas.length})</h2>
        ${retidas.length ? `<table><tr><th>Unidade</th><th>Proprietário</th><th>Concluída em</th><th>Prazo de reparo</th><th class="c">Pendências</th></tr>${retidas.map((v) => { const u = uMap[v.unidade_id] || {}; return `<tr><td>${esc(unidadeNome(u))}</td><td>${esc(u.proprietario || "")}</td><td>${fmtData(dataLocalISO(v.concluida_em))}</td><td>${fmtData(v.prazo_reparo)}</td><td class="c">${abertas.filter((o) => o.unidade_id === v.unidade_id).length}</td></tr>`; }).join("")}</table>` : `<p class="vazio">Nenhuma.</p>`}`;
    }
    $("#rel").innerHTML = `<div class="rel">${html}<div class="rodape-rel">Construfase · Sistema de Vistoria de Entrega</div></div>`;
  }
  $("#rPdf").onclick = async () => {
    const t = document.title; document.title = nomeArquivo();
    await Promise.all([...document.querySelectorAll("#rel img")].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    try { window.print(); } catch (e) { toast("Use o menu do navegador para imprimir ou salvar em PDF"); }
    setTimeout(() => (document.title = t), 1500);
  };
  filtros(); await gerar();
}

// ---------------------------------------------------------- lista de unidades (+ agenda)
async function telaUnidades() {
  topo({ titulo: "Vistoria", sub: EMP.nome });
  navegacao("unidades");
  let us = [], os = [], ag = [];
  let filtro = sessionStorage.getItem("f-uni") || "agenda", busca = "", dia = sessionStorage.getItem("f-dia") || "";
  const carregar = async () => { [us, os, ag] = await Promise.all([S.unidades(EMP.id), S.ocorrenciasEmp(EMP.id), S.agenda(EMP.id)]); desenhar(); };
  app(`<div class="search">${ic("busca")}<input class="inp" id="busca" placeholder="Buscar por número, bloco ou nome" autocomplete="off"></div>
    <div class="chips" id="fil" style="margin:12px 0 4px"></div><div id="dias" class="chips" style="margin:8px 0 0"></div><div id="lista"></div>`);
  $("#busca").oninput = (e) => { busca = norm(e.target.value); desenhar(); };
  const casa = (u) => !busca || norm(`${u.numero} ${u.proprietario} bloco ${u.bloco} ${u.bloco}-${u.numero}`).includes(busca);
  function linhaUnidade(u, extra, nOcc) {
    return `<a class="unit" href="#/vistoria/${u.id}"><span class="num ${u.status === "em_vistoria" ? "on" : ""}">${esc(u.numero)}</span><span class="who"><b>${esc(u.proprietario || "Sem proprietário")}</b><small>${extra || ""}${nOcc ? (extra ? " · " : "") + nOcc + " pendente(s)" : ""}</small></span><span class="tag ${u.status}">${ST_UNI[u.status]}</span></a>`;
  }
  function desenhar() {
    const cont = { agenda: 0, todas: us.length, pendente: 0, em_vistoria: 0, concluida: 0 };
    us.forEach((u) => cont[u.status]++);
    const dias = [...new Set(ag.map((a) => a.data))].sort();
    if (!dia || !dias.includes(dia)) dia = dias.includes(hojeISO()) ? hojeISO() : (dias.find((d) => d >= hojeISO()) || dias[0] || "");
    cont.agenda = ag.filter((a) => a.data === dia).length;
    const opts = [["agenda", "Agenda"], ["todas", "Todas"], ["pendente", "Pendentes"], ["em_vistoria", "Em vistoria"], ["concluida", "Concluídas"]];
    $("#fil").innerHTML = opts.map(([k, t]) => `<span class="chip ${filtro === k ? "on" : ""}" data-f="${k}">${t} <span class="muted small">${cont[k]}</span></span>`).join("");
    $("#fil").querySelectorAll("[data-f]").forEach((c) => (c.onclick = () => { filtro = c.dataset.f; sessionStorage.setItem("f-uni", filtro); desenhar(); }));
    const nOcc = {}; os.forEach((o) => { if (o.status === "aberta" || o.status === "equipe_acionada") nOcc[o.unidade_id] = (nOcc[o.unidade_id] || 0) + 1; });
    const uMap = {}; us.forEach((u) => (uMap[u.id] = u));
    if (!us.length) { $("#dias").innerHTML = ""; $("#lista").innerHTML = `<div class="empty">Nenhuma unidade cadastrada.<br><a class="btn" style="margin-top:12px" href="#/cadastro">Cadastrar unidades</a></div>`; return; }

    if (filtro === "agenda") {
      $("#dias").innerHTML = dias.map((d) => `<span class="chip ${d === dia ? "on" : ""}" data-d="${d}">${d === hojeISO() ? "Hoje" : esc(diaSemana(d))}</span>`).join("");
      $("#dias").querySelectorAll("[data-d]").forEach((c) => (c.onclick = () => { dia = c.dataset.d; sessionStorage.setItem("f-dia", dia); desenhar(); }));
      const doDia = ag.filter((a) => a.data === dia && uMap[a.unidade_id] && casa(uMap[a.unidade_id]));
      if (!dias.length) { $("#lista").innerHTML = `<div class="empty">Nenhuma vistoria agendada.</div>`; return; }
      if (!doDia.length) { $("#lista").innerHTML = `<div class="empty">Nenhum horário neste dia${busca ? " para esta busca" : ""}.</div>`; return; }
      let html = "", hora = null;
      for (const a of doDia) {
        const u = uMap[a.unidade_id];
        if (a.hora !== hora) { hora = a.hora; html += `<div class="bloco-ttl"><span class="hora">${ic("relogio", "sm")} ${esc(hora)}</span></div>`; }
        const extra = `Bloco ${esc(u.bloco)}${a.responsavel ? " · " + (ehMeu(a) ? "<b style='color:var(--orange-dark)'>com você</b>" : esc(a.responsavel)) : ""}${a.cliente && norm(a.cliente) !== norm(u.proprietario) ? " · agendado: " + esc(a.cliente) : ""}`;
        html += linhaUnidade(u, extra, nOcc[u.id]);
      }
      $("#lista").innerHTML = `<div class="list">${html}</div>`;
      return;
    }
    $("#dias").innerHTML = "";
    const lista = us.filter((u) => (filtro === "todas" || u.status === filtro) && casa(u)).sort(sortUnidades);
    if (!lista.length) { $("#lista").innerHTML = `<div class="empty">Nenhuma unidade encontrada.</div>`; return; }
    let html = "", bloco = null;
    for (const u of lista) {
      if (u.bloco !== bloco) { bloco = u.bloco; html += `<div class="bloco-ttl">${bloco ? "Bloco " + esc(bloco) : "Unidades"}</div>`; }
      html += linhaUnidade(u, esc(u.tipologia || ""), nOcc[u.id]);
    }
    $("#lista").innerHTML = `<div class="list">${html}</div>`;
  }
  const meu = SEQ;
  await carregar();
  vincular(meu, S.assinar(EMP.id, carregar));
}

// ---------------------------------------------------------- cartão de ocorrência
async function cardsOcorrencias(lista, { modo = "vistoria", novos = new Set(), unidades = {} } = {}) {
  const paths = lista.flatMap((o) => o.fotos || []);
  const urls = paths.length ? await S.fotoUrls(paths) : {};
  return lista.map((o) => {
    const u = unidades[o.unidade_id];
    const quem = PERFIS[o.criado_por]?.nome || "";
    const thumbs = (o.fotos || []).slice(0, 3).map((p) => `<img class="thumb" src="${esc(urls[p])}" data-zoom="${esc(urls[p])}" alt="Foto da ocorrência">`).join("");
    let acts = "";
    if (modo === "vistoria") {
      acts = `${o.status === "aberta" ? `<button class="btn sm green" data-act="na_hora" data-id="${o.id}">${ic("check")} Resolvido na hora</button>` : ""}
              <button class="btn sm" data-act="editar" data-id="${o.id}">Editar</button>`;
    } else {
      acts = `${o.status === "aberta" ? `<button class="btn sm primary" data-act="equipe" data-id="${o.id}">Acionar equipe</button>` : ""}
              ${o.status !== "resolvida" && o.status !== "resolvida_na_hora" ? `<button class="btn sm green" data-act="resolvida" data-id="${o.id}">${ic("check")} Resolvida</button>` : ""}
              ${u ? `<a class="btn sm" href="#/vistoria/${u.id}">Abrir unidade</a>` : ""}`;
    }
    return `<div class="occ ${novos.has(o.id) ? "new" : ""}" id="o-${o.id}">
      ${thumbs ? `<div class="thumbs">${thumbs}</div>` : ""}
      <div class="body">
        <div class="meta">${u ? `<b style="color:var(--ink)">${esc(unidadeNome(u))}</b> · ` : ""}${esc(o.comodo)} · ${esc(o.area)} · ${fmtHora(o.criado_em)}${quem && modo !== "vistoria" ? " · " + esc(quem) : ""}</div>
        <div class="desc">${esc(o.descricao)}</div>
        <div class="row wrap" style="gap:6px"><span class="tag ${o.status}">${ST_OCC[o.status]}${o.status === "equipe_acionada" && o.equipe ? ": " + esc(o.equipe) : ""}</span><span class="tag ${o.gravidade}">Gravidade ${o.gravidade === "media" ? "média" : o.gravidade}</span>${o.resolve_na_hora && o.status === "aberta" ? `<span class="tag resolvida">Dá para resolver hoje</span>` : ""}${o.corriqueiro === false ? `<span class="tag alta">Precisa aprovação Eng./Adm.</span>` : ""}${S.pendente && S.pendente(o.id) ? `<span class="tag fila">Aguardando envio</span>` : ""}</div>
        ${o.sugestao ? `<div class="sug">${ic("ia","sm")}<span>${esc(o.sugestao)}</span></div>` : ""}
        <div class="acts">${acts}</div>
      </div></div>`;
  }).join("");
}
function ligarCards(raiz, handlers) {
  raiz.querySelectorAll("[data-zoom]").forEach((i) => (i.onclick = () => zoom(i.dataset.zoom)));
  raiz.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => handlers[b.dataset.act] && handlers[b.dataset.act](b.dataset.id, b)));
}

// ---------------------------------------------------------- vistoria da unidade
async function telaVistoria(unidadeId) {
  let u = await S.unidade(unidadeId);
  if (!u) { app(`<div class="empty">Unidade não encontrada.</div>`); return; }
  topo({ titulo: unidadeNome(u), sub: u.proprietario || EMP.nome, voltar: "#/unidades" });
  let v = await S.vistoriaAberta(u.id);
  let os = [], filtroComodo = "Todos";
  const ag = (await S.agenda(EMP.id)).filter((a) => a.unidade_id === unidadeId);
  const agTxt = ag.map((a) => `${diaSemana(a.data)} às ${a.hora}${a.responsavel ? " · " + a.responsavel : ""}${a.cliente && norm(a.cliente) !== norm(u.proprietario) ? " · agendado por " + a.cliente : ""}`).join("<br>");
  const btnPlanta = () => u.planta ? `<button class="btn sm" id="btnPlanta">${ic("planta")} Ver planta</button>` : "";
  const ligarPlanta = () => { const b = $("#btnPlanta"); if (b) b.onclick = () => sheet(`<h3>Planta · ${esc(u.tipologia || "")}</h3>`, `<img src="img/plantas/${esc(u.planta)}.jpg" alt="Planta da unidade" style="width:100%;background:#fff;border-radius:10px;cursor:zoom-in" onclick="this.style.width=this.style.width==='200%'?'100%':'200%'"><p class="muted small">Toque na planta para ampliar.</p>`, `<button class="btn block" data-close>Fechar</button>`); };

  async function carregar() {
    [u, v, os] = await Promise.all([S.unidade(unidadeId), S.vistoriaAberta(unidadeId), S.ocorrenciasUnidade(unidadeId)]);
    await desenhar();
  }

  async function desenhar() {
    if (!v) {
      app(`<div class="card"><div class="muted small">Proprietário</div><h1 style="margin:2px 0 10px">${esc(u.proprietario || "—")}</h1>
        <div class="muted small">${esc(unidadeNome(u))} · ${esc(u.tipologia || EMP.nome)}</div>
        ${agTxt ? `<div class="small row" style="margin-top:10px;align-items:flex-start;color:var(--orange-2)">${ic("agenda","sm")}<span>${agTxt}</span></div>` : ""}
        <div style="margin-top:10px">${btnPlanta()}</div>
        <label class="f" for="acomp">Quem está acompanhando a vistoria?</label>
        <input class="inp" id="acomp" value="${esc((ag[0] && ag[0].cliente) || u.proprietario || "")}" placeholder="Nome do cliente ou procurador">
        <div style="height:14px"></div>
        <button class="btn primary block" id="btnIni">Iniciar vistoria</button></div>
        <p class="muted small" style="margin-top:14px">Antes de começar: confira se a unidade está limpa, com luz e água ligadas, e se as chaves estão com você.</p>`);
      ligarPlanta();
      $("#btnIni").onclick = async () => { v = await S.iniciarVistoria(u, $("#acomp").value.trim()); u.status = "em_vistoria"; await desenhar(); };
      return;
    }
    const concluida = v.status === "concluida";
    const porComodo = {}; os.forEach((o) => (porComodo[o.comodo] = (porComodo[o.comodo] || 0) + 1));
    const lc = comodosDe(u);
    const comodos = ["Todos", ...lc.filter((c) => porComodo[c]), ...Object.keys(porComodo).filter((c) => !lc.includes(c))];
    const lista = os.filter((o) => filtroComodo === "Todos" || o.comodo === filtroComodo);
    const pend = os.filter((o) => o.status === "aberta").length;
    app(`
      <div class="card">
        <div class="row"><div style="flex:1"><div class="muted small">Proprietário</div><b style="font-size:17px">${esc(u.proprietario || "—")}</b>
        <div class="muted small">${esc(u.tipologia || "")}</div>
        <div class="muted small">Acompanhante: ${esc(v.acompanhante || "—")} · início ${fmtHora(v.iniciada_em)}</div></div>
        <span class="tag ${u.status}">${ST_UNI[u.status]}</span></div>
        <div class="row" style="margin-top:10px">${btnPlanta()}${CFG.TERMO_IMPRESSO ? `<a class="btn sm" href="#/termo/${u.id}">${ic("impressora")} Termo</a>` : ""}</div>
      </div>
      <h2>Ocorrências <span class="muted small">(${os.length}${pend ? `, ${pend} pendente(s)` : ""})</span></h2>
      ${os.length ? `<div class="chips" id="fc">${comodos.map((c) => `<span class="chip ${filtroComodo === c ? "on" : ""}" data-c="${esc(c)}">${esc(c)}${c !== "Todos" ? `<span class="n">${porComodo[c]}</span>` : ""}</span>`).join("")}</div><div style="height:12px"></div>` : ""}
      <div class="list" id="occs">${lista.length ? await cardsOcorrencias(lista) : `<div class="empty">Nenhuma ocorrência anotada${concluida ? "" : " ainda. Toque em <b>Anotar ocorrência</b> quando o cliente apontar algo."}</div>`}</div>
      ${concluida ? `<div class="card" style="margin-top:16px;background:var(--green-soft);border-color:rgba(60,207,130,.4)"><b>Vistoria concluída</b> às ${fmtHora(v.concluida_em)}.${v.chaves === "retidas" ? `<div class="small row" style="margin-top:8px">${ic("cadeado","sm")} Chaves com a Construfase para reparos · prazo <b>${fmtData(v.prazo_reparo)}</b></div>` : v.chaves === "entregues" ? `<div class="small row" style="margin-top:8px">${ic("chave","sm")} Chaves entregues ao cliente</div>` : ""}<div class="row" style="margin-top:10px">${CFG.TERMO_IMPRESSO ? `<a class="btn sm" href="#/termo/${u.id}">${ic("impressora")} Imprimir termo</a>` : ""}<button class="btn sm" id="btnReabrir">Reabrir vistoria</button></div></div>` : ""}
    `);
    ligarPlanta();
    const fc = $("#fc"); if (fc) fc.querySelectorAll("[data-c]").forEach((c) => (c.onclick = () => { filtroComodo = c.dataset.c; desenhar(); }));
    ligarCards($("#occs"), {
      na_hora: async (id) => { await S.atualizarOcorrencia(id, { status: "resolvida_na_hora" }); toast("Marcada como resolvida na hora"); carregar(); },
      editar: (id) => formOcorrencia(u, v, os.find((o) => o.id === id), carregar),
    });
    const r = $("#btnReabrir"); if (r) r.onclick = async () => { await S.atualizarVistoria(v.id, { status: "em_andamento", concluida_em: null }); await S.statusUnidade(u.id, "em_vistoria"); carregar(); };
    rodape(concluida ? "" : `<button class="btn" id="btnFim">Concluir</button><button class="btn primary" id="btnNova" style="flex:2">${ic("plus")} Anotar ocorrência</button>`);
    if (!concluida) {
      $("#btnNova").onclick = () => formOcorrencia(u, v, null, carregar, filtroComodo !== "Todos" ? filtroComodo : null);
      $("#btnFim").onclick = () => concluirVistoria(u, v, os, carregar);
    }
  }
  const meu = SEQ;
  await carregar();
  vincular(meu, S.assinar(EMP.id, () => carregar()));
}

const somaDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtData = (iso) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
function concluirVistoria(u, v, os, depois) {
  const pend = os.filter((o) => o.status === "aberta" || o.status === "equipe_acionada").length;
  let chaves = pend ? "retidas" : "entregues";
  sheet(`<h3>Concluir vistoria</h3>`, `
    <div class="card"><b>${esc(unidadeNome(u))}</b> · ${esc(u.proprietario)}<div class="muted small">${os.length} ocorrência(s) · ${pend} pendente(s)</div></div>
    ${!os.length ? `<p class="small">Nenhuma ocorrência anotada: unidade vistoriada <b>sem pendências</b>.</p>` : ""}
    <label class="f">Chaves</label>
    <div class="chips" id="ch"><span class="chip" data-k="entregues">${ic("chave","sm")} Entregues ao cliente</span><span class="chip" data-k="retidas">${ic("cadeado","sm")} Construfase fica com as chaves</span></div>
    <p class="small muted" id="chMsg"></p>
    <label class="f" for="obs">Observações gerais (opcional)</label>
    <textarea class="inp" id="obs" placeholder="Ex.: cliente pediu retorno sobre a vaga de garagem">${esc(v.observacoes || "")}</textarea>
    <p class="muted small">Depois de concluir, leve o cliente ao escritório da obra para assinar o termo. As pendências ficam nesta tela para consulta.</p>`,
    `<button class="btn" data-close>Voltar</button><button class="btn green" id="ok">Concluir</button>`,
    (el, fechar) => {
      const marcar = () => {
        el.querySelectorAll("[data-k]").forEach((c) => c.classList.toggle("on", c.dataset.k === chaves));
        $("#chMsg", el).textContent = chaves === "retidas" ? `Pelo termo (FS010-02), a Construfase tem até 30 dias para os reparos: prazo ${fmtData(somaDias(30))}. O cliente não pode alterar o apartamento nesse período.` : "As chaves vão com o cliente após a assinatura do termo.";
      };
      $("#ch", el).onclick = (e) => { const c = e.target.closest("[data-k]"); if (c) { chaves = c.dataset.k; marcar(); } };
      marcar();
      $("#ok", el).onclick = async () => {
        await S.atualizarVistoria(v.id, { status: "concluida", concluida_em: new Date().toISOString(), observacoes: $("#obs", el).value.trim(), chaves, prazo_reparo: chaves === "retidas" ? somaDias(30) : null });
        await S.statusUnidade(u.id, "concluida");
        fechar(); toast("Vistoria concluída"); depois();
      };
    });
}

// ---------------------------------------------------------- formulário de ocorrência
function formOcorrencia(u, v, existente, depois, comodoInicial) {
  const ed = existente || {};
  let comodo = ed.comodo || comodoInicial || "", area = ed.area || "", gravidade = ed.gravidade || "media";
  let novasFotos = [], fotosAtuais = [...(ed.fotos || [])], sug = ed.sugestao ? { solucao: ed.sugestao, resolve_na_hora: ed.resolve_na_hora, equipe: ed.equipe, corriqueiro: ed.corriqueiro } : null;
  let ouvindo = null;

  const chipsHTML = (lista, sel, attr) => lista.map((x) => `<span class="chip ${sel === x ? "on" : ""}" data-${attr}="${esc(x)}">${esc(x)}</span>`).join("");
  const body = `
    <label class="f">1 · Cômodo <span style="text-transform:none;letter-spacing:0;font-weight:500">· ${esc(u.tipologia || "")}</span></label><div class="opts rooms" id="cC">${comodosDe(u).map((x) => `<span class="opt ${comodo === x ? "on" : ""}" data-c="${esc(x)}">${esc(x)}</span>`).join("")}<span class="opt" data-c="__outro">${ic("plus", "sm")} Outro</span></div>
    <label class="f">2 · Área</label><div class="opts" id="cA">${AREAS.map((x) => `<span class="opt ${area === x ? "on" : ""}" data-a="${esc(x)}">${ic(x)}${esc(x)}</span>`).join("")}</div>
    <label class="f">3 · Foto</label>
    <div class="photos" id="fts"></div>
    <input type="file" id="fileIn" accept="image/*" capture="environment" multiple class="hidden">
    <label class="f" for="desc">4 · O que o cliente apontou?</label>
    <div class="row" style="align-items:stretch"><textarea class="inp" id="desc" placeholder="Ex.: rejunte falhando atrás do vaso sanitário">${esc(ed.descricao || "")}</textarea></div>
    <div class="row" style="margin-top:8px"><button class="btn sm mic" id="mic" type="button">${ic("mic")} Falar</button><span class="muted small" id="micMsg"></span></div>
    <label class="f">Gravidade</label><div class="chips" id="cG">${[["baixa", "Baixa"], ["media", "Média"], ["alta", "Alta"]].map(([k, t]) => `<span class="chip ${gravidade === k ? "on" : ""}" data-g="${k}">${t}</span>`).join("")}</div>
    <div style="height:14px"></div>
    <button class="btn block primary" id="btnIA" type="button" style="background:transparent;color:var(--orange-2);box-shadow:none">${ic("ia")} Sugerir solução${CFG.IA ? " com IA" : ""}</button>
    <div id="sugBox"></div>
    ${existente ? `<label class="f">Situação</label><div class="chips" id="cS">${Object.entries(ST_OCC).map(([k, t]) => `<span class="chip ${ed.status === k ? "on" : ""}" data-s="${k}">${t}</span>`).join("")}</div>
      <div style="height:16px"></div><button class="btn danger block" id="btnDel" type="button">Excluir ocorrência</button>` : ""}`;
  const foot = existente
    ? `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="salvar" style="flex:2">Salvar</button>`
    : `<button class="btn" id="salvarHora">${ic("check")} Resolvido na hora</button><button class="btn primary" id="salvar" style="flex:1.4">Salvar pendente</button>`;

  sheet(`<h3>${existente ? "Editar ocorrência" : "Nova ocorrência"}</h3>`, body, foot, (el, fechar) => {
    let status = ed.status || "aberta";
    const marcar = (box, attr, val) => box.querySelectorAll(`[data-${attr}]`).forEach((c) => c.classList.toggle("on", c.dataset[attr] === val));
    $("#cC", el).onclick = async (e) => {
      const c = e.target.closest("[data-c]"); if (!c) return;
      if (c.dataset.c === "__outro") { const n = await perguntar("Nome do local", "Ex.: Hall, Escada, Garagem"); if (!n) return; comodo = n; c.insertAdjacentHTML("beforebegin", `<span class="opt" data-c="${esc(comodo)}">${esc(comodo)}</span>`); }
      else comodo = c.dataset.c;
      marcar($("#cC", el), "c", comodo);
    };
    $("#cA", el).onclick = (e) => { const c = e.target.closest("[data-a]"); if (!c) return; area = c.dataset.a; marcar($("#cA", el), "a", area); };
    $("#cG", el).onclick = (e) => { const c = e.target.closest("[data-g]"); if (!c) return; gravidade = c.dataset.g; marcar($("#cG", el), "g", gravidade); };
    const cS = $("#cS", el); if (cS) cS.onclick = (e) => { const c = e.target.closest("[data-s]"); if (!c) return; status = c.dataset.s; marcar(cS, "s", status); };

    // Fotos
    const desenharFotos = async () => {
      const urls = fotosAtuais.length ? await S.fotoUrls(fotosAtuais) : {};
      $("#fts", el).innerHTML =
        fotosAtuais.map((p, i) => `<div class="ph"><img src="${esc(urls[p])}" alt=""><button class="rm" data-rmold="${i}" type="button">${ic("x")}</button></div>`).join("") +
        novasFotos.map((f, i) => `<div class="ph"><img src="${URL.createObjectURL(f)}" alt=""><button class="rm" data-rmnew="${i}" type="button">${ic("x")}</button></div>`).join("") +
        `<div class="addph" id="addph">${ic("camera")}Tirar foto</div>`;
      $("#addph", el).onclick = () => $("#fileIn", el).click();
      el.querySelectorAll("[data-rmnew]").forEach((b) => (b.onclick = () => { novasFotos.splice(+b.dataset.rmnew, 1); desenharFotos(); }));
      el.querySelectorAll("[data-rmold]").forEach((b) => (b.onclick = () => { fotosAtuais.splice(+b.dataset.rmold, 1); desenharFotos(); }));
    };
    $("#fileIn", el).onchange = (e) => { novasFotos.push(...Array.from(e.target.files || [])); e.target.value = ""; desenharFotos(); };
    desenharFotos();

    // Ditado por voz (quando o navegador permite)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const mic = $("#mic", el);
    if (!SR) mic.classList.add("hidden");
    else mic.onclick = () => {
      if (ouvindo) { ouvindo.stop(); return; }
      const r = new SR(); r.lang = "pt-BR"; r.interimResults = false; r.continuous = false;
      const base = $("#desc", el).value;
      r.onresult = (ev) => { const t = Array.from(ev.results).map((x) => x[0].transcript).join(" "); $("#desc", el).value = (base ? base + " " : "") + t; };
      r.onend = () => { ouvindo = null; mic.classList.remove("on"); $("#micMsg", el).textContent = ""; };
      r.onerror = () => { $("#micMsg", el).textContent = "Não consegui ouvir. Digite a ocorrência."; };
      ouvindo = r; mic.classList.add("on"); $("#micMsg", el).textContent = "Ouvindo… fale a ocorrência";
      r.start();
    };

    // Sugestão da IA
    const desenharSug = () => {
      if (!sug) { $("#sugBox", el).innerHTML = ""; return; }
      $("#sugBox", el).innerHTML = `<div class="ai">
        <div class="h">${ic("ia")} ${sug.origem === "ia" ? "Sugestão da IA" : "Sugestão da base de soluções"}</div>
        ${sug.aviso ? `<div class="muted small" style="margin-bottom:6px">${esc(sug.aviso)}</div>` : ""}
        <textarea class="inp" id="sugTxt" style="min-height:90px">${esc(sug.solucao || "")}</textarea>
        <div class="row wrap" style="margin-top:8px;gap:6px">
          <span class="tag ${sug.resolve_na_hora ? "resolvida" : "equipe_acionada"}">${sug.resolve_na_hora ? "Dá para resolver hoje" : "Precisa programar equipe"}</span>
          ${sug.equipe ? `<span class="tag pendente">Equipe: ${esc(sug.equipe)}</span>` : ""}
          ${sug.corriqueiro === false ? `<span class="tag alta">Fora da lista de corriqueiros: precisa aprovação</span>` : `<span class="tag baixa">Serviço corriqueiro (FS014-02)</span>`}
        </div>
        ${sug.chamar_engenheiro ? `<div class="warn">${ic("alerta")}<span>Chame o engenheiro para avaliar antes de mexer.</span></div>` : ""}
        ${sug.o_que_dizer_ao_cliente ? `<div class="say">${ic("fala")}<span>Diga ao cliente: “${esc(sug.o_que_dizer_ao_cliente)}”</span></div>` : ""}
      </div>`;
    };
    desenharSug();
    $("#btnIA", el).onclick = async () => {
      const descricao = $("#desc", el).value.trim();
      if (!area || !descricao) { toast("Escolha a área e descreva a ocorrência primeiro"); return; }
      const b = $("#btnIA", el); b.disabled = true; b.innerHTML = `<span class="spin"></span> Pensando…`;
      try {
        const p = { area, comodo, descricao, empreendimento: EMP.nome };
        if (!S.demo && novasFotos[0]) {
          const small = await comprimir(novasFotos[0], 800, 0.7);
          p.foto_base64 = (await blobToDataURL(small)).split(",")[1]; p.media_type = "image/jpeg";
        }
        sug = await S.sugerir(p);
        if (sug.gravidade && !existente) { gravidade = sug.gravidade; marcar($("#cG", el), "g", gravidade); }
        desenharSug();
      } catch (e) { toast("Não foi possível sugerir agora"); }
      b.disabled = false; b.innerHTML = ic("ia") + " Sugerir de novo";
    };

    // Salvar
    const salvar = async (statusFinal) => {
      const descricao = $("#desc", el).value.trim();
      if (!comodo) return toast("Escolha o cômodo");
      if (!area) return toast("Escolha a área");
      if (!descricao) return toast("Descreva a ocorrência");
      const btns = el.querySelectorAll(".ft .btn"); btns.forEach((x) => (x.disabled = true));
      const sugTxt = $("#sugTxt", el);
      const dados = {
        comodo, area, descricao, gravidade,
        sugestao: sugTxt ? sugTxt.value.trim() : (sug?.solucao || ""),
        resolve_na_hora: !!sug?.resolve_na_hora, equipe: sug?.equipe || ed.equipe || "",
        corriqueiro: sug && typeof sug.corriqueiro === "boolean" ? sug.corriqueiro : corriqueiroLocal(area, descricao),
        status: statusFinal,
      };
      try {
        if (existente) await S.atualizarOcorrencia(existente.id, { ...dados, fotos: fotosAtuais }, novasFotos);
        else await S.novaOcorrencia({ ...dados, vistoria_id: v.id, unidade_id: u.id, empreendimento_id: u.empreendimento_id }, novasFotos);
        fechar(); toast(statusFinal === "resolvida_na_hora" ? "Anotada como resolvida na hora" : "Ocorrência salva"); depois();
      } catch (e) {
        console.error(e); toast("Erro ao salvar: " + e.message, 4000); btns.forEach((x) => (x.disabled = false));
      }
    };
    $("#salvar", el).onclick = () => salvar(existente ? status : "aberta");
    const sh = $("#salvarHora", el); if (sh) sh.onclick = () => salvar("resolvida_na_hora");
    const del = $("#btnDel", el); if (del) del.onclick = async () => { if (!(await confirmar("Excluir esta ocorrência e as fotos?", "Excluir"))) return; await S.apagarOcorrencia(existente.id); fechar(); toast("Ocorrência excluída"); depois(); };
  });
}

// ---------------------------------------------------------- painel do engenheiro
async function telaPainel() {
  topo({ titulo: "Painel da entrega", sub: EMP.nome });
  navegacao("painel");
  let us = [], os = [], vs = [], ag = [], primeira = true, vistos = new Set();
  let fStatus = "pendentes", fArea = "Todas", fBloco = "Todos";
  app(`<div class="row"><h1 style="flex:1">Entrega em tempo real</h1><span class="live"><i></i>ao vivo</span></div>
    <p class="sub">${esc(EMP.nome)} · atualiza sozinho a cada anotação</p>
    <div class="grid g4" id="kpis"></div>
    <h2>Mapa dos blocos</h2>
    <div class="mapa" id="mapa"></div>
    <div class="legenda"><span><i style="background:var(--card-3)"></i>Pendente</span><span><i style="border:2px solid var(--orange)"></i>Agendada hoje</span><span><i style="background:var(--blue)"></i>Em vistoria</span><span><i style="background:var(--green)"></i>Chaves entregues</span><span><i style="background:var(--orange)"></i>Chaves retidas</span><span><i style="background:var(--red);border-radius:50%"></i>Pendências</span></div>
    <div class="grid g2" style="margin-top:12px"><div class="card" id="emVist"></div><div class="card" id="porArea"></div></div>
    <div class="card" id="chaves" style="margin-top:12px"></div>
    <h2>Ocorrências</h2>
    <div class="chips" id="fS"></div><div style="height:8px"></div>
    <div class="row wrap"><select class="inp" id="fA" style="flex:1;min-width:160px"></select><select class="inp" id="fB" style="flex:1;min-width:120px"></select></div>
    <div style="height:12px"></div><div class="list" id="feed"></div>`);

  async function carregar(evento) {
    [us, os, vs, ag] = await Promise.all([S.unidades(EMP.id), S.ocorrenciasEmp(EMP.id), S.vistoriasEmp(EMP.id), S.agenda(EMP.id)]);
    const novos = new Set();
    if (!primeira) os.forEach((o) => { if (!vistos.has(o.id)) novos.add(o.id); });
    os.forEach((o) => vistos.add(o.id));
    if (novos.size) { beep(); toast(`Nova ocorrência: ${novos.size}`); }
    primeira = false;
    await desenhar(novos);
  }
  async function desenhar(novos = new Set()) {
    const uMap = {}; us.forEach((u) => (uMap[u.id] = u));
    const c = { conc: us.filter((u) => u.status === "concluida").length, em: us.filter((u) => u.status === "em_vistoria").length };
    const abertas = os.filter((o) => o.status === "aberta").length, acion = os.filter((o) => o.status === "equipe_acionada").length;
    const naHora = os.filter((o) => o.status === "resolvida_na_hora").length;
    $("#kpis").innerHTML = `
      <div class="kpi"><b>${c.conc}<span style="font-size:15px;color:var(--muted)">/${us.length}</span></b><span>unidades vistoriadas</span></div>
      <div class="kpi"><b>${c.em}</b><span>em vistoria agora</span></div>
      <div class="kpi accent"><b>${abertas}</b><span>pendentes sem equipe</span></div>
      <div class="kpi"><b>${acion} · ${naHora}</b><span>equipe acionada · resolvidas na hora</span></div>`;
    // mapa: blocos × andares × finais
    const hojeAg = new Set(ag.filter((a) => a.data === hojeISO()).map((a) => a.unidade_id));
    const ultV = {}; vs.forEach((x) => { if (!ultV[x.unidade_id] || x.iniciada_em > ultV[x.unidade_id].iniciada_em) ultV[x.unidade_id] = x; });
    const pendU = {}; os.forEach((o) => { if (o.status === "aberta" || o.status === "equipe_acionada") pendU[o.unidade_id] = (pendU[o.unidade_id] || 0) + 1; });
    const listaBlocos = [...new Set(us.map((u) => u.bloco))].sort();
    $("#mapa").innerHTML = listaBlocos.map((bl) => {
      const doBloco = us.filter((u) => u.bloco === bl);
      const andares = [...new Set(doBloco.map((u) => Math.floor(Number(u.numero) / 100)))].sort((a, b) => b - a);
      const feitas = doBloco.filter((u) => u.status === "concluida").length;
      return `<div class="bloco"><h4><span>Bloco ${esc(bl)}</span><span class="muted">${feitas}/${doBloco.length}</span></h4>${andares.map((an) => {
        const linha = doBloco.filter((u) => Math.floor(Number(u.numero) / 100) === an).sort((a, b) => Number(a.numero) - Number(b.numero));
        return `<div class="andar" style="grid-template-columns:22px repeat(${linha.length > 4 ? 10 : linha.length},1fr)"><span class="lv">${an}º</span>${linha.map((u) => {
          const vv = ultV[u.id];
          const cls = u.status === "em_vistoria" ? "em_vistoria" : u.status === "concluida" ? (vv && vv.chaves === "retidas" ? "retida" : "entregue") : hojeAg.has(u.id) ? "agendada" : "";
          return `<a class="cel ${cls}" href="#/vistoria/${u.id}" title="${esc(unidadeNome(u))} · ${esc(u.proprietario)}">${esc(linha.length <= 4 ? u.numero : String(Number(u.numero) % 100).padStart(2, "0"))}${pendU[u.id] ? `<span class="dot">${pendU[u.id]}</span>` : ""}</a>`;
        }).join("")}</div>`;
      }).join("")}</div>`;
    }).join("");
    const emV = us.filter((u) => u.status === "em_vistoria").sort(sortUnidades);
    $("#emVist").innerHTML = `<b>Em vistoria agora</b><div style="height:8px"></div>${emV.length ? emV.map((u) => {
      const vv = vs.filter((x) => x.unidade_id === u.id).sort((a, b) => b.iniciada_em.localeCompare(a.iniciada_em))[0];
      const n = os.filter((o) => o.unidade_id === u.id).length;
      return `<a class="row small" style="padding:6px 0;border-bottom:1px solid var(--line);text-decoration:none" href="#/vistoria/${u.id}"><b style="min-width:110px">${esc(unidadeNome(u))}</b><span class="muted" style="flex:1">${esc(PERFIS[vv?.vistoriador_id]?.nome || "")} · desde ${fmtHora(vv?.iniciada_em)}</span><span>${n} ocorr.</span></a>`;
    }).join("") : `<div class="muted small">Nenhuma unidade em vistoria neste momento.</div>`}`;
    const porA = {}; os.filter((o) => o.status === "aberta" || o.status === "equipe_acionada").forEach((o) => (porA[o.area] = (porA[o.area] || 0) + 1));
    const max = Math.max(1, ...Object.values(porA));
    const retidas = vs.filter((x) => x.status === "concluida" && x.chaves === "retidas" && uMap[x.unidade_id]).sort((a, b) => String(a.prazo_reparo).localeCompare(String(b.prazo_reparo)));
    $("#chaves").innerHTML = `<b class="row">${ic("cadeado")} Chaves com a Construfase (reparos em até 30 dias)</b><div style="height:8px"></div>${retidas.length ? retidas.map((x) => {
      const u = uMap[x.unidade_id], abertas = os.filter((o) => o.unidade_id === u.id && (o.status === "aberta" || o.status === "equipe_acionada")).length;
      const dias = Math.ceil((new Date(x.prazo_reparo + "T12:00") - new Date()) / 864e5);
      return `<a class="row small" style="padding:6px 0;border-bottom:1px solid var(--line);text-decoration:none" href="#/vistoria/${u.id}"><b style="min-width:120px">${esc(unidadeNome(u))}</b><span class="muted" style="flex:1">${abertas} pendente(s)</span><span class="tag ${dias <= 5 ? "alta" : dias <= 15 ? "media" : "baixa"}">até ${fmtData(x.prazo_reparo)} · ${dias} dia(s)</span></a>`;
    }).join("") : `<div class="muted small">Nenhuma unidade com chaves retidas.</div>`}`;
    $("#porArea").innerHTML = `<b>Pendências por área</b><div style="height:8px"></div>${Object.keys(porA).length ? Object.entries(porA).sort((a, b) => b[1] - a[1]).map(([a, n]) => `<div class="bar"><span class="lbl">${esc(a)}</span><span class="trk"><span class="fil" style="width:${(n / max) * 100}%;display:block"></span></span><span class="v">${n}</span></div>`).join("") : `<div class="muted small">Sem pendências.</div>`}`;

    const fsOpts = [["pendentes", "Pendentes"], ["aberta", "Sem equipe"], ["equipe_acionada", "Equipe acionada"], ["resolvidas", "Resolvidas"], ["todas", "Todas"]];
    $("#fS").innerHTML = fsOpts.map(([k, t]) => `<span class="chip ${fStatus === k ? "on" : ""}" data-s="${k}">${t}</span>`).join("");
    $("#fS").querySelectorAll("[data-s]").forEach((x) => (x.onclick = () => { fStatus = x.dataset.s; desenhar(); }));
    $("#fA").innerHTML = ["Todas", ...AREAS].map((a) => `<option ${fArea === a ? "selected" : ""}>${esc(a)}</option>`).join("");
    $("#fA").onchange = (e) => { fArea = e.target.value; desenhar(); };
    const blocos = ["Todos", ...[...new Set(us.map((u) => u.bloco).filter(Boolean))].sort()];
    $("#fB").innerHTML = blocos.map((b) => `<option value="${esc(b)}" ${fBloco === b ? "selected" : ""}>${b === "Todos" ? "Todos os blocos" : "Bloco " + esc(b)}</option>`).join("");
    $("#fB").onchange = (e) => { fBloco = e.target.value; desenhar(); };

    const lista = os.filter((o) => {
      const okS = fStatus === "todas" || (fStatus === "pendentes" && (o.status === "aberta" || o.status === "equipe_acionada")) || (fStatus === "resolvidas" && (o.status === "resolvida" || o.status === "resolvida_na_hora")) || o.status === fStatus;
      return okS && (fArea === "Todas" || o.area === fArea) && (fBloco === "Todos" || uMap[o.unidade_id]?.bloco === fBloco);
    }).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    $("#feed").innerHTML = lista.length ? await cardsOcorrencias(lista, { modo: "painel", novos, unidades: uMap }) : `<div class="empty">Nenhuma ocorrência neste filtro.</div>`;
    ligarCards($("#feed"), {
      equipe: (id) => acionarEquipe(os.find((o) => o.id === id), carregar),
      resolvida: async (id) => { await S.atualizarOcorrencia(id, { status: "resolvida" }); toast("Marcada como resolvida"); carregar(); },
    });
  }
  const meu = SEQ;
  await carregar();
  vincular(meu, S.assinar(EMP.id, () => carregar(true)));
}

function acionarEquipe(o, depois) {
  let eq = o.equipe && EQUIPES.includes(o.equipe) ? o.equipe : "";
  sheet(`<h3>Acionar equipe</h3>`, `
    <div class="card"><div class="muted small">${esc(o.comodo)} · ${esc(o.area)}</div><b>${esc(o.descricao)}</b>${o.sugestao ? `<div class="small" style="margin-top:6px;color:var(--ink-2)">${ic("ia","sm")} ${esc(o.sugestao)}</div>` : ""}</div>
    <label class="f">Qual equipe?</label>
    <div class="chips" id="eq">${EQUIPES.map((e) => `<span class="chip ${eq === e ? "on" : ""}" data-e="${esc(e)}">${esc(e)}</span>`).join("")}</div>`,
    `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Acionar</button>`,
    (el, fechar) => {
      $("#eq", el).onclick = (e) => { const c = e.target.closest("[data-e]"); if (!c) return; eq = c.dataset.e; el.querySelectorAll("[data-e]").forEach((x) => x.classList.toggle("on", x.dataset.e === eq)); };
      $("#ok", el).onclick = async () => { if (!eq) return toast("Escolha a equipe"); await S.atualizarOcorrencia(o.id, { status: "equipe_acionada", equipe: eq }); fechar(); toast("Equipe acionada: " + eq); depois(); };
    });
}

// ---------------------------------------------------------- base de soluções
async function telaBase() {
  topo({ titulo: "Base de soluções", sub: "Referência das sugestões" });
  let base = await S.base(), fArea = "Todas", busca = "";
  app(`<div class="row" style="align-items:flex-start"><p class="sub" style="flex:1">As sugestões de solução saem desta lista. A equipe técnica pode corrigir, incluir e desativar itens.</p><button class="btn sm primary" id="bn">${ic("plus")} Novo</button></div>
    <details class="card" style="margin-bottom:12px"><summary><b>Lista de Serviços Corriqueiros (FS014-02 Rev. 04)</b></summary>
      <p class="small muted">Fora desta lista, o serviço precisa de aprovação da gerência de Engenharia e Administrativa. O sistema marca cada ocorrência.</p>
      <ul class="small">${LISTA_CORRIQUEIROS.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>
    <div class="row wrap"><input class="inp" id="bb" placeholder="Buscar problema" style="flex:2;min-width:180px"><select class="inp" id="ba" style="flex:1;min-width:150px"></select></div>
    <div style="height:12px"></div><div class="list" id="bl"></div>`);
  navegacao("base");
  $("#ba").innerHTML = ["Todas", ...AREAS].map((a) => `<option>${esc(a)}</option>`).join("");
  $("#ba").onchange = (e) => { fArea = e.target.value; desenhar(); };
  $("#bb").oninput = (e) => { busca = norm(e.target.value); desenhar(); };
  $("#bn").onclick = () => editarBase({}, async () => { base = await S.base(); desenhar(); });
  function desenhar() {
    const l = base.filter((b) => (fArea === "Todas" || b.area === fArea) && (!busca || norm(b.problema + " " + b.solucao).includes(busca)));
    $("#bl").innerHTML = l.length ? l.map((b) => `<div class="card" style="${b.ativo === false ? "opacity:.5" : ""}">
      <div class="row"><span class="muted small" style="flex:1">${esc(b.area)}${b.equipe ? " · " + esc(b.equipe) : ""}</span>${b.resolve_na_hora ? `<span class="tag resolvida">Resolve na hora</span>` : ""}${b.ativo === false ? `<span class="tag pendente">Desativado</span>` : ""}</div>
      <b style="display:block;margin:4px 0">${esc(b.problema)}</b><div class="small">${esc(b.solucao)}</div>
      <div style="margin-top:8px"><button class="btn sm" data-ed="${b.id}">Editar</button></div></div>`).join("") : `<div class="empty">Nada encontrado.</div>`;
    $("#bl").querySelectorAll("[data-ed]").forEach((x) => (x.onclick = () => editarBase(base.find((b) => b.id === x.dataset.ed), async () => { base = await S.base(); desenhar(); })));
  }
  desenhar();
}
function editarBase(item, depois) {
  sheet(`<h3>${item.id ? "Editar item" : "Novo item"}</h3>`, `
    <label class="f">Área</label><select class="inp" id="ea">${AREAS.map((a) => `<option ${item.area === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
    <label class="f">Problema</label><input class="inp" id="ep" value="${esc(item.problema || "")}">
    <label class="f">Solução</label><textarea class="inp" id="es" style="min-height:120px">${esc(item.solucao || "")}</textarea>
    <label class="f">Equipe</label><select class="inp" id="ee"><option value="">—</option>${EQUIPES.map((e) => `<option ${item.equipe === e ? "selected" : ""}>${esc(e)}</option>`).join("")}</select>
    <label class="f"><input type="checkbox" id="eh" ${item.resolve_na_hora ? "checked" : ""}> Dá para resolver no dia da entrega</label>
    ${item.id ? `<label class="f"><input type="checkbox" id="eat" ${item.ativo !== false ? "checked" : ""}> Ativo (usado nas sugestões)</label>` : ""}`,
    `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Salvar</button>`,
    (el, fechar) => {
      $("#ok", el).onclick = async () => {
        const d = { area: $("#ea", el).value, problema: $("#ep", el).value.trim(), solucao: $("#es", el).value.trim(), equipe: $("#ee", el).value, resolve_na_hora: $("#eh", el).checked };
        if (!d.problema || !d.solucao) return toast("Preencha problema e solução");
        if (item.id) { d.id = item.id; d.ativo = $("#eat", el).checked; }
        await S.salvarBase(d); fechar(); toast("Salvo"); depois();
      };
    });
}

// ---------------------------------------------------------- cadastro de unidades
async function telaCadastro() {
  topo({ titulo: "Unidades e proprietários", voltar: "#/" });
  navegacao("");
  const desenhar = async () => {
    const us = (await S.unidades(EMP.id)).sort(sortUnidades);
    app(`<p class="sub">${us.length} unidade(s) em ${esc(EMP.nome)}.</p>
      <div class="card"><b>Importar da planilha</b>
        <p class="muted small">Copie as colunas do Excel (<b>Bloco · Unidade · Proprietário · Telefone</b>) e cole abaixo. Unidades já cadastradas são atualizadas.</p>
        <textarea class="inp" id="imp" placeholder="A	101	Maria da Silva	48999990000&#10;A	102	João Souza"></textarea>
        <div style="height:10px"></div><button class="btn primary" id="btnImp">Importar</button> <span class="muted small" id="impMsg"></span>
      </div>
      <h2>Unidades</h2>
      ${us.length ? `<div style="overflow:auto"><table class="t"><tr><th>Bloco</th><th>Unid.</th><th>Proprietário</th><th>Situação</th><th></th></tr>
      ${us.map((u) => `<tr><td>${esc(u.bloco)}</td><td><b>${esc(u.numero)}</b></td><td>${esc(u.proprietario)}<div class="muted small">${esc(u.telefone || "")}</div></td><td><span class="tag ${u.status}">${ST_UNI[u.status]}</span></td><td><button class="btn sm ghost" data-ed="${u.id}">Editar</button></td></tr>`).join("")}</table></div>` : `<div class="empty">Nenhuma unidade ainda.</div>`}`);
    $("#btnImp").onclick = async () => {
      const linhas = $("#imp").value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const rows = [];
      for (const l of linhas) {
        const c = l.split(/\t|;/).map((x) => x.trim());
        if (c.length < 3 || /^bloco$/i.test(c[0])) continue;
        rows.push({ bloco: c[0].replace(/^bloco\s*/i, ""), numero: c[1].replace(/^(apto|ap|unidade)\.?\s*/i, ""), proprietario: c[2], telefone: c[3] || "" });
      }
      if (!rows.length) { $("#impMsg").textContent = "Nenhuma linha válida (precisa de pelo menos 3 colunas)."; return; }
      const n = await S.salvarUnidades(EMP.id, rows); toast(`${n} unidade(s) importada(s)`); desenhar();
    };
    document.querySelectorAll("[data-ed]").forEach((b) => (b.onclick = () => {
      const u = us.find((x) => x.id === b.dataset.ed);
      sheet(`<h3>${esc(unidadeNome(u))}</h3>`, `
        <label class="f">Proprietário</label><input class="inp" id="up" value="${esc(u.proprietario)}">
        <label class="f">Telefone</label><input class="inp" id="ut" value="${esc(u.telefone || "")}">
        <label class="f">Situação</label><select class="inp" id="us">${Object.entries(ST_UNI).map(([k, t]) => `<option value="${k}" ${u.status === k ? "selected" : ""}>${t}</option>`).join("")}</select>
        <div style="height:16px"></div><button class="btn danger block" id="ud">Excluir unidade</button>`,
        `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Salvar</button>`,
        (el, fechar) => {
          $("#ok", el).onclick = async () => { await S.salvarUnidades(EMP.id, [{ bloco: u.bloco, numero: u.numero, proprietario: $("#up", el).value.trim(), telefone: $("#ut", el).value.trim() }]); await S.statusUnidade(u.id, $("#us", el).value); fechar(); desenhar(); };
          $("#ud", el).onclick = async () => { if (!(await confirmar("Excluir a unidade e todas as ocorrências dela?", "Excluir"))) return; await S.apagarUnidade(u.id); fechar(); desenhar(); };
        });
    }));
  };
  await desenhar();
}

// ---------------------------------------------------------- termo de vistoria (impressão)
// Texto oficial: FS010-02 Rev. 14 · Termo de Vistoria e Recebimento do Imóvel (Construfase).
// Recurso desligado por padrão (config.js > TERMO_IMPRESSO). Ligar quando houver impressora na obra.
const EMPRESA = "CONSTRUFASE Construção Civil Ltda., pessoa jurídica de direito privado, estabelecida na Rua Santo Antônio, nº 715, Cruzeiro do Sul, em Criciúma-SC, inscrita no CNPJ sob n. 86.715.380/0001-66, por seu representante legal abaixo assinado";
const ITENS_PADRAO = "2 tags de acesso ao condomínio\n1 controle do portão de veículo\n1 Manual do Proprietário digital com acesso QRCode";
const dataExtenso = (iso) => { const d = iso ? new Date(iso) : new Date(); return `${String(d.getDate()).padStart(2, "0")} de ${d.toLocaleDateString("pt-BR", { month: "long" })} de ${d.getFullYear()}`; };
const linha = (t, w = 160) => (t ? `<b>${esc(t)}</b>` : `<span style="display:inline-block;min-width:${w}px;border-bottom:1px solid #111">&nbsp;</span>`);
async function telaTermo(unidadeId) {
  const u = await S.unidade(unidadeId);
  topo({ titulo: "Termo de vistoria", sub: u ? unidadeNome(u) : "", voltar: "#/vistoria/" + unidadeId });
  const [v, os] = await Promise.all([S.vistoriaAberta(unidadeId), S.ocorrenciasUnidade(unidadeId)]);
  const ordem = comodosDe(u);
  const lista = os.slice().sort((a, b) => ordem.indexOf(a.comodo) - ordem.indexOf(b.comodo) || a.criado_em.localeCompare(b.criado_em));
  const urls = await S.fotoUrls(lista.flatMap((o) => o.fotos || []));
  let itensSalvos = ""; try { itensSalvos = localStorage.getItem("termo-itens") || ""; } catch (e) { /* ok */ }
  const f = { endereco: EMP.endereco || "", garagem: u.garagem || "", contrato: u.data_contrato || "", itens: itensSalvos || ITENS_PADRAO };
  app(`<div class="noprint card" style="margin-bottom:12px">
      <div class="row wrap"><b style="flex:1">Conferir antes de imprimir</b><button class="btn primary" id="btnPrint">${ic("impressora")} Imprimir</button></div>
      <div class="grid g2" style="margin-top:6px">
        <div><label class="f">Endereço do residencial (rua, nº, bairro)</label><input class="inp" id="tEnd" value="${esc(f.endereco)}" placeholder="Em branco: completar à mão"></div>
        <div><label class="f">Box de garagem nº</label><input class="inp" id="tGar" value="${esc(f.garagem)}"></div>
        <div><label class="f">Contrato de compra e venda datado de</label><input class="inp" id="tCon" value="${esc(f.contrato)}" placeholder="dd/mm/aaaa"></div>
        <div><label class="f">Itens entregues (um por linha)</label><textarea class="inp" id="tItens" style="min-height:80px">${esc(f.itens)}</textarea></div>
      </div>
      <p class="muted small">Garagem e data do contrato vêm da planilha de vendas: confira. O CPF fica em branco para o cliente preencher à mão.</p>
    </div><div id="doc"></div>`);
  const desenhar = () => {
    const itens = f.itens.split(/\n/).map((x) => x.trim().replace(/;$/, "")).filter(Boolean);
    const n = Math.max(lista.length, 10);
    let rows = "";
    for (let i = 0; i < n; i++) {
      const o = lista[i];
      rows += o
        ? `<tr><td>${fmtData(o.criado_em)}</td><td>${i + 1}. <b>${esc(o.comodo)}</b> · ${esc(o.area)}: ${esc(o.descricao)}${(o.fotos || []).length ? `<div class="fotos">${o.fotos.slice(0, 2).map((p) => `<img src="${esc(urls[p])}" alt="">`).join("")}</div>` : ""}</td><td>${o.status === "resolvida_na_hora" ? "OK · resolvido na vistoria" : o.status === "resolvida" ? "OK" : ""}</td></tr>`
        : `<tr><td>${i + 1}</td><td style="height:28px"></td><td></td></tr>`;
    }
    const semPend = lista.length === 0;
    $("#doc").innerHTML = `<div class="termo">
      <div class="th"><img src="img/logo-construfase.png" alt="Construfase"><div style="flex:1"><h1>TERMO DE VISTORIA E RECEBIMENTO DO IMÓVEL</h1></div><div class="small" style="text-align:right">FS010-02<br>Rev. 14</div></div>
      <p>Declaro, para os devidos fins, que recebi, nesta data, da Empresa ${EMPRESA}, o apartamento ${linha(u.numero, 50)} do Bloco ${linha(u.bloco, 40)}, com o respectivo box de garagem nº ${linha(f.garagem, 60)}, do ${esc(EMP.nome)}, estabelecido na ${linha(f.endereco, 260)}, em ${esc(EMP.cidade || "Criciúma-SC")}, com os seguintes itens:</p>
      <ul>${itens.map((x) => `<li>${esc(x)};</li>`).join("")}</ul>
      <p>Declaro mais, que procedi à vistoria no imóvel, constatando que o mesmo está de acordo com as especificações contratuais, funcionando todas as partes que o compõem, com as devidas ressalvas anexo relacionadas, caso forem existentes.</p>
      <p>O presente “Termo de Vistoria” foi executado pelos abaixo assinados e passa a ser parte integrante do contrato de compromisso de compra e venda de imóvel datado de: ${linha(f.contrato, 110)} para todos os fins e efeitos de direito.</p>
      <p>O presente instrumento é parte integrante do Contrato de Compromisso de Compra e Venda firmado entre as partes contratantes, e o adquirente declara, ainda, que tem conhecimento de que o prazo de garantia e responsabilidades da construtora constam no Manual do Proprietário.</p>
      <p>Assim, as partes elegem o foro da Comarca de Criciúma-SC para dirimir quaisquer dúvidas, renunciando a qualquer outro por mais privilegiado que seja, e assinam o presente em 02 [duas] vias de igual teor e forma, juntamente com as testemunhas que também assinam.</p>
      <p style="margin-top:14px">Criciúma, ${dataExtenso(v?.iniciada_em)}.</p>
      <div class="ass"><div>Cliente: ${esc(u.proprietario)}<br>CPF: ______________________</div><div>CONSTRUFASE Construção Civil Ltda<br>CNPJ 86.715.380/0001-66</div></div>
      <p style="margin-top:28px;font-size:12.5px"><b>OBSERVAÇÃO:</b> Caso sejam observados alguns defeitos a serem reparados, a construtora ConstruFase Construção Civil Ltda. ficará com as chaves do apartamento e terá um prazo de até 30 dias para a execução dos serviços, não podendo o cliente executar qualquer alteração no apartamento possibilitando a perda de garantia.</p>
      <div class="pb"></div>
      <div class="th" style="margin-top:18px"><img src="img/logo-construfase.png" alt=""><div style="flex:1"><b>${esc(unidadeNome(u))}</b> · ${esc(EMP.nome)}<br><span class="small">Cliente: ${esc(u.proprietario)} · Acompanhante: ${esc(v?.acompanhante || "—")} · Vistoriador(a): ${esc(PERFIS[v?.vistoriador_id]?.nome || "")}</span></div><div class="small" style="text-align:right">FS010-02<br>Rev. 14</div></div>
      <table><tr><th style="width:70px">Data</th><th>Pendências observadas pelo cliente</th><th style="width:170px">Manutenção realizada (OK / Não aplicável) · Obs.: preenchida pela construtora</th></tr>${rows}</table>
      ${v?.observacoes ? `<p><b>Observações:</b> ${esc(v.observacoes)}</p>` : ""}
      ${v?.chaves === "retidas" ? `<p class="small">Chaves com a construtora para reparos · prazo: <b>${fmtData(v.prazo_reparo)}</b>.</p>` : ""}
      <p style="margin-top:18px">[&nbsp;&nbsp;&nbsp;&nbsp;] Declaro que as pendências acima citadas foram sanadas.</p>
      <p>Assinatura do Cliente: ______________________________ &nbsp;&nbsp; Assinatura Engenharia: ______________________________</p>
      <p style="margin-top:18px">[${semPend ? "&nbsp;X&nbsp;" : "&nbsp;&nbsp;&nbsp;&nbsp;"}] Declaro que não foram encontradas pendências a serem reparadas.</p>
      <p style="margin-top:18px">Declaro que recebi:</p><ul><li>2 chaves da porta de entrada do apartamento;</li></ul>
      <p>Criciúma, ___ de ___________________ de ________.</p>
      <div class="ass" style="grid-template-columns:1fr;max-width:340px"><div>Cliente: ${esc(u.proprietario)}<br>CPF: ______________________</div></div>
    </div>`;
  };
  desenhar();
  $("#tEnd").oninput = (e) => { f.endereco = e.target.value; desenhar(); };
  $("#tEnd").onchange = async (e) => { try { await S.salvarEmp(EMP.id, { endereco: e.target.value.trim() }); EMP.endereco = e.target.value.trim(); toast("Endereço salvo para os próximos termos"); } catch (err) { /* segue só neste termo */ } };
  $("#tGar").oninput = (e) => { f.garagem = e.target.value; desenhar(); };
  $("#tCon").oninput = (e) => { f.contrato = e.target.value; desenhar(); };
  $("#tItens").oninput = (e) => { f.itens = e.target.value; try { localStorage.setItem("termo-itens", f.itens); } catch (er) { /* ok */ } desenhar(); };
  $("#btnPrint").onclick = () => { try { window.print(); } catch (e) { toast("Use o menu do navegador para imprimir"); } };
}

// =====================================================================
// APP INSTALÁVEL + BARRA DE CONEXÃO
// =====================================================================
function registrarApp() {
  try {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && !DEMO) navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW", e));
  } catch (e) { /* navegador sem suporte */ }
}
let redeAnterior = { pendentes: 0, online: true };
let tRedeOk = null;
function barraRede(st) {
  const el = $("#rede"); if (!el) return;
  const mostrar = (cls, html) => { el.className = "rede " + cls; el.innerHTML = html; };
  clearTimeout(tRedeOk);
  if (st.erro) mostrar("erro", `${ic("alerta", "sm")} Uma alteração não foi aceita pelo servidor · toque para ver`);
  else if (!st.online) mostrar("off", `${ic("wifi", "sm")} Sem internet · ${st.pendentes ? `${st.pendentes} alteração(ões) guardada(s) no celular` : "tudo salvo no celular"}`);
  else if (st.pendentes) mostrar("env", `<span class="spin"></span> Enviando ${st.pendentes} alteração(ões)…`);
  else if (redeAnterior.pendentes || !redeAnterior.online) { mostrar("ok", `${ic("check", "sm")} Tudo enviado`); tRedeOk = setTimeout(() => (el.className = "rede hidden"), 2500); }
  else el.className = "rede hidden";
  redeAnterior = st;
  el.onclick = detalhesRede;
}
function detalhesRede() {
  if (!S || !S.estado) return;
  const st = S.estado(), erros = S.errosFila();
  const nomes = { vist_ins: "início de vistoria", vist_upd: "atualização de vistoria", uni_status: "situação da unidade", occ_ins: "nova ocorrência", occ_upd: "alteração de ocorrência", occ_del: "exclusão de ocorrência" };
  sheet(`<h3>Envio para o servidor</h3>`, `
    <div class="card"><b>${st.online ? "Com internet" : "Sem internet"}</b><div class="muted small">${st.pendentes ? `${st.pendentes} alteração(ões) aguardando envio. Elas ficam guardadas no celular e sobem sozinhas quando o sinal voltar.` : "Nada aguardando envio."}</div></div>
    ${erros.length ? `<div class="card" style="border-color:rgba(255,93,82,.4)"><b style="color:var(--red)">O servidor recusou: ${esc(nomes[erros[0].tipo] || erros[0].tipo)}</b><div class="muted small">${esc(erros[0].erro || "")}</div><p class="small">Tente de novo. Se continuar, mostre esta mensagem ao Eduardo antes de descartar.</p></div>` : ""}
    <p class="muted small">Dica: não feche o navegador nem saia do sistema enquanto houver alterações aguardando envio.</p>`,
    `<button class="btn" data-close>Fechar</button>${erros.length ? `<button class="btn danger" id="rdDesc">Descartar</button>` : ""}<button class="btn primary" id="rdTent">Enviar agora</button>`,
    (el, fechar) => {
      $("#rdTent", el).onclick = () => { S.sincronizar(true); fechar(); };
      const d = $("#rdDesc", el); if (d) d.onclick = async () => { if (!(await confirmar("Descartar esta alteração? Ela não vai para o servidor.", "Descartar"))) return; await S.descartarPrimeiro(); fechar(); rotear(); };
    });
}

// =====================================================================
// INÍCIO
// =====================================================================
(async function iniciar() {
  try {
    registrarApp();
    S = DEMO ? DemoStore() : await ComOffline(await SupaStore());
    if (S.demo) $("#demoBar").classList.remove("hidden");
    if (S.aoMudar) S.aoMudar(barraRede);
    EU = await S.session();
    if (EU) await posLogin(); else rotear();
    window.addEventListener("hashchange", rotear);
  } catch (e) {
    console.error(e);
    app(`<div class="card"><b>Não foi possível iniciar.</b><p class="muted small">${esc(e.message)}</p><p class="small">Verifique a internet e as chaves em <code>config.js</code>.</p></div>`);
  }
})();
