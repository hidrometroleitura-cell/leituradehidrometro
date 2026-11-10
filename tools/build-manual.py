from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import json

OUT=Path(__file__).resolve().parents[1]/'outputs'
OUT.mkdir(exist_ok=True)
PDF=OUT/'MANUAL-ILUSTRADO-KR2MELO-v5.3.47.pdf'
for name,file in [('Body','arial.ttf'),('Bold','arialbd.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(Path('C:/Windows/Fonts')/file)))
W,H=595.28,841.89
BLACK=colors.HexColor('#161b25'); GRAY=colors.HexColor('#52606f'); RED=colors.HexColor('#c63128'); BLUE=colors.HexColor('#236587'); LIGHT=colors.HexColor('#eef3f6')
c=canvas.Canvas(str(PDF),pagesize=(W,H));c.setTitle('Manual ilustrado KR2MELO uso integrado e atualização');c.setAuthor('KR2MELO')
body=ParagraphStyle('body',fontName='Body',fontSize=10.4,leading=15,textColor=BLACK,spaceAfter=7)
small=ParagraphStyle('small',parent=body,fontSize=8.6,leading=12,textColor=GRAY)
head=ParagraphStyle('head',parent=body,fontName='Bold',fontSize=13.5,leading=18)
y=0; pages=[]; current=None

def para(text,style=body,gap=6):
    global y
    p=Paragraph(text,style);_,h=p.wrap(W-88,H)
    if y-h<62: raise ValueError(f'Página {len(pages)} ultrapassou limite: {text[:60]}')
    p.drawOn(c,44,y-h);y-=h+gap

def begin(title,subtitle):
    global y,current
    if pages: footer();c.showPage()
    current={'title':title,'subtitle':subtitle,'text':[]};pages.append(current)
    c.setFillColor(RED);c.setFont('Bold',9);c.drawString(44,H-40,'KR2MELO  /  MANUAL OPERACIONAL  /  v5.3.47')
    y=H-67
    para(title,ParagraphStyle('title',parent=body,fontName='Bold',fontSize=23,leading=28),9)
    para(subtitle,small,12)

def footer():
    c.setFillColor(GRAY);c.setFont('Body',8)
    c.drawString(44,32,'10/11/2026  •  Ilustrações esquemáticas com dados fictícios')
    c.drawRightString(W-44,32,f'{len(pages):02d}')

def text(t):
    current['text'].append(t);para(t)

def section(t):
    current['text'].append('## '+t);para(t,head,7)

def steps(items):
    for i,t in enumerate(items,1):text(f'<b>{i}.</b> {t}')

def box(x,top,w,h,title,detail,fill=LIGHT):
    c.setFillColor(fill);c.setStrokeColor(colors.HexColor('#c9d3dc'));c.roundRect(x,top-h,w,h,7,fill=1,stroke=1)
    p=Paragraph(title,ParagraphStyle('bt',parent=body,fontName='Bold',fontSize=10,leading=13));_,hh=p.wrap(w-20,h);p.drawOn(c,x+10,top-10-hh)
    p=Paragraph(detail,small);_,hh=p.wrap(w-20,h);p.drawOn(c,x+10,top-h+9)

def arrow(x1,y1,x2,y2,label=''):
    c.setStrokeColor(BLUE);c.setFillColor(BLUE);c.setLineWidth(1.4);c.line(x1,y1,x2,y2)
    import math
    a=math.atan2(y2-y1,x2-x1); size=6
    p=c.beginPath();p.moveTo(x2,y2);p.lineTo(x2-size*math.cos(a-.5),y2-size*math.sin(a-.5));p.lineTo(x2-size*math.cos(a+.5),y2-size*math.sin(a+.5));p.close();c.drawPath(p,fill=1,stroke=0)
    if label:c.setFont('Body',8);c.drawCentredString((x1+x2)/2,(y1+y2)/2+7,label)

def map_diagram():
    global y
    top=y
    box(44,top,150,65,'COMPUTADOR','Painel e fechamento')
    box(220,top,150,65,'SUPABASE','Cópia sincronizada')
    box(400,top,150,65,'CELULAR','Leitura in loco')
    arrow(194,top-31,220,top-31);arrow(400,top-45,370,top-45)
    box(44,top-110,150,62,'GITHUB','Histórico do código')
    box(220,top-110,150,62,'NETLIFY','Publicação das telas')
    box(400,top-110,150,62,'SÍNDICO','Portal de consulta')
    arrow(194,top-140,220,top-140);arrow(370,top-140,400,top-140)
    arrow(295,top-65,475,top-110,'dados da consulta')
    y=top-190
    para('Setas mostram os caminhos principais. A sincronização é de ida e volta entre painel e celular; GitHub publica no Netlify apenas quando essa integração está configurada.',small)

def screen(title,rows,caption):
    global y
    top=y; height=45+len(rows)*33
    c.setStrokeColor(colors.HexColor('#c9d3dc'));c.setFillColor(colors.white);c.roundRect(54,top-height,W-108,height,8,fill=1,stroke=1)
    c.setFillColor(BLACK);c.roundRect(54,top-32,W-108,32,8,fill=1,stroke=0)
    c.setFillColor(colors.white);c.setFont('Bold',11);c.drawString(68,top-21,title)
    for i,row in enumerate(rows):
        yy=top-52-i*33
        c.setFillColor(RED);c.circle(73,yy+2,9,fill=1,stroke=0);c.setFillColor(colors.white);c.setFont('Bold',9);c.drawCentredString(73,yy-1,str(i+1))
        p=Paragraph(row,ParagraphStyle('row',parent=body,fontSize=9.4,leading=12));_,hh=p.wrap(W-160,30);p.drawOn(c,91,yy+8-hh)
    y=top-height-9;para(caption,small,10)

def path_diagram(labels):
    global y
    top=y; width=(W-88-18*(len(labels)-1))/len(labels)
    for i,(title,detail) in enumerate(labels):
        x=44+i*(width+18);box(x,top,width,65,title,detail)
        if i<len(labels)-1:arrow(x+width,top-32,x+width+18,top-32)
    y=top-83

begin('Usar os sistemas juntos','Um roteiro do cadastro à consulta do síndico e da versão antiga à versão atualizada.')
text('O painel organiza o condomínio, o celular registra as leituras e o portal apresenta a consulta. Netlify hospeda as telas; Supabase guarda a cópia sincronizada; GitHub organiza o código. O BKP é a cópia que você guarda para restaurar o trabalho.')
map_diagram()
section('A regra para trabalhar em equipe')
text('Antes de sair, confirme prédio e competência no computador e no celular. Depois da coleta, confira o recebimento de cada leitura no painel antes de fechar o mês. Atualizar os arquivos do site não transfere automaticamente os dados salvos em um aparelho.')
section('Encontre a tarefa')
text('Preparação e arquivos: página 2. Rotina com nuvem: 3. Leitura e médias: 4. Trabalho sem internet: 5. Fechamento e portal: 6. Ordem da atualização: 7. Executável: 8. Netlify: 9. Supabase: 10. GitHub: 11. Conferência e problemas: 12.')
text('<b>Sobre as figuras:</b> os desenhos reproduzem os nomes dos controles verificados no código da v5.3.47. São esquemas para orientação, não capturas de uma conta ou instalação real.')

begin('Preparar arquivos e acessos','Separe o programa, os dados e os serviços antes da primeira leitura.')
screen('PASTA DE ENTREGAS',[
'<b>KR2MELO v5.3.47 Completo.zip</b> — sistema e executável',
'<b>Netlify</b> — painel web, mobile e portal do síndico',
'<b>Supabase</b> — esquema SQL e instruções do banco',
'<b>GitHub</b> — código, testes e histórico de alterações'], 'O ZIP de entregas contém um ZIP completo e três pastas independentes.')
steps([
'Guarde o BKP atual fora da pasta que será substituída. Anote prédio, competência, quantidade de APTs e endereço do site em uso.',
'Extraia o pacote inteiro. No computador, abra o executável da nova versão e selecione o BKP completo quando o iniciador solicitar.',
'Para usar o celular fora do computador, utilize o endereço publicado no Netlify seguido de /mobile.html. Um endereço 127.0.0.1 pertence apenas ao computador onde o servidor está rodando.',
'Na tela <b>Sincronização entre dispositivos</b>, confira URL do projeto e chave pública anon/publishable; use a mesma conta de operação nos dois aparelhos. No celular, entre pelo painel web antes de abrir a Leitura in loco.',
'No Supabase, execute o SQL do portal indicado para a v5.3.47. Se a sincronização já existe, preserve sua tabela; veja a ordem e as verificações na página 10.'
])
text('<b>Computador e site são origens diferentes:</b> o navegador mantém dados separados por endereço e porta. Uma nova porta local ou outro domínio pode abrir sem os dados anteriores. Restaure o BKP ou receba a cópia correta da nuvem.')

begin('Executar a rotina com nuvem','Um aparelho envia a base; o outro confirma o recebimento antes de começar.')
screen('SINCRONIZAÇÃO NO PAINEL',[
'Confira <b>URL do projeto</b>, conta e conexão',
'Computador com dados conferidos: <b>Enviar para nuvem</b>',
'Celular da mesma conta: <b>Baixar da nuvem</b>',
'Após coletar: celular <b>Enviar nuvem</b> e painel <b>Baixar da nuvem</b>'], 'O primeiro envio deve partir do aparelho que contém a base correta e mais recente.')
steps([
'No computador, confira os cadastros, as leituras anteriores e o mês aberto. Gere o BKP e envie a base para a nuvem.',
'No celular, receba os dados e compare prédio, competência e APTs. Se houver leituras locais pendentes, preserve um BKP e resolva a transferência antes de substituir a base.',
'Abra <b>Leitura in loco</b>, selecione o prédio e registre cada APT. Use <b>Salvar e próximo</b> após conferir o valor.',
'Ao terminar, abra <b>Backup, código e nuvem</b> e use <b>Enviar nuvem</b>. Aguarde a fila; conexão com a internet, sozinha, não comprova recebimento.',
'No painel, receba a nuvem e confira os números dos APTs, as leituras e os conflitos na ponte de dados. No mesmo navegador e origem, use também <b>Atualizar dados in loco</b>.',
'Gere um novo BKP após a conferência. Só então continue para fechamento e boletos.'
])
text('<b>Se aparecer conflito:</b> compare competência, leitura anterior, leitura atual e horário dos registros. Preserve um BKP dos dois lados antes de escolher o valor correto.')

begin('Registrar leituras e aplicar médias','A opção de período e o lote usam o histórico de cada apartamento separadamente.')
screen('LEITURA IN LOCO  ·  APT 1',[
'Anterior <b>100</b>  |  Leitura atual <b>digitar e conferir</b>',
'<b>Período da média de consumo</b> → últimos 2 meses ou todo o histórico',
'<b>Aplicar média neste APT</b> → conferir a prévia',
'<b>Aplicar média em todos os APTs pendentes</b> → conferir cada resultado'], 'O lote respeita o prédio selecionado e percorre todos os APTs, mesmo com filtro ou pesquisa ativa.')
steps([
'Sempre que for possível, registre a leitura real. Use estimativa quando a situação justificar e confira o motivo e a observação do APT.',
'Escolha <b>Últimos 2 meses com histórico</b> ou <b>Todo o histórico anterior</b>. Os dois meses são os mais recentes disponíveis com consumo válido daquele APT, não necessariamente dois meses consecutivos.',
'A primeira opção exige dois meses distintos; a segunda, pelo menos um. Revisões da mesma competência contam uma vez. O mês aberto e meses futuros ficam fora.',
'Confira o consumo médio, os meses usados, a leitura anterior e a estimada. A estimativa é somada à leitura anterior e arredondada para inteiro.',
'No lote, leituras preenchidas e rascunhos são preservados. Histórico insuficiente ou cadastro ambíguo gera indicação para conferência. Na aplicação individual, confirme antes de substituir uma leitura existente.'
])
text('<b>Exemplo:</b> APT 1: anterior 100, consumos 10 e 20 → média 15 → estimada 115. APT 2: anterior 200, consumos 30 e 50 → média 40 → estimada 240. O resultado do APT 1 não entra no cálculo do APT 2.')

begin('Trabalhar sem internet','Use a cópia local e transfira as leituras quando puder conferir os dois lados.')
path_diagram([('CELULAR','Salvar cada APT'),('TRANSFERÊNCIA','Código ou BKP'),('COMPUTADOR','Conferir recebimento')])
steps([
'Antes de sair, abra a Leitura in loco com internet e confira que a base correta já está no celular. O uso offline depende dos arquivos previamente carregados e do armazenamento preservado no aparelho.',
'Durante a coleta, salve cada leitura. Ao terminar, use <b>Baixar BKP</b> no celular e guarde o arquivo; fotos e filas locais merecem uma cópia antes de qualquer atualização.',
'Para o caminho por código, toque <b>Copiar código</b> no celular. No painel, em Leituras do mês, use <b>Importar código do celular</b> e confira a lista de leituras recebidas e conflitos.',
'Como alternativa, transfira o BKP móvel e use o fluxo de importação reconhecido pelo painel. Leia a prévia para distinguir transferência de leituras de restauração completa; não confirme uma substituição geral por engano.',
'Confira todos os APTs e gere um BKP atualizado do painel. Se for usar a confirmação manual de sincronização por BKP no fechamento, identifique o operador e confirme somente os dados efetivamente recebidos.',
'Quando houver internet, envie a fila móvel. Se o sistema bloquear a troca do mês por falta de confirmação, preserve a cópia e resolva o recebimento antes de importar outra competência.'
])
section('O que não comprova uma transferência')
text('Gerar um BKP ou copiar um código não significa que o outro aparelho recebeu as leituras. O recebimento só está conferido depois de comparar os valores no painel. O status de uma fila local também não substitui essa comparação.')
text('<b>Fotos:</b> não presuma que todas as imagens já foram transferidas apenas porque uma leitura foi salva. Teste uma foto na consulta de destino e preserve a cópia do aparelho de origem.')

begin('Fechar o mês e abrir o portal','Primeiro os dados conferidos, depois o histórico e a consulta externa.')
screen('PAINEL  ·  CONFERÊNCIA FINAL',[
'Leituras do mês: confira <b>pendentes e conflitos</b>',
'Fechamento mensal: revise valores, datas e leituras estimadas',
'Boletos e histórico: confira a competência selecionada',
'<b>Link do Síndico</b> → Salvar URL → Abrir Visão do Síndico'], 'O link do portal consulta dados publicados; um novo deploy do site não publica automaticamente os dados do mês.')
steps([
'Confirme que o painel recebeu todas as leituras previstas. Revise consumo, tarifa, descontos e estimativas. Não contorne um bloqueio de leitura ou sincronização sem resolver sua causa.',
'No <b>Fechamento mensal</b>, confira a competência e os avisos antes de confirmar. Guarde o BKP do fechamento e confira os boletos do período correto.',
'Para o próximo ciclo, prepare o cadastro no painel e entregue a base da nova competência ao celular. Não reabra leituras antigas para representar outro mês.',
'Para o síndico, clique <b>Link do Síndico</b>. Salve o endereço público da instalação do portal: a raiz do site se publicou apenas o portal, ou /portal-sindico se ele está nessa subpasta.',
'Use <b>Abrir Visão do Síndico</b> e confira mês, APTs, valores e histórico em outro aparelho. Compartilhe o link somente depois desse teste.'
])
text('<b>Na v5.3.47:</b> execute supabase-portal-v5.3.47.sql e atualize painel e portal juntos. A publicação exige a conta do operador; a consulta valida o prédio e o token no banco, sem permitir a listagem anônima da tabela. Distribua o novo link gerado pelo painel.')

begin('Atualizar na ordem correta','Atualizar programa e transferir dados são tarefas diferentes.')
path_diagram([('ANTES','BKP e conferência'),('APLICAR','Arquivos e migrações'),('VALIDAR','Do APT ao portal')])
steps([
'Pare temporariamente a digitação nos aparelhos e anote a versão em uso. Faça BKP do painel e do celular; confirme que os arquivos foram realmente baixados.',
'Leia <b>ATUALIZAR-ESTA-VERSAO.md</b>. Ele deve dizer quais arquivos mudaram, se há SQL obrigatório, a ordem de aplicação e o teste esperado.',
'Na <b>v5.3.47, execute primeiro o SQL do portal</b>, depois atualize painel e portal. O script novo preserva kr2melo_sync_state; não reaplique o esquema da sincronização por rotina.',
'Atualize o computador e o site. Se o Netlify está conectado ao GitHub, atualizar o ramo publicado pode disparar o deploy; trate os dois como o mesmo caminho de publicação.',
'Abra a versão nova, restaure o BKP quando solicitado e confira os dados antes de qualquer envio para a nuvem. O primeiro envio deve partir da base já validada.',
'Atualize o celular pelo mesmo endereço, teste o recebimento de um APT e confira o portal. Baixe o BKP final e registre a versão aprovada.'
])
section('O que acompanhará as próximas versões')
text('O ZIP completo, as pastas Netlify, Supabase e GitHub, este manual revisado quando o fluxo mudar e um roteiro específico da versão. Cada roteiro deverá dizer o que atualizar, o que preservar, como confirmar o resultado e como retornar à versão anterior.')
text('<b>Não crie outro site nem outro banco para uma atualização comum.</b> Manter os mesmos endereços e o mesmo projeto evita separar os dados e quebrar links já distribuídos.')

begin('Atualizar o executável do computador','Use o ZIP completo e mantenha a versão anterior disponível até concluir a conferência.')
screen('ATUALIZAÇÃO LOCAL',[
'Versão anterior → <b>Baixar BKP</b> → conferir o arquivo',
'ZIP completo → <b>Extrair tudo em nova pasta</b>',
'<b>KR2MELO v5.3.47 Offline.exe</b> → selecionar BKP',
'Conferir versão, prédio, mês, APTs, histórico e totais'], 'O nome real do arquivo contém hífens: KR2MELO-v5.3.47-Offline.exe.')
steps([
'Na versão atual, salve o trabalho e baixe um BKP completo. Guarde-o fora das pastas do programa e preserve a pasta anterior.',
'Feche as janelas do painel antigo. Extraia o <b>ZIP completo</b> da nova entrega em uma pasta nova; não execute diretamente de dentro do ZIP.',
'Abra <b>KR2MELO-v5.3.47-Offline.exe</b>. Mantenha app.js, mobile.js, assets e os demais arquivos ao lado do executável, na estrutura extraída.',
'O iniciador pode solicitar o BKP para iniciar uma sessão limpa. Selecione o arquivo conferido, revise a prévia e prossiga.',
'Confira v5.3.47 na tela, prédio, competência aberta, número de APTs, leituras anteriores, histórico e totais. Abra a Leitura in loco e confira o seletor de período da média.',
'Depois de validar, sincronize a base correta e baixe outro BKP. Em uma nova abertura do iniciador, tenha esse arquivo atualizado disponível.'
])
section('Se precisar voltar')
text('Feche a versão nova, abra a pasta anterior e use o BKP feito antes da atualização. Se já registrou trabalho novo, exporte-o antes e concilie as diferenças; restaurar uma cópia antiga pode deixar de fora as leituras recentes. Não envie uma base antiga para a nuvem sem comparar.')

begin('Atualizar o site no Netlify','Mantenha o mesmo projeto e a mesma URL para preservar os acessos.')
screen('NETLIFY  ·  ESQUEMA DE PUBLICAÇÃO',[
'Abra <b>o projeto já existente</b>',
'Entre em <b>Deploys</b> e localize a área de envio',
'Envie a pasta <b>Netlify</b> com index.html na raiz',
'Aguarde o deploy e teste painel, mobile e consulta'], 'Se o site já usa GitHub como origem, siga a página 11 e acompanhe o deploy automático.')
steps([
'Identifique o projeto e anote sua URL. Abra sua área <b>Deploys</b>. Não use a criação de outro projeto para atualizar o site existente.',
'Para envio manual, arraste a pasta Netlify da entrega para a área de publicação do projeto. Neste pacote estático, index.html fica na raiz e não há compilação do aplicativo.',
'Se sua publicação é apenas do portal, mantenha esse formato: publique a subpasta portal-sindico no projeto do portal. Não troque uma instalação só do portal pelo painel completo sem planejar a URL.',
'Espere a publicação terminar. Abra o endereço habitual e confira a versão no painel e no mobile; no computador use Ctrl+F5 se necessário.',
'No celular, feche e reabra a página ou o atalho instalado. Preserve BKP e fila antes de limpar dados de navegação, pois a coleta local pode ser apagada.',
'Teste a consulta do síndico com um link real validado. Para retorno, preserve o trabalho novo e republique a pasta da versão anterior no mesmo projeto.'
])
text('<b>Netlify guarda os arquivos do site.</b> As leituras ficam na origem local e na sincronização; atualizar HTML e JavaScript não restaura os dados do navegador nem substitui um BKP.')
text('Referência: docs.netlify.com/deploy/create-deploys/ — atualização manual de site existente e integração com Git.',)

begin('Atualizar o Supabase','Na v5.3.47, crie a tabela e a função de consulta do portal antes de atualizar as telas.')
screen('SUPABASE  ·  DECISÃO DA ATUALIZAÇÃO',[
'SQL desta versão: <b>supabase-portal-v5.3.47.sql</b>',
'Preservar a sincronização: <b>kr2melo_sync_state</b>',
'Criar portal: <b>kr2melo_sindico_views</b> e função de consulta',
'Preserve projeto e contas; valide leitura e escrita permitidas'], 'A pasta Supabase contém SQL de estrutura, não uma cópia dos registros nem do cadastro de usuários.')
steps([
'Abra o projeto Supabase já usado pelo sistema. Confirme que é o mesmo projeto configurado no computador, no celular e no portal.',
'Abra SQL Editor e execute supabase-portal-v5.3.47.sql por inteiro. No cenário diagnosticado, a sincronização existe e o portal está ausente; o script preserva a tabela de sincronização.',
'Confira as duas tabelas com RLS=true e os privilégios do visitante: anon_pode_listar=false e anon_pode_consultar_com_token=true. Em uma instalação totalmente nova, supabase-setup.sql prepara primeiro a sincronização.',
'Se ocorrer erro, envie a mensagem e interrompa a configuração. O SQL usa transação e não apaga tabelas. Se executou só parte e a transação ficou em erro, use ROLLBACK antes de repetir o arquivo completo.',
'Atualize painel e portal para 5.3.47, entre na conta e gere Link do Síndico. O painel publica o registro com o proprietário correto; não é necessário preencher a tabela manualmente.',
'Teste o link em outro aparelho. Depois, altere um caractere do token em uma cópia: a consulta deve falhar. Não libere SELECT anônimo nem use service_role no site. Links curtos antigos serão substituídos ao gerar um novo link.'
])
text('<b>Retorno:</b> uma mudança no banco não é desfeita apenas trocando os arquivos do site. Para migrações futuras, siga o plano de retorno específico antes de executar qualquer reversão.')
text('Referências: supabase.com/docs/guides/database/overview e supabase.com/docs/guides/deployment/database-migrations.',)

begin('Atualizar o GitHub','O repositório guarda o código e pode ser a origem do deploy do Netlify.')
screen('GITHUB  ·  ESQUEMA DO ENVIO',[
'Abra o repositório certo e confira <b>o ramo usado no deploy</b>',
'<b>Add file → Upload files</b> ou atualização pela cópia Git local',
'Envie o <b>conteúdo</b> da pasta GitHub, preservando os caminhos',
'Revise mudanças → registre a versão → acompanhe o deploy'], 'Enviar um ZIP para o repositório apenas armazena o ZIP; ele não substitui os arquivos de execução do site.')
steps([
'Abra o repositório existente e confirme o ramo de publicação. Guarde a referência da versão anterior para poder localizar seu código.',
'Copie o conteúdo da pasta GitHub para os mesmos caminhos do repositório. Pelo navegador, use <b>Add file → Upload files</b>; em atualização com Git, revise a lista de mudanças antes do commit.',
'Mantenha index.html, mobile.html e netlify.toml na raiz se esse é o formato da publicação. Não crie uma subpasta GitHub dentro da raiz existente sem ajustar a configuração.',
'Confira também arquivos removidos: um upload de substituições não elimina automaticamente arquivos antigos. Preserve .gitignore, AGENTS.md, tests e tools.',
'Não envie BKPs, cobranças particulares, senhas ou tokens. Registre a alteração com uma descrição clara da versão; se o ramo exige revisão, siga o fluxo de pull request.',
'Se o Netlify acompanha esse ramo, aguarde o deploy correspondente e faça o teste da página 9. Sem integração configurada, o commit sozinho não atualiza o site.'
])
text('<b>Supabase é independente:</b> guardar um arquivo .sql no GitHub não o executa no banco. Na v5.3.47, execute <b>node tests/test-reading-average.cjs</b> para verificar os 19 cenários disponíveis antes da publicação.')
text('<b>Retorno:</b> reverta as alterações de código para o estado anterior e acompanhe a nova publicação; preserve e concilie os dados recentes. Referência: docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository.',)

begin('Conferir antes de retomar o trabalho','Use este roteiro ao terminar cada atualização.')
section('Lista de aprovação')
for t in [
'BKP anterior e BKP final guardados e identificados por data e versão.',
'Versão esperada aberta no computador e no celular, pelo endereço correto.',
'Mesmo prédio, competência e quantidade de apartamentos nos dois aparelhos.',
'Leituras anteriores, histórico e totais comparados antes do primeiro envio.',
'Média individual conferida com meses explícitos e uma prévia do lote revisada.',
'Um recebimento de leitura testado no painel e link do portal testado com token correto e incorreto.',
'Portal 5.3.47 aberto em outro aparelho com prédio, competência e valores conferidos.',
'URL do Netlify, projeto Supabase e ramo do GitHub preservados ou documentados se mudaram.'
]:text('□ '+t)
section('Se algo não conferir')
text('<b>Celular não mostra as leituras:</b> compare conta, projeto, prédio e mês; receba a base correta sem descartar a fila pendente. <b>Média indisponível:</b> confira meses válidos, número do APT e leitura anterior. <b>Versão antiga:</b> confira a pasta publicada e recarregue preservando os dados locais.')
text('<b>Portal vazio ou link inválido:</b> confira URL pública, projeto Supabase, publicação dos dados e existência da tabela do portal. <b>Falha ao salvar:</b> preserve o que ainda puder em BKP e interrompa novas alterações até conferir armazenamento e recuperação.')
section('Base deste manual')
text('Fluxos e nomes foram conferidos em app.js, mobile.js, sync.js, offline-start.js, reading-average.js e supabase-setup.sql da entrega v5.3.47. As orientações externas foram conferidas na documentação oficial do Netlify, Supabase e GitHub em 10/11/2026; seus menus podem mudar.')
text('Não foi realizado envio a serviços externos nem execução do SQL no projeto do usuário. A estrutura e os testes de acesso precisam ser confirmados na instalação; testes simulados do aplicativo não comprovam as políticas RLS do banco.')

footer();c.save()
MD=OUT/'MANUAL-ILUSTRADO-KR2MELO-v5.3.47.md'
MD.write_text('\n\n'.join('# '+p['title']+'\n\n'+p['subtitle']+'\n\n'+'\n\n'.join(p['text']) for p in pages),encoding='utf-8')
print(json.dumps({'pdf':str(PDF),'pages':len(pages),'markdown':str(MD)},ensure_ascii=False))
