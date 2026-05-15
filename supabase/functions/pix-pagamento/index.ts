// Edge Function: pix-pagamento (despachante)
// Lê integração bancária ativa e encaminha para a função correspondente (inter-pix-pagamento ou c6-pix-pagamento).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: integ, error: integErr } = await admin
    .from("integracoes_bancarias")
    .select("banco, apelido, ambiente")
    .eq("ativo", true)
    .maybeSingle();
  if (integErr) return json(500, { error: `Falha ao buscar integração ativa: ${integErr.message}` });
  if (!integ) return json(400, { error: "Nenhuma integração bancária ativa. Configure em Integrações." });

  const target = integ.banco === "inter" ? "inter-pix-pagamento" : "c6-pix-pagamento";

  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { error: "JSON inválido" }); }

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${target}`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));
  return json(resp.status, { ...data, banco: integ.banco, apelido: integ.apelido });
});
