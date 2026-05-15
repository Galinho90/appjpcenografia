// Edge Function: inter-pix-pagamento
// Envia pagamento PIX via API do Banco Inter PJ. Sem credenciais → modo MOCK.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PixRequest = {
  fechamento_id: string;
  valor: number;
  chave_pix: string;
  tipo_chave?: "cpf" | "cnpj" | "email" | "telefone" | "evp";
  descricao?: string;
  favorecido?: { nome?: string; documento?: string };
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function validate(raw: unknown): { ok: true; data: PixRequest } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "body inválido" };
  const b = raw as Record<string, unknown>;
  if (typeof b.fechamento_id !== "string" || !b.fechamento_id) return { ok: false, error: "fechamento_id é obrigatório" };
  if (typeof b.valor !== "number" || !isFinite(b.valor) || b.valor <= 0) return { ok: false, error: "valor inválido" };
  if (typeof b.chave_pix !== "string" || !b.chave_pix) return { ok: false, error: "chave_pix é obrigatória" };
  return { ok: true, data: b as unknown as PixRequest };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "método não permitido" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return json(500, { error: "Supabase env ausente" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims) return json(401, { error: "Unauthorized" });
  const userId = claims.claims.sub as string;

  const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (roleErr) return json(500, { error: `Falha ao checar papel: ${roleErr.message}` });
  if (!isAdmin) return json(403, { error: "Apenas admin pode iniciar pagamentos PIX" });

  let raw: unknown;
  try { raw = await req.json(); } catch { return json(400, { error: "JSON inválido" }); }
  const parsed = validate(raw);
  if (!parsed.ok) return json(400, { error: parsed.error });
  const payload = parsed.data;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const INTER_BASE_URL = Deno.env.get("INTER_BASE_URL") ?? "https://cdpj.partners.bancointer.com.br";
  const INTER_CLIENT_ID = Deno.env.get("INTER_CLIENT_ID");
  const INTER_CLIENT_SECRET = Deno.env.get("INTER_CLIENT_SECRET");
  const INTER_CERT_PEM = Deno.env.get("INTER_CERT_PEM");
  const INTER_KEY_PEM = Deno.env.get("INTER_KEY_PEM");
  const INTER_CONTA = Deno.env.get("INTER_CONTA_CORRENTE");

  const mockMode = !INTER_CLIENT_ID || !INTER_CLIENT_SECRET || !INTER_CERT_PEM || !INTER_KEY_PEM || !INTER_CONTA;

  let resultado: { id: string; status: string; raw: unknown };
  let logStatus: "sucesso" | "erro" = "sucesso";
  let logRaw: unknown;

  try {
    if (mockMode) {
      resultado = {
        id: `mock-inter-${crypto.randomUUID()}`,
        status: "processando",
        raw: { mock: true, aviso: "Credenciais Inter ausentes; modo desenvolvimento.", base_url: INTER_BASE_URL },
      };
    } else {
      // mTLS no Deno edge runtime ainda é limitado; deixamos um stub explícito.
      throw new Error("Integração Inter mTLS ainda não disponível no edge runtime; configure proxy intermediário.");
    }
    logRaw = { request: { ...payload, chave_pix: "***" }, response: resultado.raw, mock: mockMode };
  } catch (e: unknown) {
    logStatus = "erro";
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    logRaw = { request: { ...payload, chave_pix: "***" }, error: msg, mock: mockMode };
    resultado = { id: "", status: "erro", raw: logRaw };
  }

  const { error: logErr } = await admin.from("transacoes_log").insert({
    fechamento_id: payload.fechamento_id,
    valor: payload.valor,
    tipo: "pix",
    status: logStatus === "sucesso" ? "enviado" : "erro",
    resposta_api: logRaw as any,
  });
  if (logErr) console.error("Erro ao gravar transacoes_log:", logErr);

  if (logStatus === "sucesso" && !mockMode) {
    await admin.from("fechamentos").update({ status: "pago" }).eq("id", payload.fechamento_id);
  }

  if (logStatus === "erro") {
    return json(502, { ok: false, mock: mockMode, error: (logRaw as any).error, details: logRaw });
  }
  return json(200, { ok: true, mock: mockMode, transacao_id: resultado.id, status: resultado.status });
});
