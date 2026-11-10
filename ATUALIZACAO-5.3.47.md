# Atualizar para a versão 5.3.47

Esta versão completa a configuração do portal do síndico no Supabase. A tabela de sincronização existente e seus registros são preservados pelo SQL novo. Painel e portal precisam estar ambos na v5.3.47.

## Antes de começar

1. Baixe BKPs do painel e do celular e preserve a pasta anterior.
2. Confirme que você está no mesmo projeto Supabase configurado no sistema.
3. Seu diagnóstico mostrou kr2melo_sync_state existente com RLS e kr2melo_sindico_views ausente. Para esse caso, execute somente o SQL do portal indicado abaixo; não reaplique o esquema de sincronização.
4. RLS ativado na sincronização não comprova, sozinho, que suas políticas estão corretas. A tabela existente não será alterada nesta etapa; valide envio e recebimento com a sua conta depois.

## Computador

1. Execute primeiro o SQL do portal no Supabase e confira o resultado, conforme a seção Supabase.
2. Extraia o ZIP completo da v5.3.47 em uma pasta nova.
3. Abra KR2MELO-v5.3.47-Offline.exe e carregue o BKP quando solicitado.
4. Confira prédio, mês, APTs, valores e histórico antes de sincronizar.
5. Entre na mesma conta Supabase de operação e, depois da atualização do site, use Link do Síndico para publicar os dados e gerar o novo link.

## Netlify e celular

1. Atualize o mesmo projeto Netlify pela pasta Netlify desta entrega, ou pelo GitHub se seu projeto acompanha um repositório.
2. Se o portal é publicado em um projeto separado, publique também a nova subpasta portal-sindico nesse projeto. Atualizar só o painel deixa o portal antigo incompatível.
3. Mantenha os endereços existentes. Recarregue e confira v5.3.47 no painel/mobile.
4. Use o link recém-gerado do síndico para testar a consulta em outro aparelho. O código novo consulta por RPC; não funciona com a tabela ausente.
5. Se utilizar outro projeto Supabase, a configuração do portal publicado também precisa apontar para esse mesmo projeto. Configurar somente o painel não altera os valores padrão do site do portal.

## Supabase

1. Abra SQL Editor no projeto já utilizado pelo aplicativo e crie uma nova consulta.
2. Abra o arquivo supabase-portal-v5.3.47.sql desta pasta, copie seu conteúdo completo e execute no editor.
3. O script cria kr2melo_sindico_views e a função kr2melo_get_sindico_view. Não apaga nem altera kr2melo_sync_state.
4. Ao terminar, as duas tabelas devem aparecer com rls_ativado=true. A segunda consulta deve retornar anon_pode_listar=false e anon_pode_consultar_com_token=true.
5. Se o editor mostrar erro, pare e envie a mensagem completa antes de continuar. Se você executou apenas parte do script e ficou em uma transação com erro, execute ROLLBACK antes de repetir o arquivo completo.
6. Não preencha a tabela manualmente: o painel autenticado publica os dados ao gerar Link do Síndico. O campo owner_id é o ID da conta autenticada.
7. O arquivo supabase-setup.sql continua disponível apenas para uma instalação nova da sincronização; não é necessário reaplicá-lo no cenário diagnosticado.
8. Chave pública não substitui login do operador. Nunca use chave service_role no site.

## GitHub

1. Atualize o conteúdo do repositório pela pasta GitHub, preservando os caminhos.
2. Arquivos funcionais alterados: sync.js, portal-sindico/sync.js, app.js; identificação de versão/cache também atualizada.
3. O novo SQL está na pasta supabase. Guardar o arquivo no repositório não o executa no projeto Supabase.
4. Rode `node tests/test-reading-average.cjs` e `node tests/test-sindico-sync.cjs`.
5. Revise e registre as alterações. Se houver integração, aguarde o deploy do Netlify.

## Aprovação da atualização

1. No SQL Editor, confira as duas tabelas com RLS e os privilégios false/true descritos acima. Essas consultas verificam estrutura e permissões; não substituem testes de acesso.
2. No painel 5.3.47, entre na conta, gere Link do Síndico e confirme que a publicação foi bem-sucedida.
3. Abra o novo link em outro aparelho ou janela sem a sessão do operador. Deve exibir somente o condomínio autorizado pelo link.
4. Em uma cópia do link, altere um caractere do token. A consulta deve ser recusada, sem exibir dados.
5. Confira que o painel e o celular continuam sincronizando a mesma competência. Guarde BKP final.
6. Links são credenciais de consulta: compartilhe somente com o destinatário. Tokens antigos no formato curto serão substituídos ao gerar o link na versão nova; use e distribua o link recém-gerado.

## Retorno se necessário

1. Preserve as leituras mais recentes e o erro apresentado.
2. Se o SQL falhar antes do commit, a transação deve ser revertida, sem criar uma instalação parcial. O script não remove sua sincronização.
3. Se precisar voltar o aplicativo à v5.3.46, mantenha a nova tabela protegida. O portal antigo não é compatível com o novo formato; deixe a consulta indisponível até atualizar painel e portal juntos. Não libere SELECT anônimo para contornar o problema.
4. Não exclua tabelas ou dados para repetir a configuração. Caso encontre estrutura diferente, solicite migração específica.

## Validação realizada

19 testes da média aprovados. Testes simulados confirmam publicação com proprietário autenticado, consulta por RPC, tratamento de link inválido e geração criptográfica de tokens. Sintaxe JavaScript e revisão estática do SQL concluídas; executável compilado. O SQL não foi executado em um banco local nem no projeto do usuário: os testes de RLS e o teste real do link ainda precisam ser feitos na instalação.
