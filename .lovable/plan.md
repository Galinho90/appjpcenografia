
## Objetivo

Criar um novo menu "Notas Fiscais" onde os diaristas podem **enviar** suas notas fiscais ao final de cada quinzena, e onde administradores/gerentes podem **visualizar, baixar, aprovar/rejeitar** essas notas vinculadas ao fechamento correspondente.

## Fluxo

1. Ao fechar a quinzena (gerar `fechamentos`), cada diarista terá um fechamento com período definido.
2. O diarista, ao acessar "Minhas Notas Fiscais", vê seus fechamentos e pode anexar a NF (PDF/imagem) referente àquela quinzena.
3. Admin/gerente acessa "Notas Fiscais" no menu lateral, vê todas as NFs enviadas filtradas por quinzena, com status (pendente/aprovada/rejeitada), download e ação de aprovar/rejeitar.

## Mudanças no banco

Nova tabela `notas_fiscais`:
- `id` uuid PK
- `fechamento_id` uuid (referência lógica ao fechamento)
- `colaborador_id` uuid
- `periodo_inicio` date, `periodo_fim` date (denormalizado p/ filtros rápidos)
- `numero` text (opcional — número da NF)
- `valor` numeric
- `data_emissao` date
- `arquivo_url` text (storage público assinado)
- `arquivo_nome` text
- `status` text default `'pendente'` (pendente | aprovada | rejeitada)
- `observacoes` text
- `created_at`, `updated_at` timestamptz

RLS:
- Admin/gerente: SELECT/UPDATE/DELETE de todas.
- Diarista (visualizador): SELECT/INSERT apenas das próprias (via `colaboradores.user_id = auth.uid()`).

Novo bucket de Storage `notas-fiscais` (privado), com políticas:
- Diarista pode fazer upload na pasta do próprio `user_id`.
- Admin/gerente pode ler tudo.

## Mudanças no frontend

**Nova página** `src/pages/NotasFiscais.tsx` (admin/gerente):
- Navegador de quinzena (mesmo padrão de `Fechamentos.tsx`).
- Lista todas NFs da quinzena: diarista, número, valor NF, valor fechamento, data emissão, status, ações (visualizar PDF, aprovar, rejeitar, excluir).
- Indicador de quais diaristas com fechamento ainda não enviaram NF.

**Nova página** `src/pages/MinhasNotasFiscais.tsx` (visualizador/diarista):
- Lista de fechamentos do próprio diarista.
- Botão "Enviar NF" abre dialog: upload de arquivo (PDF/JPG/PNG), número, valor, data de emissão.
- Mostra status da NF enviada e permite reenvio se rejeitada.

**Sidebar (`src/components/AppSidebar.tsx`)**:
- Adicionar item "Notas Fiscais" (ícone `Receipt`) em `staffMenuItems`.
- Adicionar item "Minhas NFs" em `diaristaMenuItems`.

**Rotas (`src/App.tsx`)**:
- `/notas-fiscais` → Staff (admin/gerente).
- `/minhas-notas` → diarista logado.

**Hooks** em `src/hooks/useSupabaseData.ts`:
- `useNotasFiscais(periodo)`, `useUploadNotaFiscal`, `useUpdateStatusNotaFiscal`, `useDeleteNotaFiscal`.

## Observações técnicas

- Usaremos URL assinada do storage (`createSignedUrl`) para visualizar/baixar arquivos.
- Validar tipos de arquivo (pdf/jpg/png) e tamanho (~10MB) no frontend antes do upload.
- O vínculo diarista↔auth se dá por `colaboradores.user_id`; a página do diarista filtrará seus fechamentos por esse id.
