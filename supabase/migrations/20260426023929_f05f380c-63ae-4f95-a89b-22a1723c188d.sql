-- 1) Redefinição de Senha (azul/primário)
UPDATE public.email_templates
SET html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redefinir Senha</title></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 24px;color:#ffffff;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:600;">🔐 Redefinir Senha</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <p style="margin:0 0 16px;font-size:16px;">Olá <strong>{{nome}}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>{{empresa}}</strong>. Clique no botão abaixo para criar uma nova senha.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:#2563eb;border-radius:8px;">
              <a href="{{link}}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">Redefinir minha senha</a>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:6px;margin:20px 0;">
            <tr><td style="padding:16px 20px;font-size:13px;color:#1e3a8a;line-height:1.5;">
              <strong>⏱ Importante:</strong> este link expira em <strong>1 hora</strong>. Se você não solicitou esta alteração, pode ignorar este e-mail com segurança — sua senha continuará a mesma.
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#71717a;line-height:1.5;">Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="{{link}}" style="color:#2563eb;word-break:break-all;">{{link}}</a></p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 24px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">{{empresa}} • Email automático, não responda</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>'
WHERE key = 'password_reset';

-- 2) E-mail de Teste (cinza neutro)
UPDATE public.email_templates
SET html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Teste de Envio</title></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="background:linear-gradient(135deg,#475569,#334155);padding:32px 24px;color:#ffffff;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:600;">✉️ Teste de Envio</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <p style="margin:0 0 16px;font-size:16px;">Olá!</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Este é um <strong>e-mail de teste</strong> enviado pelo sistema de <strong>{{empresa}}</strong> para validar a configuração do servidor SMTP.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;margin:20px 0;">
            <tr><td style="padding:16px 20px;font-size:14px;color:#166534;">
              <p style="margin:0;font-weight:600;">✅ Se você está lendo esta mensagem, a configuração está funcionando corretamente.</p>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:8px;margin:20px 0;">
            <tr><td style="padding:16px 20px;font-size:14px;color:#52525b;">
              <p style="margin:0 0 6px;"><strong>Empresa:</strong> {{empresa}}</p>
              <p style="margin:0;"><strong>Enviado em:</strong> {{data}}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 24px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">{{empresa}} • Email automático, não responda</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>'
WHERE key = 'test_email';

-- 3) Nota Fiscal — Solicitação (laranja/âmbar — pendência)
UPDATE public.email_templates
SET html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Solicitação de Nota Fiscal</title></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 24px;color:#ffffff;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:600;">📄 Solicitação de Nota Fiscal</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <p style="margin:0 0 16px;font-size:16px;">Olá <strong>{{nome}}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">O fechamento do seu período já foi processado e estamos aguardando o envio da sua <strong>nota fiscal</strong> para liberar o pagamento.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;margin:20px 0;">
            <tr><td style="padding:16px 20px;font-size:14px;color:#78350f;">
              <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;color:#92400e;">Resumo do fechamento</p>
              <p style="margin:0 0 6px;"><strong>Período:</strong> {{periodo_inicio}} a {{periodo_fim}}</p>
              <p style="margin:0 0 6px;"><strong>Total de diárias:</strong> R$ {{total_diarias}}</p>
              <p style="margin:0;font-size:16px;color:#18181b;"><strong>Valor a receber:</strong> R$ {{valor_final}}</p>
            </td></tr>
          </table>
          <p style="margin:24px 0 16px;font-size:15px;color:#52525b;line-height:1.6;">Acesse o sistema e faça o upload da nota fiscal correspondente a este período.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:#f59e0b;border-radius:8px;">
              <a href="{{link}}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">Enviar Nota Fiscal</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#71717a;">Em caso de dúvidas, entre em contato com a equipe administrativa.</p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 24px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">{{empresa}} • Email automático, não responda</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>'
WHERE key = 'nota_fiscal_solicitacao';

-- 4) Nota Fiscal — Recebida (azul informativo)
UPDATE public.email_templates
SET html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Nota Fiscal Recebida</title></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:32px 24px;color:#ffffff;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:600;">📥 Nota Fiscal Recebida</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <p style="margin:0 0 16px;font-size:16px;">Olá <strong>{{nome}}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Confirmamos o <strong style="color:#0284c7;">recebimento</strong> da sua nota fiscal. Ela passará pela conferência da equipe administrativa e em breve você receberá uma nova mensagem com o resultado da análise.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:6px;margin:20px 0;">
            <tr><td style="padding:16px 20px;font-size:14px;color:#075985;">
              <p style="margin:0 0 6px;"><strong>Nota:</strong> {{numero}}</p>
              <p style="margin:0 0 6px;"><strong>Período:</strong> {{periodo_inicio}} a {{periodo_fim}}</p>
              <p style="margin:0;"><strong>Valor:</strong> R$ {{valor}}</p>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#71717a;">Em caso de dúvidas, entre em contato com a equipe administrativa.</p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 24px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">{{empresa}} • Email automático, não responda</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>'
WHERE key = 'nota_fiscal_recebida';