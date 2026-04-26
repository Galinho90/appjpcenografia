INSERT INTO public.email_templates (key, description, subject, html, variables) VALUES
(
  'nota_fiscal_solicitacao',
  'Enviado ao colaborador para solicitar/cobrar o envio da Nota Fiscal referente ao período de fechamento.',
  'Solicitação de Nota Fiscal - {{empresa}}',
  '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background:#f4f4f5; padding:24px; color:#111;">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:8px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <tr><td>
        <h2 style="margin-top:0; color:#0f172a;">Olá, {{nome}}</h2>
        <p>Identificamos que o fechamento do período <strong>{{periodo_inicio}}</strong> a <strong>{{periodo_fim}}</strong> está pronto e ainda não recebemos sua <strong>Nota Fiscal</strong>.</p>
        <p>Resumo do período:</p>
        <ul>
          <li>Total de diárias: <strong>R$ {{total_diarias}}</strong></li>
          <li>Total a receber: <strong>R$ {{valor_final}}</strong></li>
        </ul>
        <p>Por favor, envie sua NF acessando o link abaixo:</p>
        <p style="text-align:center; margin:24px 0;">
          <a href="{{link}}" style="background:#2563eb; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">Enviar Nota Fiscal</a>
        </p>
        <p style="color:#64748b; font-size:13px;">Se já enviou, desconsidere este e-mail.</p>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
        <p style="color:#64748b; font-size:12px;">{{empresa}}</p>
      </td></tr>
    </table>
  </body></html>',
  '["nome","empresa","periodo_inicio","periodo_fim","total_diarias","valor_final","link"]'::jsonb
),
(
  'nota_fiscal_recebida',
  'Confirmação enviada ao colaborador quando sua Nota Fiscal é recebida/aprovada.',
  'Nota Fiscal recebida - {{empresa}}',
  '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background:#f4f4f5; padding:24px; color:#111;">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:8px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <tr><td>
        <h2 style="margin-top:0; color:#0f172a;">Recebemos sua Nota Fiscal ✅</h2>
        <p>Olá <strong>{{nome}}</strong>,</p>
        <p>Confirmamos o recebimento da sua Nota Fiscal nº <strong>{{numero}}</strong> no valor de <strong>R$ {{valor}}</strong>, referente ao período de <strong>{{periodo_inicio}}</strong> a <strong>{{periodo_fim}}</strong>.</p>
        <p>O pagamento será processado conforme as condições combinadas.</p>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
        <p style="color:#64748b; font-size:12px;">{{empresa}}</p>
      </td></tr>
    </table>
  </body></html>',
  '["nome","empresa","numero","valor","periodo_inicio","periodo_fim"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;