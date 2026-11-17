// Supabase Edge Function: sugerir
// Recebe uma ocorrência da vistoria e devolve uma sugestão de solução,
// usando a base de soluções da Construfase como referência e a API da Anthropic.
//
// Segredos necessários (Supabase > Edge Functions > Secrets):
//   ANTHROPIC_API_KEY  = sua chave da Anthropic
//   ANTHROPIC_MODEL    = (opcional) padrão: claude-sonnet-5-5
// SUPABASE_URL e SUPABASE_ANON_KEY já existem automaticamente.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Lista de Serviços Corriqueiros da Construfase (FS014-02 Rev. 04).
// Fora desta lista, o serviço precisa de aprovação da gerência de Engenharia e Administrativa.
const CORRIQUEIROS = [
  "infiltração", "vazamento", "pintura", "problemas elétricos",
  "pisos danificados (lascas, trincas e desplacamentos)",
  "azulejos danificados (lascas, trincas e desplacamentos)",
  "interfones", "metais dos banheiros", "vazamentos de gás",
  "telhados (telhas, calhas e rufos)", "pavimentação abaloada",
  "infiltração nas esquadrias (janelas)", "fechadura com defeito",
];

const EQUIPES = [
  "Pintura", "Cerâmica", "Elétrica", "Hidráulica", "Esquadrias",
  "Vidraçaria", "Gesso", "Limpeza", "Manutenção geral",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY não configurada" }, 500);
  const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5";

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const area = String(body.area || "").slice(0, 80);
  const comodo = String(body.comodo || "").slice(0, 80);
  const descricao = String(body.descricao || "").slice(0, 1500);
  const empreendimento = String(body.empreendimento || "").slice(0, 120);
  if (!descricao) return json({ error: "Descreva a ocorrência" }, 400);

  // Base de soluções com o login de quem chamou (respeita o RLS)
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: base } = await supa
    .from("base_solucoes")
    .select("id, area, problema, solucao, resolve_na_hora, equipe")
    .eq("ativo", true)
    .in("area", [area, "Outros", "Umidade e infiltração", "Limpeza"]);

  const referencia = (base ?? [])
    .map((b) => `- [${b.id}] (${b.area}) ${b.problema} → ${b.solucao} | resolve na hora: ${b.resolve_na_hora ? "sim" : "não"} | equipe: ${b.equipe}`)
    .join("\n");

  const system = `Você apoia o representante da construtora Construfase (muitas vezes um estagiário) na vistoria de entrega de chaves de um apartamento, feita junto com o cliente.
Responda em português do Brasil, com linguagem simples e prática.
Use a BASE DE SOLUÇÕES da equipe técnica como referência principal. Se a ocorrência não estiver na base, use boas práticas de construção civil brasileira (NBR 15575, NBR 14037) e seja conservador.
Regras:
- "solucao": 1 a 4 passos curtos do que fazer. Se houver risco (elétrica, vidro trincado, umidade, estrutura), diga para NÃO mexer e chamar o engenheiro.
- "resolve_na_hora": true só se a equipe de plantão consegue resolver no mesmo dia sem material especial.
- "o_que_dizer_ao_cliente": uma frase educada e honesta para o estagiário falar ao cliente, sem prometer prazo.
- "corriqueiro": true se o serviço se encaixa na Lista de Serviços Corriqueiros da Construfase: ${CORRIQUEIROS.join("; ")}. Senão false (precisa de aprovação da gerência de Engenharia e Administrativa). Limpeza e pequenos ajustes de entrega (regular porta, apertar espelho, completar rejunte) contam como corriqueiros.
- Fissura maior que 1 mm, infiltração, som oco em várias peças, caimento errado e desplacamento: "chamar_engenheiro": true.
Responda SOMENTE com um JSON válido, sem texto antes ou depois, neste formato:
{"solucao":"...","resolve_na_hora":true,"equipe":"uma de: ${EQUIPES.join(", ")}","gravidade":"baixa|media|alta","chamar_engenheiro":false,"corriqueiro":true,"o_que_dizer_ao_cliente":"...","base_ids":["id usado da base, se houver"]}`;

  const userText = `Empreendimento: ${empreendimento || "—"}
Cômodo: ${comodo || "—"}
Área: ${area || "—"}
Ocorrência anotada: ${descricao}

BASE DE SOLUÇÕES DA EQUIPE TÉCNICA:
${referencia || "(vazia para esta área)"}`;

  const content: any[] = [];
  if (body.foto_base64 && typeof body.foto_base64 === "string" && body.foto_base64.length < 1_500_000) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: body.media_type || "image/jpeg", data: body.foto_base64 },
    });
  }
  content.push({ type: "text", text: userText });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      system,
      messages: [{ role: "user", content }],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    return json({ error: "Falha na IA", detalhe: t.slice(0, 400) }, 502);
  }
  const out = await r.json();
  const text: string = (out.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return json({ error: "Resposta da IA fora do formato", texto: text.slice(0, 400) }, 502);
  try {
    const s = JSON.parse(m[0]);
    if (!EQUIPES.includes(s.equipe)) s.equipe = "Manutenção geral";
    if (!["baixa", "media", "alta"].includes(s.gravidade)) s.gravidade = "media";
    return json(s);
  } catch {
    return json({ error: "JSON da IA inválido", texto: text.slice(0, 400) }, 502);
  }
});
