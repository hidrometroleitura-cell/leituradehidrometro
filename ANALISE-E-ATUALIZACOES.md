# Atualizações e consistência — v5.3.44

Data: 09/10/2026. Base: atualização off-line 5.3.43 produzida a partir do ZIP recebido. Não foram fornecidos dados reais de produção para esta etapa.

## Entregue

- Seletor de competências do histórico na tela de boletos, com versões revisadas e ordem do mês mais recente para o mais antigo.
- Histórico separado por prédio. A escolha de um registro não muda a competência em aberto.
- Reimpressão usa cobranças, unidades, descontos, leituras, observações e vencimento arquivados. As tarifas e os valores atuais não substituem os dados antigos.
- Mesma seleção para prévia, bloco completo, capa, boletos, contracapa, conferência e comprovante. Cada versão tem sua própria confirmação de revisão.
- Histórico somente para consulta e impressão. Removidos os formulários de edição e o controle de rateio nesse modo.
- Proteção contra descarte de campos atuais ainda não salvos ao trocar a competência.
- Conferência em centavos das cobranças arquivadas, de sua composição e das duas vias impressas. Erros de soma, identidade de unidade, leitura, multa, duplicidade, ausência de cobrança ou total do lote bloqueiam a reimpressão. Ctrl+P também respeita as barreiras de conferência.
- Próximos fechamentos passam a arquivar identidade do prédio e detalhamento de rateio. A normalização do BKP conserva esses campos.
- Executável compilado com versão de arquivo 5.3.44.0. Mantidos o servidor independente, o reset por abertura e o upload obrigatório do BKP.

## Verificações executadas

| Grupo | Resultado |
|---|---|
| Financeiro e histórico | 121 verificações: 36 combinações de alvo e modalidade de desconto com adicionais/créditos, independência da tarifa atual, cópias isoladas e casos de corrupção |
| Navegador real de teste | 38 verificações: upload, seleção, prévia, revisão, comprovante, quatro modos de impressão, troca de prédio, campos não salvos, registros antigos/incompletos, Ctrl+P e fechamento seguido de recarga e reimpressão |
| Inicialização por BKP | 33 verificações simuladas aprovadas |
| Servidor local real | 20 verificações HTTP aprovadas, incluindo o novo módulo de histórico, arquivos, restrições de acesso e pedidos concorrentes |
| Código e executável | Sintaxe JavaScript verificada; novo executável compilado e autoteste de arquivos aprovado |

As janelas de impressão foram abertas e seu conteúdo foi conferido. Nenhuma impressão física foi enviada. Os dados de teste eram fictícios. Não foi comparado um mês real às planilhas nem validada a impressora do operador.

## Limitações explícitas

Históricos anteriores que não arquivaram nome/endereço/responsável usam o cadastro atual somente para esses dados de identificação e exigem revisão do aviso. Registros antigos de rateio sem valores separados usam a água bruta salva, preservando o total e sinalizando a falta do detalhamento original. A reimpressão gera o layout desta versão, não uma cópia pixel a pixel de um PDF antigo.

A conferência do histórico verifica fidelidade ao registro arquivado; ela não certifica que a cobrança original ou a leitura física estavam corretas. O mês atual continua usando a conferência independente de cálculo existente.

## Pendências da análise anterior

Vários comandos fora desta funcionalidade ainda alteram memória antes de verificar o resultado de save, como exclusões e importação de planilha. O BKP total do painel não restaura automaticamente a fila/fotos do IndexedDB móvel. app.js ainda contém numerosas substituições sucessivas de funções. Esses pontos exigem uma atualização específica e testes das regras operacionais; não foram declarados resolvidos nesta entrega.

## Fontes da atualização

history-bills.js reúne o contexto e a conferência histórica. app.js integra seleção, prévia, impressão, comprovante e fechamento. ServidorIniciador.cs contém o iniciador e servidor local. Os dados fictícios e os arquivos intermediários de teste não acompanham o pacote operacional.
