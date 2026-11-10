# Dashboard 5.3.45

Atualização visual e de acompanhamento, sobre a versão 5.3.44.

## Acrescentado

- Progresso: quantidade de leituras válidas, percentual, leituras ausentes, inválidas e estimadas.
- Comparação de consumo com a última competência anterior do histórico, respeitando a versão mais recente. A comparação definitiva depende de dados completos, sem conflitos e com as mesmas unidades.
- Resumo de conflitos, transferências pendentes e estimativas, com atalhos para fechamento, boletos e BKP.
- Texto dos descontos compatível com os alvos já suportados pelo sistema.
- Layout adaptado a telas menores, com estilos limitados aos novos cartões.

## Preservado

Os quatro indicadores, gráfico por apartamento, alertas, pesquisa e legenda do Dashboard continuam presentes. Nenhuma regra de tarifa, cobrança, fechamento ou reimpressão foi substituída. O reset por abertura e o upload obrigatório de BKP permanecem.

Comparação binária confirmou que financial.js, auditor.js, sync.js, history-bills.js, mobile.js, mobile.html, mobile.css e manifest.webmanifest são idênticos aos da versão 5.3.44. No painel, a alteração é um complemento do renderizador do Dashboard e metadados para distinguir consumo histórico ausente de um total zero.

## Verificação desta atualização

- 23 verificações do resumo do Dashboard: leitura parcial, inválida, conflito, estimativa, transferência pendente, mudança de unidades, base zero, revisão mais recente e consulta sem alteração dos dados.
- 45 verificações no navegador: os 38 cenários anteriores de histórico/impressão/fechamento, mais presença dos novos cartões, progresso, consumo histórico, preservação de indicadores e pesquisa, consulta sem gravação e tela estreita sem rolagem horizontal.
- 33 verificações simuladas da inicialização por BKP.
- 21 verificações do servidor HTTP local, incluindo o novo módulo.
- Código JavaScript verificado e executável recompilado com versão 5.3.45.0.

Os dados usados nos testes e na prévia são fictícios. Nenhuma cobrança real foi emitida e nenhuma impressão física foi enviada. As limitações anteriores sobre recuperação da fila/fotos móveis e alguns comandos que não tratam falhas de persistência continuam registradas em ANALISE-E-ATUALIZACOES.md.
