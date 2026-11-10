# KR2MELO — padrão de entrega

Após cada atualização, gerar e entregar separadamente:

1. Um ZIP completo com o sistema e o executável atualizado.
2. Uma pasta `Netlify` com os arquivos estáticos prontos para publicação.
3. Uma pasta `Supabase` com o SQL e as instruções de configuração do backend.
4. Uma pasta `GitHub` com o código-fonte, testes e instruções de manutenção.

Identificar a versão em todas as entregas. Incluir orientações específicas em cada pasta e manter o empacotador reproduzível no código-fonte. Pode fornecer um ZIP de entregas que preserve as três pastas separadas e o ZIP completo.

Em toda atualização, incluir obrigatoriamente:

- Manual ilustrado de uso integrado do painel, Leitura in loco, portal, Netlify, Supabase e GitHub, revisto quando o fluxo mudar.
- `ATUALIZAR-ESTA-VERSAO.md` com a versão, os passos para atualizar cada sistema, arquivos afetados, necessidade ou ausência de migração SQL, ordem das ações, preservação de dados, testes de aprovação e retorno.
- Orientações específicas dentro das pastas Netlify, Supabase e GitHub. Distinguir publicação dos arquivos, transferência de leituras e migração do banco. Informar explicitamente quando nenhuma ação de banco é necessária.

Não apresentar desenhos de telas como capturas reais. Não afirmar que uma integração funciona sem verificar seus pré-requisitos; registrar limitações concretas no manual e no roteiro.

Não incluir BKPs, dados de moradores, cobranças particulares, tokens de sessão, senhas ou chaves privilegiadas nos pacotes de publicação. Preparar arquivos não autoriza publicar, enviar alterações a repositórios ou executar SQL remoto.
