# Atualizar GitHub para 5.3.46

## Antes de começar

1. Salve as leituras em edição e interrompa temporariamente alterações nos aparelhos.
2. Baixe um BKP do painel e outro do celular. Guarde-os fora das pastas do programa.
3. Anote a versão anterior, o prédio, a competência, os APTs, a URL do Netlify, o projeto Supabase e o ramo usado no GitHub.
4. Preserve as pastas da versão anterior e resolva ou documente filas e conflitos antes de trocar a base.

## Passo a passo

1. Abra o repositório e confira o ramo de publicação.
2. Copie o conteúdo da pasta GitHub mantendo os caminhos. Não envie apenas o ZIP e não crie uma pasta GitHub adicional dentro da raiz do site.
3. Revise inclusões, substituições e exclusões, preservando os arquivos de configuração e a estrutura necessária.
4. Não envie BKPs, dados de moradores, cobranças particulares, senhas ou tokens.
5. Execute `node tests/test-reading-average.cjs` com Node.js instalado.
6. Registre a atualização e acompanhe o deploy se existir integração com Netlify. Arquivar SQL no repositório não o executa no banco.

## Aprovação

1. Em uma cópia de teste, confira a média de um APT pelos últimos dois meses e por todo o histórico.
2. Confira uma prévia do lote: cada APT deve ter seus próprios meses, anterior e estimativa; leituras preenchidas e rascunhos devem ser preservados.
3. Envie e receba uma leitura de teste pela mesma conta, confira o valor no destino e resolva conflitos antes de fechar o mês.
4. Abra o portal em outro aparelho e confira prédio, mês e valores quando sua estrutura estiver pronta.
5. Gere BKP final e só então retome a coleta real.

## Retorno

1. Preserve primeiro qualquer leitura registrada depois da atualização.
2. No computador, volte à pasta anterior e restaure a cópia correspondente; concilie leituras novas antes de enviar à nuvem.
3. No Netlify, republique os arquivos anteriores no mesmo projeto; pelo GitHub, reverta o código e acompanhe o deploy.
4. Como a mudança de médias não exige SQL novo, não há reversão de esquema associada a ela. Se houver outras mudanças no banco feitas fora desta entrega, use seu plano específico de retorno.
