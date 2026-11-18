// Resumo diário das vistorias por e-mail (Brevo, plano grátis: 300 e-mails/dia).
// Chamado todo dia às 18h pelo agendador do Supabase (supabase/resumo-agendamento.sql).
// Segredos (Edge Functions > Secrets):
//   BREVO_API_KEY      chave da API do Brevo
//   RESUMO_REMETENTE   e-mail verificado no Brevo (quem envia)
//   RESUMO_DESTINOS    e-mails separados por vírgula (quem recebe)
//   RESUMO_SEGREDO     senha que o agendador manda no cabeçalho x-segredo
//   SITE_URL           (opcional) endereço do sistema, para o link no e-mail
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem em toda Edge Function.
import { createClient } from "jsr:@supabase/supabase-js@2";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const TZ = "-03:00"; // Brasília (sem horário de verão)
const ST: Record<string, string> = { aberta: "Pendente", resolvida_na_hora: "Resolvida na hora", equipe_acionada: "Equipe acionada", resolvida: "Resolvida" };

function hojeBR() {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
const hora = (iso?: string | null) => iso ? new Date(new Date(iso).getTime() - 3 * 3600 * 1000).toISOString().slice(11, 16) : "";
const nomeUni = (u: any) => u ? `Bloco ${u.bloco} · Apto ${u.numero}` : "";

Deno.serve(async (req) => {
  if (req.headers.get("x-segredo") !== env("RESUMO_SEGREDO") || !env("RESUMO_SEGREDO")) return new Response("não autorizado", { status: 401 });
  const corpo = await req.json().catch(() => ({}));
  const data: string = corpo.data || hojeBR();
  const forcar = !!corpo.forcar;
  const ini = `${data}T00:00:00${TZ}`, fim = `${data}T23:59:59.999${TZ}`;

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: emps } = await sb.from("empreendimentos").select("*");
  const { data: perfis } = await sb.from("perfis").select("id,nome");
  const P: Record<string, string> = {}; (perfis || []).forEach((p: any) => (P[p.id] = p.nome));
  const blocos: string[] = [];
  let atividade = false;

  for (const emp of emps || []) {
    const [{ data: us }, { data: vs }, { data: os }, { data: ag }] = await Promise.all([
      sb.from("unidades").select("*").eq("empreendimento_id", emp.id),
      sb.from("vistorias").select("*").eq("empreendimento_id", emp.id),
      sb.from("ocorrencias").select("*").eq("empreendimento_id", emp.id).gte("criado_em", ini).lte("criado_em", fim),
      sb.from("agendamentos").select("*").eq("empreendimento_id", emp.id).eq("data", data).order("hora"),
    ]);
    const U: Record<string, any> = {}; (us || []).forEach((u: any) => (U[u.id] = u));
    const noDia = (iso?: string | null) => !!iso && iso >= new Date(ini).toISOString() && iso <= new Date(fim).toISOString();
    const vDia = (vs || []).filter((v: any) => noDia(v.iniciada_em) || noDia(v.concluida_em));
    const occ = os || [];
    if (!vDia.length && !occ.length && !(ag || []).length) continue;
    atividade = atividade || vDia.length > 0 || occ.length > 0;
    const concl = (vs || []).filter((v: any) => v.status === "concluida" && noDia(v.concluida_em));
    const pend = occ.filter((o: any) => o.status === "aberta" || o.status === "equipe_acionada");
    const naHora = occ.filter((o: any) => o.status === "resolvida_na_hora").length;
    const total = (us || []).length, feitas = (us || []).filter((u: any) => u.status === "concluida").length;
    const porArea: Record<string, number> = {}; occ.forEach((o: any) => (porArea[o.area] = (porArea[o.area] || 0) + 1));
    const kpi = (n: unknown, t: string) => `<td style="padding:10px;border:1px solid #eee;text-align:center;background:#faf8f5"><div style="font-size:22px;font-weight:700;color:#f07d1a">${n}</div><div style="font-size:11px;color:#555">${t}</div></td>`;
    const th = (t: string) => `<th style="text-align:left;padding:6px;background:#f3f0ea;font-size:11px;color:#444">${t}</th>`;
    const td = (t: unknown) => `<td style="padding:6px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top">${t}</td>`;
    const naoIniciadas = (ag || []).filter((a: any) => { const u = U[a.unidade_id]; return u && u.status === "pendente"; });

    blocos.push(`
      <h2 style="font-size:17px;margin:22px 0 6px;border-left:4px solid #f07d1a;padding-left:8px">${esc(emp.nome)}</h2>
      <p style="margin:0 0 10px;color:#555;font-size:13px">Andamento: <b>${feitas} de ${total}</b> unidades concluídas.</p>
      <table style="border-collapse:collapse;width:100%"><tr>${kpi(new Set(vDia.map((v: any) => v.unidade_id)).size, "unidades vistoriadas")}${kpi(concl.length, "concluídas")}${kpi(occ.length, "ocorrências")}${kpi(naHora, "resolvidas na hora")}${kpi(pend.length, "pendentes")}${kpi(concl.filter((v: any) => v.chaves === "retidas").length, "chaves retidas")}</tr></table>
      ${Object.keys(porArea).length ? `<h3 style="font-size:14px;margin:16px 0 6px">Ocorrências por área</h3><p style="font-size:13px;margin:0">${Object.entries(porArea).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(k)}: <b>${n}</b>`).join(" · ")}</p>` : ""}
      ${naoIniciadas.length ? `<h3 style="font-size:14px;margin:16px 0 6px;color:#c0392b">Agendadas e não iniciadas (${naoIniciadas.length})</h3><p style="font-size:13px;margin:0">${naoIniciadas.map((a: any) => `${esc(String(a.hora).slice(0, 5))} ${esc(nomeUni(U[a.unidade_id]))}`).join(" · ")}</p>` : ""}
      ${vDia.length ? `<h3 style="font-size:14px;margin:16px 0 6px">Unidades do dia</h3><table style="border-collapse:collapse;width:100%"><tr>${th("Unidade")}${th("Vistoriador")}${th("Horário")}${th("Ocorr.")}${th("Chaves")}</tr>
        ${vDia.map((v: any) => { const u = U[v.unidade_id]; const n = occ.filter((o: any) => o.unidade_id === v.unidade_id).length;
          return `<tr>${td(`<b>${esc(nomeUni(u))}</b><br><span style="color:#777">${esc(u?.proprietario || "")}</span>`)}${td(esc(P[v.vistoriador_id] || ""))}${td(`${hora(v.iniciada_em)}${v.concluida_em ? "–" + hora(v.concluida_em) : ""}`)}${td(n)}${td(v.status !== "concluida" ? "Em andamento" : v.chaves === "retidas" ? `Retidas até ${esc(String(v.prazo_reparo || "").split("-").reverse().join("/"))}` : "Entregues")}</tr>`; }).join("")}</table>` : ""}
      ${pend.length ? `<h3 style="font-size:14px;margin:16px 0 6px">Pendências para a engenharia (${pend.length})</h3><table style="border-collapse:collapse;width:100%"><tr>${th("Unidade")}${th("Cômodo · Área")}${th("Descrição")}${th("Situação")}</tr>
        ${pend.map((o: any) => `<tr>${td(esc(nomeUni(U[o.unidade_id])))}${td(`${esc(o.comodo)} · ${esc(o.area)}`)}${td(`${esc(o.descricao)}${o.gravidade === "alta" ? ' <b style="color:#c0392b">(alta)</b>' : ""}${o.corriqueiro === false ? ' <i style="color:#777">(fora da FS014-02)</i>' : ""}`)}${td(esc(ST[o.status] + (o.status === "equipe_acionada" && o.equipe ? ": " + o.equipe : "")))}</tr>`).join("")}</table>` : ""}`);
  }

  if (!atividade && !forcar) return Response.json({ enviado: false, motivo: "sem vistorias nem ocorrências hoje" });

  const dataBR = data.split("-").reverse().join("/");
  const site = env("SITE_URL");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#16181b;max-width:720px">
    <div style="border-bottom:3px solid #f07d1a;padding-bottom:10px"><b style="font-size:19px">Resumo das vistorias · ${dataBR}</b><br><span style="color:#555;font-size:13px">Construfase · enviado automaticamente às 18h</span></div>
    ${blocos.join("") || "<p>Nenhuma atividade registrada hoje.</p>"}
    ${site ? `<p style="margin-top:22px"><a href="${esc(site)}#/relatorio" style="background:#f07d1a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir relatórios no sistema</a></p>` : ""}
    <p style="font-size:11px;color:#888;margin-top:22px">Sistema de Vistoria de Entrega · Construfase</p></div>`;

  const destinos = env("RESUMO_DESTINOS").split(",").map((e) => e.trim()).filter(Boolean).map((email) => ({ email }));
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env("BREVO_API_KEY"), "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: "Vistorias Construfase", email: env("RESUMO_REMETENTE") }, to: destinos, subject: `Resumo das vistorias · ${dataBR}`, htmlContent: html }),
  });
  const txt = await r.text();
  return Response.json({ enviado: r.ok, status: r.status, resposta: txt.slice(0, 300), destinos: destinos.length });
});
