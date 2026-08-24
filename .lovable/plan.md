# Importar OFX ignorando categorias

Permitir concluir a importação de OFX mesmo quando transações novas estão sem categoria, via um checkbox "Ignorar categorias".

## Comportamento

- Novo checkbox **"Ignorar categorias"** no cabeçalho do diálogo de importação OFX, ao lado dos filtros/resumo.
- Desmarcado (padrão): comportamento atual — o botão de conciliar fica bloqueado enquanto houver linha "Criar nova" sem categoria, e o seletor aparece com borda vermelha.
- Marcado:
  - o bloqueio some e o seletor de categoria deixa de ser obrigatório (sem borda de erro);
  - transações criadas sem categoria são gravadas com categoria vazia;
  - as categorias escolhidas manualmente continuam sendo respeitadas.
- Aviso curto no diálogo quando a opção estiver ativa, indicando quantas transações serão salvas sem categoria (elas podem ser categorizadas depois na página de Movimentações).

## Detalhes técnicos

Arquivo único: `src/components/financeiro/ImportarOFXDialog.tsx`.

- Novo estado `ignorarCategorias: boolean` (reset ao trocar de arquivo/fechar o diálogo).
- Em `handleConciliar`, a validação `if (!r.categoriaId) throw new Error("Categoria não selecionada")` passa a lançar apenas quando `!ignorarCategorias`; caso contrário o payload usa `categoria_id: r.categoriaId ?? null`.
- Condição `disabled` do botão de conciliar deixa de considerar `rows.some(r => r.action === "criar" && !r.categoriaId)` quando a opção está ativa.
- Estilo de erro no `SelectTrigger` da categoria condicionado à opção.

Banco: `movimentacoes_financeiras.categoria_id` já é nulo permitido — nenhuma migração necessária.

## Testes

Extrair a regra em um helper puro (ex.: `podeSalvarLinha` / validação de payload) e cobrir em `src/test/ofx.test.ts`: com checkbox marcado e desmarcado, com e sem categoria.
