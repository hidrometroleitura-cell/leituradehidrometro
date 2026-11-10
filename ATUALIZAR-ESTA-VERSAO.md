# Atualizar para a versão 5.3.46

Esta versão adiciona períodos de média e aplicação por lote na Leitura in loco. O código principal está em mobile.js e reading-average.js; app.js usa a fonte corrigida de histórico. O carregador, o cache offline e a identificação de versão também foram atualizados. As entregas incluem manual ilustrado e instruções por destino.

## Antes de começar

1. Salve as leituras em edição e interrompa temporariamente alterações nos aparelhos.
2. Baixe um BKP do painel e outro do celular. Guarde-os fora das pastas do programa.
3. Anote a versão anterior, o prédio, a competência, os APTs, a URL do Netlify, o projeto Supabase e o ramo usado no GitHub.
4. Preserve as pastas da versão anterior e resolva ou documente filas e conflitos antes de trocar a base.

## Computador

1. Extraia o ZIP completo em uma nova pasta.
2. Abra KR2MELO-v5.3.46-Offline.exe com todos os arquivos extraídos ao lado.
3. Selecione seu BKP quando o iniciador pedir e confira a prévia.
4. Compare prédio, mês, APTs, leituras anteriores, histórico e totais.
5. Confira v5.3.46 e o novo seletor de período na Leitura in loco.

## Netlify e celular

1. Identifique se o projeto é publicado manualmente ou acompanha o GitHub.
2. Na publicação manual, abra o projeto existente, entre em Deploys e envie a pasta Netlify. Não crie outro projeto para uma atualização comum.
3. Se o projeto publicado contém apenas o portal, mantenha o mesmo formato e publique portal-sindico; se é o sistema completo, mantenha index.html na raiz.
4. Se o Netlify acompanha o GitHub, siga a atualização do código abaixo e acompanhe o deploy correspondente, sem misturar os dois caminhos.
5. Abra os mesmos endereços. No computador, recarregue com Ctrl+F5; no celular, reabra o site ou atalho. Não limpe dados locais sem preservar BKP e fila.
6. Confira a versão e teste painel, /mobile.html e a consulta do síndico.

## Supabase

1. Para a atualização das médias da v5.3.46, não há migração nova obrigatória. Se a sincronização funciona, mantenha o mesmo projeto e suas tabelas.
2. O supabase-setup.sql entregue prepara kr2melo_sync_state para instalações novas; não é BKP de dados e não deve ser reaplicado automaticamente a cada versão.
3. O portal consulta kr2melo_sindico_views, que não é criada pelo SQL atual. Verifique sua existência e permissões antes de considerar uma instalação nova do portal concluída. Solicite o script específico se ela estiver ausente; não desative RLS para contornar o erro.
4. Se o projeto usa migrações por CLI, preserve esse fluxo e concilie o histórico antes de alterar o esquema pelo editor SQL.
5. Verifique que computador, celular e portal usam o mesmo projeto. Nunca use chave service_role no front-end.

## GitHub

1. Abra o repositório e confira o ramo de publicação.
2. Copie o conteúdo da pasta GitHub mantendo os caminhos. Não envie apenas o ZIP e não crie uma pasta GitHub adicional dentro da raiz do site.
3. Revise inclusões, substituições e exclusões, preservando os arquivos de configuração e a estrutura necessária.
4. Não envie BKPs, dados de moradores, cobranças particulares, senhas ou tokens.
5. Execute `node tests/test-reading-average.cjs` com Node.js instalado.
6. Registre a atualização e acompanhe o deploy se existir integração com Netlify. Arquivar SQL no repositório não o executa no banco.

## Aprovação da atualização

1. Em uma cópia de teste, confira a média de um APT pelos últimos dois meses e por todo o histórico.
2. Confira uma prévia do lote: cada APT deve ter seus próprios meses, anterior e estimativa; leituras preenchidas e rascunhos devem ser preservados.
3. Envie e receba uma leitura de teste pela mesma conta, confira o valor no destino e resolva conflitos antes de fechar o mês.
4. Abra o portal em outro aparelho e confira prédio, mês e valores quando sua estrutura estiver pronta.
5. Gere BKP final e só então retome a coleta real.

## Retorno se necessário

1. Preserve primeiro qualquer leitura registrada depois da atualização.
2. No computador, volte à pasta anterior e restaure a cópia correspondente; concilie leituras novas antes de enviar à nuvem.
3. No Netlify, republique os arquivos anteriores no mesmo projeto; pelo GitHub, reverta o código e acompanhe o deploy.
4. Como a mudança de médias não exige SQL novo, não há reversão de esquema associada a ela. Se houver outras mudanças no banco feitas fora desta entrega, use seu plano específico de retorno.

## Validação realizada

19 cenários automatizados de cálculo, lote e separação de dados aprovados; sintaxe JavaScript verificada e executável compilado. O teste visual e a validação real dos serviços conectados continuam a cargo da instalação de destino. Consulte o manual ilustrado para o uso integrado.
