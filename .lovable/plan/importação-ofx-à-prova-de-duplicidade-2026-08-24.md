# Importação OFX à prova de duplicidade

## Estado atual (verificado)

- `src/lib/ofx.ts` já extrai `FITID` de cada transação (OFX 1.x SGML e 2.x XML).
- `movimentacoes_financeiras.fitid` guarda esse identificador e já existe o índice único parcial `movimentacoes_financeiras_conta_fitid_uniq (conta_id, fitid) WHERE fitid IS NOT NULL` — ou seja, o banco já impede duas movimentações com o mesmo FITID na mesma conta.
- O ponto fraco está no importador (`src/components/financeiro/ImportarOFXDialog.tsx`): a checagem de "já importado" usa apenas as movimentações carregadas na tela, com `.limit(1000)` e janela de ±60 dias em torno das datas do arquivo. Transações fora dessa janela/limite não são reconhecidas como já importadas, e a gravação em `Promise.all` engole o erro de violação de unicidade em um contador genérico de falhas.

## O que será feito

### 1. Verificação de duplicidade confiável
- Antes de montar a tabela, consultar o banco pelos FITIDs exatos do arquivo (`.in("fitid", fitids)` na conta selecionada, em blocos de até 500 IDs para não estourar a URL), sem depender de janela de datas nem de limite de linhas.
- Esse conjunto passa a ser a única fonte de verdade para `alreadyImported`; as movimentações da janela de datas continuam servindo apenas para sugerir vínculos.
- Duplicidade dentro do próprio arquivo (mesmo FITID repetido) também marcada como ignorada, mantendo só a primeira ocorrência.

### 2. Feedback claro na tela
- Resumo do arquivo passa a mostrar: total de transações, novas, já importadas (ignoradas) e duplicadas dentro do arquivo.
- Linhas já importadas ficam desabilitadas com badge "Já importada" e tooltip com o FITID, sem permitir mudar a ação.
- Transações sem FITID no arquivo (OFX malformado) ganham badge de alerta e exigem confirmação manual, pois não podem ser deduplicadas.

### 3. Gravação segura e erros legíveis
- Trocar o `insert` por `upsert` com `onConflict: "conta_id,fitid"` e `ignoreDuplicates: true`, de modo que uma corrida ou reimportação simultânea não crie duplicata nem quebre a importação.
- Capturar o erro por linha (em vez de um contador anônimo): ao final, listar quais transações falharam e o motivo (categoria não selecionada, duplicidade, erro de rede), com toast de resumo.

### 4. Testes
- Testes unitários de `parseOFX` (OFX 1.x e 2.x, FITID ausente, valores negativos).
- Teste da função pura de deduplicação: dado um conjunto de FITIDs existentes e uma lista de transações, retorna corretamente novas / já importadas / duplicadas no arquivo.

## Nota técnica

Nenhuma migração é necessária: a coluna `fitid` e o índice único já existem. O trabalho é todo em `src/components/financeiro/ImportarOFXDialog.tsx`, mais uma função pura nova em `src/lib/ofx.ts` (ou `src/lib/conciliacao.ts`) para a lógica de deduplicação, permitindo teste isolado.
