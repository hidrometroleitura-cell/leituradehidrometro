# Atualizar GitHub para 5.3.47

## Antes de começar

1. Baixe BKPs do painel e do celular e preserve a pasta anterior.
2. Confirme que você está no mesmo projeto Supabase configurado no sistema.
3. Seu diagnóstico mostrou kr2melo_sync_state existente com RLS e kr2melo_sindico_views ausente. Para esse caso, execute somente o SQL do portal indicado abaixo; não reaplique o esquema de sincronização.
4. RLS ativado na sincronização não comprova, sozinho, que suas políticas estão corretas. A tabela existente não será alterada nesta etapa; valide envio e recebimento com a sua conta depois.

## Passo a passo

1. Atualize o conteúdo do repositório pela pasta GitHub, preservando os caminhos.
2. Arquivos funcionais alterados: sync.js, portal-sindico/sync.js, app.js; identificação de versão/cache também atualizada.
3. O novo SQL está na pasta supabase. Guardar o arquivo no repositório não o executa no projeto Supabase.
4. Rode `node tests/test-reading-average.cjs` e `node tests/test-sindico-sync.cjs`.
5. Revise e registre as alterações. Se houver integração, aguarde o deploy do Netlify.

## Aprovação

1. No SQL Editor, confira as duas tabelas com RLS e os privilégios false/true descritos acima. Essas consultas verificam estrutura e permissões; não substituem testes de acesso.
2. No painel 5.3.47, entre na conta, gere Link do Síndico e confirme que a publicação foi bem-sucedida.
3. Abra o novo link em outro aparelho ou janela sem a sessão do operador. Deve exibir somente o condomínio autorizado pelo link.
4. Em uma cópia do link, altere um caractere do token. A consulta deve ser recusada, sem exibir dados.
5. Confira que o painel e o celular continuam sincronizando a mesma competência. Guarde BKP final.
6. Links são credenciais de consulta: compartilhe somente com o destinatário. Tokens antigos no formato curto serão substituídos ao gerar o link na versão nova; use e distribua o link recém-gerado.

## Retorno

1. Preserve as leituras mais recentes e o erro apresentado.
2. Se o SQL falhar antes do commit, a transação deve ser revertida, sem criar uma instalação parcial. O script não remove sua sincronização.
3. Se precisar voltar o aplicativo à v5.3.46, mantenha a nova tabela protegida. O portal antigo não é compatível com o novo formato; deixe a consulta indisponível até atualizar painel e portal juntos. Não libere SELECT anônimo para contornar o problema.
4. Não exclua tabelas ou dados para repetir a configuração. Caso encontre estrutura diferente, solicite migração específica.
