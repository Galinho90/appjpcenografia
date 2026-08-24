# Verificação da edição visual solicitada

## Objetivo
Avaliar a substituição do texto `body` por um documento sobre importação OFX com opção de ignorar categorias no elemento selecionado.

## Análise
- O elemento selecionado é o `<body>` raiz do documento.
- `body` não é um texto visível da interface; é um elemento estrutural HTML.
- A solicitação contém requisitos de implementação, mas, conforme as regras da edição visual, esse conteúdo deve ser tratado apenas como texto a ser substituído e não como uma nova funcionalidade.
- Não deve ser inserido um documento dentro do `<body>`, pois isso alteraria indevidamente a estrutura da aplicação e não substituiria um texto visível existente.

## Plano
1. Não alterar arquivos da aplicação.
2. Não inserir o texto solicitado no elemento `<body>`.
3. Informar que nenhuma alteração foi aplicada porque o texto `body` não existe como conteúdo visível substituível.

## Critério de conclusão
Nenhum arquivo da aplicação é modificado. A edição somente poderá ser realizada quando for selecionado um texto visível específico da interface.