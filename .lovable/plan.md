## Adicionar botão "Duplicar" na lista de lançamentos

Permite lançar rapidamente Diária + Dobra + Hora Extra (ou qualquer combinação) no mesmo dia, para o mesmo diarista, com 1 clique.

### Como vai funcionar

1. Em cada linha da tabela (e em cada card no mobile) de `src/pages/Diarias.tsx`, adicionar um ícone **Copy** ao lado dos botões Editar/Excluir.
2. Ao clicar, abre o modal de Novo Lançamento **pré-preenchido** com:
   - `colaborador_id`, `data`, `cliente_id`, `descricao` copiados do lançamento de origem
   - `categoria_id` **vazio** (usuário escolhe Dobra ou Hora Extra)
   - `valor` **vazio** (preenchido automaticamente quando escolher diarista/categoria)
   - `hora_entrada` / `hora_saida` vazios
3. `editingId` fica `null` → ao salvar, cria um **novo** registro (não sobrescreve o original).
4. Permissão: só aparece para quem tem `canEdit` (mesma regra do Editar).

### Observação técnica

- O banco já aceita múltiplos lançamentos para `colaborador_id + data` (sem `UNIQUE`), e o filtro/listagem já ordena por data + created_at, então os 3 lançamentos aparecem agrupados naturalmente.
- Sem mudanças de schema, sem migration, sem mudança em hooks. Edição apenas em `src/pages/Diarias.tsx`.

### Arquivos alterados

- `src/pages/Diarias.tsx` — função `openDuplicate(l)` + botão Copy na tabela desktop e nos cards mobile.
