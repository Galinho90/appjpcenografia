// Edge Function: notify-nota-fiscal
// Envia e-mail ao colaborador quando uma nota fiscal muda de status (aprovada / rejeitada).
// Renderiza o template salvo em `email_templates` e chama a função `smtp-send` para envio real.
// Registra cada tentativa em `notificacao_log` (sent / failed / skipped).

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

// deno-lint-ignore no-explicit-any
type Admin = any;

async function logNotificacao(
  admin: Admin,
  row: {
    evento: string;
    template_key?: string | null;
    nota_fiscal_id?: string | null;
    recipient_email?: string | null;
    subject?: string | null;
    status: "sent" | "failed" | "skipped";
    error_message?: string | null;
    payload?: Record<string, unknown> | null;
    triggered_by?: string | null;
  },
) {
  try {
    await admin.from("notificacao_log").insert(row);
  } catch (_) {
    // Log é best-effort, não deve quebrar o fluxo
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Identifica usuário (se houver)
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    try {
      const { data: userData } = await admin.auth.getUser(token);
      userId = userData.user?.id ?? null;
    } catch (_) { /* ignore */ }
  }

  let evento = "desconhecido";
  let nota_id: string | null = null;

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      await logNotificacao(admin, {
        evento,
        status: "failed",
        error_message: "Payload inválido",
        payload: { received: json, issues: parsed.error.flatten() },
        triggered_by: userId,
      });
      return new Response(
        JSON.stringify({ error: "Payload inválido", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    evento = parsed.data.evento;
    nota_id = parsed.data.nota_id;
    const motivo = parsed.data.motivo;

    // Carrega nota
    const { data: nota, error: notaErr } = await admin
      .from("notas_fiscais")
      .select("*")
      .eq("id", nota_id)
      .maybeSingle();
    if (notaErr) throw notaErr;
    if (!nota) {
      await logNotificacao(admin, {
        evento: `nota_fiscal_${evento}`,
        nota_fiscal_id: nota_id,
        status: "failed",
        error_message: "Nota fiscal não encontrada",
        triggered_by: userId,
      });
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
      await logNotificacao(admin, {
        evento: `nota_fiscal_${evento}`,
        nota_fiscal_id: nota_id,
        status: "skipped",
        error_message: "Colaborador sem e-mail cadastrado",
        payload: { colaborador_id: nota.colaborador_id, nome: colaborador?.nome ?? null },
        triggered_by: userId,
      });
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
      await logNotificacao(admin, {
        evento: `nota_fiscal_${evento}`,
        template_key: templateKey,
        nota_fiscal_id: nota_id,
        recipient_email: colaborador.email,
        status: "failed",
        error_message: `Template '${templateKey}' não encontrado`,
        payload: { vars },
        triggered_by: userId,
      });
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
    const ok = sendRes.ok && sendJson?.ok !== false;

    await logNotificacao(admin, {
      evento: `nota_fiscal_${evento}`,
      template_key: templateKey,
      nota_fiscal_id: nota_id,
      recipient_email: colaborador.email,
      subject: rendered.subject,
      status: ok ? "sent" : "failed",
      error_message: ok ? null : (sendJson?.error ?? `HTTP ${sendRes.status}`),
      payload: {
        vars,
        smtp_response_status: sendRes.status,
        smtp_response: sendJson,
      },
      triggered_by: userId,
    });

    if (!ok) {
      return new Response(
        JSON.stringify({ ok: false, error: sendJson?.error ?? "Falha ao enviar e-mail" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logNotificacao(admin, {
      evento: `nota_fiscal_${evento}`,
      nota_fiscal_id: nota_id,
      status: "failed",
      error_message: msg,
      triggered_by: userId,
    });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
