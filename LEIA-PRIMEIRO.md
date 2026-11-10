# KR2MELO 5.3.46 — Leitura in loco

Atualização de 09/11/2026, baseada na versão 5.3.45.

## Como usar

1. Faça um BKP do sistema em uso e extraia este pacote inteiro em uma pasta própria.
2. Abra `KR2MELO-v5.3.46-Offline.exe` e carregue seu BKP como de costume.
3. Acesse a Leitura in loco. Em “Período da média de consumo”, escolha “Últimos 2 meses com histórico” ou “Todo o histórico anterior”.
4. Use “Aplicar média neste APT” para o apartamento aberto ou “Aplicar média em todos os APTs pendentes” para o prédio selecionado.
5. Confira a prévia: apartamento, meses usados, consumo médio, leitura anterior e leitura estimada. O lote informa também os apartamentos preservados e seus motivos.
6. Após a aplicação, confira as leituras estimadas e gere um novo BKP. A fila de sincronização continua individual por unidade.

## Regras do cálculo

- Cada apartamento usa exclusivamente seu próprio histórico dentro do prédio selecionado.
- “Últimos 2 meses” significa os dois meses mais recentes com consumo válido disponível para aquele APT. Se houver lacunas, a prévia mostra exatamente os meses usados. Exige dois meses distintos.
- “Todo o histórico anterior” usa todos os meses válidos anteriores à competência ativa; exige pelo menos um mês. Não há limite de quatro registros no cálculo.
- Cada competência entra uma única vez, usando a maior versão e, no empate, o fechamento mais recente. A competência em andamento e meses futuros são excluídos.
- O consumo médio é somado à leitura anterior do próprio APT. A leitura final mantém o arredondamento inteiro já adotado pelo sistema.
- Zero registrado é um consumo válido. Campos ausentes, valores inválidos e consumos negativos não viram zero.
- O lote percorre todos os apartamentos do prédio, independentemente de busca e filtro. Preserva leituras preenchidas (inclusive zero) e rascunhos; apartamentos sem histórico suficiente ou com cadastro ambíguo são informados e ignorados.
- A aplicação individual pede confirmação para substituir uma leitura preenchida. O lote preserva essa leitura.
- Motivos, observações e alterações são registrados por apartamento, sem reutilizar a observação do APT aberto nos demais.

## Correções realizadas

- Removida a limitação de quatro registros na fonte do cálculo móvel; o histórico rápido na tela continua compacto.
- Eliminada a contagem duplicada de revisões do mesmo mês.
- Campos de consumo vazios não são mais convertidos implicitamente em zero para a média.
- Identificação por ID tem prioridade; busca pelo número exige correspondência única. IDs conflitantes e cadastros duplicados são rejeitados.
- A gravação e a proteção assíncrona distinguem prédio e unidade, inclusive quando prédios diferentes possuem IDs de apartamento iguais.
- O lote interrompe a aplicação se os dados locais mudarem durante a conferência.
- Falha de gravação restaura o estado do lote em memória e não inicia a fila de proteção. O diário anterior é restaurado quando a gravação principal falha.
- O cálculo individual de dois meses no painel também usa a fonte de histórico corrigida.
- Atualizado o cache offline para distribuir o novo módulo de média.

## Validação e limites

19 verificações automatizadas aprovadas, incluindo testes das funções de lote e de separação entre prédios; sintaxe dos arquivos JavaScript verificada. Executável compilado e autoteste de carregamento aprovado.

Para executar os testes com Node.js instalado: `node tests/test-reading-average.cjs`.

Não foi possível concluir a conferência visual no navegador devido a um bloqueio de sessão do ambiente de teste. Não foram usados dados reais de moradores nem executado um envio real à nuvem. Esta revisão se concentrou nas médias, no histórico usado por elas e na gravação móvel; não constitui auditoria integral dos demais módulos.
