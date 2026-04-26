// Edge Function: notify-nota-fiscal
// Envia e-mail ao colaborador quando uma nota fiscal muda de status (aprovada / rejeitada).
// Renderiza o template salvo em `email_templates` e chama a função `smtp-send` para envio real.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { loadAndRenderTemplate } from "../_shared/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_PUBLIC_URL = Deno.env.get("APP_PUBLIC_URL") ?? "";

const bodySchema = z.object({
  nota_id: z.string().uuid(),
  evento: z.enum(["aprovada", "rejeitada"]),
  motivo: z.string().optional(),
});

const TEMPLATE_KEYS: Record<string, string> = {
  aprovada: "nota_fiscal_aprovada",
  rejeitada: "nota_fiscal_rejeitada",
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Payload inválido", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { nota_id, evento, motivo } = parsed.data;

    // Carrega nota
    const { data: nota, error: notaErr } = await admin
      .from("notas_fiscais")
      .select("*")
      .eq("id", nota_id)
      .maybeSingle();
    if (notaErr) throw notaErr;
    if (!nota) {
      return new Response(JSON.stringify({ error: "Nota fiscal não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega colaborador
    const { data: colaborador, error: colErr } = await admin
      .from("colaboradores")
      .select("nome, email")
      .eq("id", nota.colaborador_id)
      .maybeSingle();
    if (colErr) throw colErr;
    if (!colaborador?.email) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, reason: "Colaborador sem e-mail cadastrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Carrega empresa
    const { data: empresa } = await admin
      .from("configuracoes_empresa")
      .select("razao_social, nome_fantasia")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const empresaNome = empresa?.nome_fantasia || empresa?.razao_social || "Sistema";

    const vars: Record<string, string> = {
      nome: colaborador.nome ?? "",
      empresa: empresaNome,
      numero: nota.numero ?? "—",
      valor: fmtBRL(Number(nota.valor ?? 0)),
      periodo_inicio: fmtDate(nota.periodo_inicio),
      periodo_fim: fmtDate(nota.periodo_fim),
      motivo: motivo ?? nota.observacoes ?? "",
      link: APP_PUBLIC_URL ? `${APP_PUBLIC_URL.replace(/\/$/, "")}/minhas-notas-fiscais` : "",
    };

    const templateKey = TEMPLATE_KEYS[evento];
    const rendered = await loadAndRenderTemplate(admin, templateKey, vars);
    if (!rendered) {
      return new Response(
        JSON.stringify({ error: `Template '${templateKey}' não encontrado` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Chama smtp-send (action: send)
    const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/smtp-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        action: "send",
        to: colaborador.email,
        subject: rendered.subject,
        html: rendered.html,
        context: `nota_fiscal_${evento}`,
      }),
    });

    const sendJson = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok || sendJson?.ok === false) {
      return new Response(
        JSON.stringify({ ok: false, error: sendJson?.error ?? "Falha ao enviar e-mail" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
