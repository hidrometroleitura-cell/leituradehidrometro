# Usar os sistemas juntos

Um roteiro do cadastro à consulta do síndico e da versão antiga à versão atualizada.

O painel organiza o condomínio, o celular registra as leituras e o portal apresenta a consulta. Netlify hospeda as telas; Supabase guarda a cópia sincronizada; GitHub organiza o código. O BKP é a cópia que você guarda para restaurar o trabalho.

## A regra para trabalhar em equipe

Antes de sair, confirme prédio e competência no computador e no celular. Depois da coleta, confira o recebimento de cada leitura no painel antes de fechar o mês. Atualizar os arquivos do site não transfere automaticamente os dados salvos em um aparelho.

## Encontre a tarefa

Preparação e arquivos: página 2. Rotina com nuvem: 3. Leitura e médias: 4. Trabalho sem internet: 5. Fechamento e portal: 6. Ordem da atualização: 7. Executável: 8. Netlify: 9. Supabase: 10. GitHub: 11. Conferência e problemas: 12.

<b>Sobre as figuras:</b> os desenhos reproduzem os nomes dos controles verificados no código da v5.3.47. São esquemas para orientação, não capturas de uma conta ou instalação real.

# Preparar arquivos e acessos

Separe o programa, os dados e os serviços antes da primeira leitura.

<b>1.</b> Guarde o BKP atual fora da pasta que será substituída. Anote prédio, competência, quantidade de APTs e endereço do site em uso.

<b>2.</b> Extraia o pacote inteiro. No computador, abra o executável da nova versão e selecione o BKP completo quando o iniciador solicitar.

<b>3.</b> Para usar o celular fora do computador, utilize o endereço publicado no Netlify seguido de /mobile.html. Um endereço 127.0.0.1 pertence apenas ao computador onde o servidor está rodando.

<b>4.</b> Na tela <b>Sincronização entre dispositivos</b>, confira URL do projeto e chave pública anon/publishable; use a mesma conta de operação nos dois aparelhos. No celular, entre pelo painel web antes de abrir a Leitura in loco.

<b>5.</b> No Supabase, execute o SQL do portal indicado para a v5.3.47. Se a sincronização já existe, preserve sua tabela; veja a ordem e as verificações na página 10.

<b>Computador e site são origens diferentes:</b> o navegador mantém dados separados por endereço e porta. Uma nova porta local ou outro domínio pode abrir sem os dados anteriores. Restaure o BKP ou receba a cópia correta da nuvem.

# Executar a rotina com nuvem

Um aparelho envia a base; o outro confirma o recebimento antes de começar.

<b>1.</b> No computador, confira os cadastros, as leituras anteriores e o mês aberto. Gere o BKP e envie a base para a nuvem.

<b>2.</b> No celular, receba os dados e compare prédio, competência e APTs. Se houver leituras locais pendentes, preserve um BKP e resolva a transferência antes de substituir a base.

<b>3.</b> Abra <b>Leitura in loco</b>, selecione o prédio e registre cada APT. Use <b>Salvar e próximo</b> após conferir o valor.

<b>4.</b> Ao terminar, abra <b>Backup, código e nuvem</b> e use <b>Enviar nuvem</b>. Aguarde a fila; conexão com a internet, sozinha, não comprova recebimento.

<b>5.</b> No painel, receba a nuvem e confira os números dos APTs, as leituras e os conflitos na ponte de dados. No mesmo navegador e origem, use também <b>Atualizar dados in loco</b>.

<b>6.</b> Gere um novo BKP após a conferência. Só então continue para fechamento e boletos.

<b>Se aparecer conflito:</b> compare competência, leitura anterior, leitura atual e horário dos registros. Preserve um BKP dos dois lados antes de escolher o valor correto.

# Registrar leituras e aplicar médias

A opção de período e o lote usam o histórico de cada apartamento separadamente.

<b>1.</b> Sempre que for possível, registre a leitura real. Use estimativa quando a situação justificar e confira o motivo e a observação do APT.

<b>2.</b> Escolha <b>Últimos 2 meses com histórico</b> ou <b>Todo o histórico anterior</b>. Os dois meses são os mais recentes disponíveis com consumo válido daquele APT, não necessariamente dois meses consecutivos.

<b>3.</b> A primeira opção exige dois meses distintos; a segunda, pelo menos um. Revisões da mesma competência contam uma vez. O mês aberto e meses futuros ficam fora.

<b>4.</b> Confira o consumo médio, os meses usados, a leitura anterior e a estimada. A estimativa é somada à leitura anterior e arredondada para inteiro.

<b>5.</b> No lote, leituras preenchidas e rascunhos são preservados. Histórico insuficiente ou cadastro ambíguo gera indicação para conferência. Na aplicação individual, confirme antes de substituir uma leitura existente.

<b>Exemplo:</b> APT 1: anterior 100, consumos 10 e 20 → média 15 → estimada 115. APT 2: anterior 200, consumos 30 e 50 → média 40 → estimada 240. O resultado do APT 1 não entra no cálculo do APT 2.

# Trabalhar sem internet

Use a cópia local e transfira as leituras quando puder conferir os dois lados.

<b>1.</b> Antes de sair, abra a Leitura in loco com internet e confira que a base correta já está no celular. O uso offline depende dos arquivos previamente carregados e do armazenamento preservado no aparelho.

<b>2.</b> Durante a coleta, salve cada leitura. Ao terminar, use <b>Baixar BKP</b> no celular e guarde o arquivo; fotos e filas locais merecem uma cópia antes de qualquer atualização.

<b>3.</b> Para o caminho por código, toque <b>Copiar código</b> no celular. No painel, em Leituras do mês, use <b>Importar código do celular</b> e confira a lista de leituras recebidas e conflitos.

<b>4.</b> Como alternativa, transfira o BKP móvel e use o fluxo de importação reconhecido pelo painel. Leia a prévia para distinguir transferência de leituras de restauração completa; não confirme uma substituição geral por engano.

<b>5.</b> Confira todos os APTs e gere um BKP atualizado do painel. Se for usar a confirmação manual de sincronização por BKP no fechamento, identifique o operador e confirme somente os dados efetivamente recebidos.

<b>6.</b> Quando houver internet, envie a fila móvel. Se o sistema bloquear a troca do mês por falta de confirmação, preserve a cópia e resolva o recebimento antes de importar outra competência.

## O que não comprova uma transferência

Gerar um BKP ou copiar um código não significa que o outro aparelho recebeu as leituras. O recebimento só está conferido depois de comparar os valores no painel. O status de uma fila local também não substitui essa comparação.

<b>Fotos:</b> não presuma que todas as imagens já foram transferidas apenas porque uma leitura foi salva. Teste uma foto na consulta de destino e preserve a cópia do aparelho de origem.

# Fechar o mês e abrir o portal

Primeiro os dados conferidos, depois o histórico e a consulta externa.

<b>1.</b> Confirme que o painel recebeu todas as leituras previstas. Revise consumo, tarifa, descontos e estimativas. Não contorne um bloqueio de leitura ou sincronização sem resolver sua causa.

<b>2.</b> No <b>Fechamento mensal</b>, confira a competência e os avisos antes de confirmar. Guarde o BKP do fechamento e confira os boletos do período correto.

<b>3.</b> Para o próximo ciclo, prepare o cadastro no painel e entregue a base da nova competência ao celular. Não reabra leituras antigas para representar outro mês.

<b>4.</b> Para o síndico, clique <b>Link do Síndico</b>. Salve o endereço público da instalação do portal: a raiz do site se publicou apenas o portal, ou /portal-sindico se ele está nessa subpasta.

<b>5.</b> Use <b>Abrir Visão do Síndico</b> e confira mês, APTs, valores e histórico em outro aparelho. Compartilhe o link somente depois desse teste.

<b>Na v5.3.47:</b> execute supabase-portal-v5.3.47.sql e atualize painel e portal juntos. A publicação exige a conta do operador; a consulta valida o prédio e o token no banco, sem permitir a listagem anônima da tabela. Distribua o novo link gerado pelo painel.

# Atualizar na ordem correta

Atualizar programa e transferir dados são tarefas diferentes.

<b>1.</b> Pare temporariamente a digitação nos aparelhos e anote a versão em uso. Faça BKP do painel e do celular; confirme que os arquivos foram realmente baixados.

<b>2.</b> Leia <b>ATUALIZAR-ESTA-VERSAO.md</b>. Ele deve dizer quais arquivos mudaram, se há SQL obrigatório, a ordem de aplicação e o teste esperado.

<b>3.</b> Na <b>v5.3.47, execute primeiro o SQL do portal</b>, depois atualize painel e portal. O script novo preserva kr2melo_sync_state; não reaplique o esquema da sincronização por rotina.

<b>4.</b> Atualize o computador e o site. Se o Netlify está conectado ao GitHub, atualizar o ramo publicado pode disparar o deploy; trate os dois como o mesmo caminho de publicação.

<b>5.</b> Abra a versão nova, restaure o BKP quando solicitado e confira os dados antes de qualquer envio para a nuvem. O primeiro envio deve partir da base já validada.

<b>6.</b> Atualize o celular pelo mesmo endereço, teste o recebimento de um APT e confira o portal. Baixe o BKP final e registre a versão aprovada.

## O que acompanhará as próximas versões

O ZIP completo, as pastas Netlify, Supabase e GitHub, este manual revisado quando o fluxo mudar e um roteiro específico da versão. Cada roteiro deverá dizer o que atualizar, o que preservar, como confirmar o resultado e como retornar à versão anterior.

<b>Não crie outro site nem outro banco para uma atualização comum.</b> Manter os mesmos endereços e o mesmo projeto evita separar os dados e quebrar links já distribuídos.

# Atualizar o executável do computador

Use o ZIP completo e mantenha a versão anterior disponível até concluir a conferência.

<b>1.</b> Na versão atual, salve o trabalho e baixe um BKP completo. Guarde-o fora das pastas do programa e preserve a pasta anterior.

<b>2.</b> Feche as janelas do painel antigo. Extraia o <b>ZIP completo</b> da nova entrega em uma pasta nova; não execute diretamente de dentro do ZIP.

<b>3.</b> Abra <b>KR2MELO-v5.3.47-Offline.exe</b>. Mantenha app.js, mobile.js, assets e os demais arquivos ao lado do executável, na estrutura extraída.

<b>4.</b> O iniciador pode solicitar o BKP para iniciar uma sessão limpa. Selecione o arquivo conferido, revise a prévia e prossiga.

<b>5.</b> Confira v5.3.47 na tela, prédio, competência aberta, número de APTs, leituras anteriores, histórico e totais. Abra a Leitura in loco e confira o seletor de período da média.

<b>6.</b> Depois de validar, sincronize a base correta e baixe outro BKP. Em uma nova abertura do iniciador, tenha esse arquivo atualizado disponível.

## Se precisar voltar

Feche a versão nova, abra a pasta anterior e use o BKP feito antes da atualização. Se já registrou trabalho novo, exporte-o antes e concilie as diferenças; restaurar uma cópia antiga pode deixar de fora as leituras recentes. Não envie uma base antiga para a nuvem sem comparar.

# Atualizar o site no Netlify

Mantenha o mesmo projeto e a mesma URL para preservar os acessos.

<b>1.</b> Identifique o projeto e anote sua URL. Abra sua área <b>Deploys</b>. Não use a criação de outro projeto para atualizar o site existente.

<b>2.</b> Para envio manual, arraste a pasta Netlify da entrega para a área de publicação do projeto. Neste pacote estático, index.html fica na raiz e não há compilação do aplicativo.

<b>3.</b> Se sua publicação é apenas do portal, mantenha esse formato: publique a subpasta portal-sindico no projeto do portal. Não troque uma instalação só do portal pelo painel completo sem planejar a URL.

<b>4.</b> Espere a publicação terminar. Abra o endereço habitual e confira a versão no painel e no mobile; no computador use Ctrl+F5 se necessário.

<b>5.</b> No celular, feche e reabra a página ou o atalho instalado. Preserve BKP e fila antes de limpar dados de navegação, pois a coleta local pode ser apagada.

<b>6.</b> Teste a consulta do síndico com um link real validado. Para retorno, preserve o trabalho novo e republique a pasta da versão anterior no mesmo projeto.

<b>Netlify guarda os arquivos do site.</b> As leituras ficam na origem local e na sincronização; atualizar HTML e JavaScript não restaura os dados do navegador nem substitui um BKP.

Referência: docs.netlify.com/deploy/create-deploys/ — atualização manual de site existente e integração com Git.

# Atualizar o Supabase

Na v5.3.47, crie a tabela e a função de consulta do portal antes de atualizar as telas.

<b>1.</b> Abra o projeto Supabase já usado pelo sistema. Confirme que é o mesmo projeto configurado no computador, no celular e no portal.

<b>2.</b> Abra SQL Editor e execute supabase-portal-v5.3.47.sql por inteiro. No cenário diagnosticado, a sincronização existe e o portal está ausente; o script preserva a tabela de sincronização.

<b>3.</b> Confira as duas tabelas com RLS=true e os privilégios do visitante: anon_pode_listar=false e anon_pode_consultar_com_token=true. Em uma instalação totalmente nova, supabase-setup.sql prepara primeiro a sincronização.

<b>4.</b> Se ocorrer erro, envie a mensagem e interrompa a configuração. O SQL usa transação e não apaga tabelas. Se executou só parte e a transação ficou em erro, use ROLLBACK antes de repetir o arquivo completo.

<b>5.</b> Atualize painel e portal para 5.3.47, entre na conta e gere Link do Síndico. O painel publica o registro com o proprietário correto; não é necessário preencher a tabela manualmente.

<b>6.</b> Teste o link em outro aparelho. Depois, altere um caractere do token em uma cópia: a consulta deve falhar. Não libere SELECT anônimo nem use service_role no site. Links curtos antigos serão substituídos ao gerar um novo link.

<b>Retorno:</b> uma mudança no banco não é desfeita apenas trocando os arquivos do site. Para migrações futuras, siga o plano de retorno específico antes de executar qualquer reversão.

Referências: supabase.com/docs/guides/database/overview e supabase.com/docs/guides/deployment/database-migrations.

# Atualizar o GitHub

O repositório guarda o código e pode ser a origem do deploy do Netlify.

<b>1.</b> Abra o repositório existente e confirme o ramo de publicação. Guarde a referência da versão anterior para poder localizar seu código.

<b>2.</b> Copie o conteúdo da pasta GitHub para os mesmos caminhos do repositório. Pelo navegador, use <b>Add file → Upload files</b>; em atualização com Git, revise a lista de mudanças antes do commit.

<b>3.</b> Mantenha index.html, mobile.html e netlify.toml na raiz se esse é o formato da publicação. Não crie uma subpasta GitHub dentro da raiz existente sem ajustar a configuração.

<b>4.</b> Confira também arquivos removidos: um upload de substituições não elimina automaticamente arquivos antigos. Preserve .gitignore, AGENTS.md, tests e tools.

<b>5.</b> Não envie BKPs, cobranças particulares, senhas ou tokens. Registre a alteração com uma descrição clara da versão; se o ramo exige revisão, siga o fluxo de pull request.

<b>6.</b> Se o Netlify acompanha esse ramo, aguarde o deploy correspondente e faça o teste da página 9. Sem integração configurada, o commit sozinho não atualiza o site.

<b>Supabase é independente:</b> guardar um arquivo .sql no GitHub não o executa no banco. Na v5.3.47, execute <b>node tests/test-reading-average.cjs</b> para verificar os 19 cenários disponíveis antes da publicação.

<b>Retorno:</b> reverta as alterações de código para o estado anterior e acompanhe a nova publicação; preserve e concilie os dados recentes. Referência: docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository.

# Conferir antes de retomar o trabalho

Use este roteiro ao terminar cada atualização.

## Lista de aprovação

□ BKP anterior e BKP final guardados e identificados por data e versão.

□ Versão esperada aberta no computador e no celular, pelo endereço correto.

□ Mesmo prédio, competência e quantidade de apartamentos nos dois aparelhos.

□ Leituras anteriores, histórico e totais comparados antes do primeiro envio.

□ Média individual conferida com meses explícitos e uma prévia do lote revisada.

□ Um recebimento de leitura testado no painel e link do portal testado com token correto e incorreto.

□ Portal 5.3.47 aberto em outro aparelho com prédio, competência e valores conferidos.

□ URL do Netlify, projeto Supabase e ramo do GitHub preservados ou documentados se mudaram.

## Se algo não conferir

<b>Celular não mostra as leituras:</b> compare conta, projeto, prédio e mês; receba a base correta sem descartar a fila pendente. <b>Média indisponível:</b> confira meses válidos, número do APT e leitura anterior. <b>Versão antiga:</b> confira a pasta publicada e recarregue preservando os dados locais.

<b>Portal vazio ou link inválido:</b> confira URL pública, projeto Supabase, publicação dos dados e existência da tabela do portal. <b>Falha ao salvar:</b> preserve o que ainda puder em BKP e interrompa novas alterações até conferir armazenamento e recuperação.

## Base deste manual

Fluxos e nomes foram conferidos em app.js, mobile.js, sync.js, offline-start.js, reading-average.js e supabase-setup.sql da entrega v5.3.47. As orientações externas foram conferidas na documentação oficial do Netlify, Supabase e GitHub em 10/11/2026; seus menus podem mudar.

Não foi realizado envio a serviços externos nem execução do SQL no projeto do usuário. A estrutura e os testes de acesso precisam ser confirmados na instalação; testes simulados do aplicativo não comprovam as políticas RLS do banco.