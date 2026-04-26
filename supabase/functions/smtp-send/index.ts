// Edge Function: smtp-send
// Modos:
//  - test_connection: valida login SMTP usando dados enviados no body (sem salvar)
//  - send_test: envia e-mail de teste usando a config ativa em smtp_config
//  - send: envia e-mail real (chamado por outras edge functions ou pelo app autenticado)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { encryptSecret, decryptSecret } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const smtpFieldsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.enum(["tls", "ssl", "none"]),
  username: z.string().min(1),
  password: z.string().min(1),
  from_email: z.string().email(),
  from_name: z.string().optional().nullable(),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("test_connection"),
    smtp: smtpFieldsSchema,
  }),
  z.object({
    action: z.literal("send_test"),
    to: z.string().email(),
    smtp: smtpFieldsSchema.optional(),
  }),
  z.object({
    action: z.literal("send"),
    to: z.string().email(),
    subject: z.string().min(1),
    html: z.string().optional(),
    text: z.string().optional(),
    context: z.string().optional(),
  }),
]);

type SmtpFields = z.infer<typeof smtpFieldsSchema>;
// deno-lint-ignore no-explicit-any
type AdminClient = any;

async function buildClient(s: SmtpFields): Promise<SMTPClient> {
  return new SMTPClient({
    connection: {
      hostname: s.host,
      port: s.port,
      tls: s.secure === "ssl",
      auth: { username: s.username, password: s.password },
    },
  });
}

async function loadActiveConfig(admin: AdminClient): Promise<SmtpFields | null> {
  const { data, error } = await admin
    .from("smtp_config")
    .select("*")
    .eq("ativo", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const password = await decryptSecret(data.password_encrypted as string);
  return {
    host: data.host as string,
    port: data.port as number,
    secure: data.secure as "tls" | "ssl" | "none",
    username: data.username as string,
    password,
    from_email: data.from_email as string,
    from_name: (data.from_name as string | null) ?? null,
  };
}

async function logEmail(
  admin: AdminClient,
  payload: {
    to_email: string;
    subject: string;
    status: "sent" | "failed";
    error_message?: string | null;
    triggered_by?: string | null;
    context?: string | null;
  },
) {
  await admin.from("email_log").insert({
    ...payload,
    sent_at: payload.status === "sent" ? new Date().toISOString() : null,
  });
}

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
    const body = parsed.data;

    // Identifica usuário (se houver)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await admin.auth.getUser(token);
      userId = userData.user?.id ?? null;
    }

    // ----- TEST CONNECTION -----
    if (body.action === "test_connection") {
      const client = await buildClient(body.smtp);
      try {
        // Tenta conectar e fechar — denomailer conecta on-demand, então faz um noop send simulado
        await client.close();
        // Reabrir e validar via verify-like: tenta enviar para o próprio remetente como verify
        const verify = await buildClient(body.smtp);
        await verify.send({
          from: `${body.smtp.from_name ?? ""} <${body.smtp.from_email}>`.trim(),
          to: body.smtp.from_email,
          subject: "[Teste de conexão SMTP]",
          content: "Conexão validada.",
        });
        await verify.close();
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(
          JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ----- SEND TEST -----
    if (body.action === "send_test") {
      const smtp = body.smtp ?? (await loadActiveConfig(admin));
      if (!smtp) {
        return new Response(JSON.stringify({ error: "Nenhuma configuração SMTP ativa" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const client = await buildClient(smtp);
      try {
        await client.send({
          from: `${smtp.from_name ?? ""} <${smtp.from_email}>`.trim(),
          to: body.to,
          subject: "E-mail de teste — Sistema JP Cenografia",
          content: "auto",
          html: `<div style="font-family:Arial,sans-serif;padding:20px;"><h2>Funcionou! 🎉</h2><p>Este é um e-mail de teste enviado pelo sistema.</p><p>Se você recebeu, sua configuração SMTP está correta.</p></div>`,
        });
        await client.close();
        await logEmail(admin, {
          to_email: body.to,
          subject: "E-mail de teste",
          status: "sent",
          triggered_by: userId,
          context: "send_test",
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await logEmail(admin, {
          to_email: body.to,
          subject: "E-mail de teste",
          status: "failed",
          error_message: msg,
          triggered_by: userId,
          context: "send_test",
        });
        return new Response(JSON.stringify({ ok: false, error: msg }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ----- SEND (real) -----
    if (body.action === "send") {
      const smtp = await loadActiveConfig(admin);
      if (!smtp) {
        return new Response(JSON.stringify({ error: "Nenhuma configuração SMTP ativa" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const client = await buildClient(smtp);
      try {
        await client.send({
          from: `${smtp.from_name ?? ""} <${smtp.from_email}>`.trim(),
          to: body.to,
          subject: body.subject,
          content: body.text ?? "auto",
          html: body.html,
        });
        await client.close();
        await logEmail(admin, {
          to_email: body.to,
          subject: body.subject,
          status: "sent",
          triggered_by: userId,
          context: body.context ?? "send",
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await logEmail(admin, {
          to_email: body.to,
          subject: body.subject,
          status: "failed",
          error_message: msg,
          triggered_by: userId,
          context: body.context ?? "send",
        });
        return new Response(JSON.stringify({ ok: false, error: msg }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Helper exportado para outras funções poderem cifrar a senha ao salvar
export { encryptSecret };
