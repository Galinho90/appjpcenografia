# JP EVENTOS - DIÁRIAS

Quero desenvolver uma plataforma web de gestão para uma empresa de eventos especializada na montagem de stands. O sistema será utilizado para gerenciar colaboradores diaristas, controle de diárias e automação de pagamentos.

A aplicação deve utilizar o Supabase como backend, incluindo:

 Banco de dados (PostgreSQL)

 Autenticação de usuários

 Storage (se necessário)

 APIs automáticas (REST ou RPC)

1. Cadastro de colaboradores (diaristas)

Criar uma tabela de colaboradores com os seguintes campos:

 id (UUID)

 nome completo

 CPF

 telefone

 função

 valor padrão da diária

 chave PIX ou dados bancários (Banco Inter)

 data de cadastro

2. Controle de diárias

Criar uma tabela de diárias com:

 id

 colaborador_id (relacionamento)

 data trabalhada

 horário de entrada

 horário de saída

 valor da diária

 observações

Regras:

 Permitir cálculo automático da diária

 Possibilidade de edição manual

 Relacionamento com colaborador

3. Gestão financeira

Criar tabelas separadas para:

Vales (adiantamentos):

 id

 colaborador_id

 data

 valor

 descrição

Reembolsos:

 id

 colaborador_id

 data

 valor

 descrição

4. Fechamento quinzenal

Criar lógica para fechamento automático com base em dois períodos fixos:

 01 a 15

 16 a 30/31

Criar uma tabela de fechamentos:

 id

 colaborador_id

 período_inicio

 período_fim

 total_diárias

 total_vales

 total_reembolsos

 valor_final

 status (pendente, pago, erro)

Regras:

 Somar automaticamente:

 Diárias do período

 Subtrair vales

 Somar reembolsos

 Gerar resumo por colaborador

5. Integração com API do Banco Inter

Implementar integração com a API oficial do Banco Inter para:

 Realizar pagamentos via PIX

 Automatizar pagamentos na data de fechamento

 Atualizar status do pagamento no sistema

Requisitos:

 Criar função backend (Edge Function no Supabase) para envio de pagamentos

 Armazenar logs de transações

 Tratar erros da API

6. Autenticação e segurança

 Login com Supabase Auth

 Controle de acesso (admin)

 Proteção de rotas

7. Dashboard e relatórios

 Visão geral de custos por período

 Listagem de colaboradores

 Relatórios por:

 colaborador

 quinzena

 Exportação (CSV ou PDF)

8. Tecnologias sugeridas

 Frontend: React / Next.js

 Backend: Supabase

 Integrações: API Banco Inter

 Deploy: Vercel ou similar

9. Diferenciais desejados

 Interface simples e intuitiva

 Sistema rápido e responsivo

 Estrutura escalável

 Código organizado e documentado

Objetivo final

Criar um sistema completo para controle de diaristas, eliminando erros manuais e automatizando pagamentos quinzenais com integração bancária.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://appjpcenografia.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/514612f4-8139-4f08-a5f6-a1d7e882932f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
