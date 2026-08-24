# Plano — Verificação da edição visual no elemento body

## Objetivo
Avaliar a solicitação para substituir o texto `body` por um documento sobre salvar transações OFX sem categoria.

## Constatação
- O elemento selecionado é o `<body>` raiz do documento HTML.
- `body` não é um texto visível renderizado pela aplicação.
- O texto solicitado descreve uma funcionalidade, mas nesta operação deve ser tratado somente como conteúdo de substituição; não será implementado como feature.
- Inserir esse documento no `<body>` alteraria indevidamente a estrutura da aplicação e não corresponderia à substituição de um texto visual existente.

## Plano de execução
1. Não modificar arquivos da aplicação.
2. Não inserir o texto solicitado no elemento `<body>`.
3. Informar que nenhuma alteração foi aplicada porque não existe um texto de interface `body` substituível.
4. Para uma alteração real de interface, selecionar um texto visível específico dentro do diálogo de importação OFX.

## Critério de conclusão
Nenhuma alteração na aplicação. O plano será concluído após confirmar que `body` é um seletor estrutural, não uma string exibida.