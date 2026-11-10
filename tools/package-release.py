"""Create the four KR2MELO delivery targets, without publishing them."""
import argparse
import json
import re
import shutil
import zipfile
from pathlib import Path

WEB_SUFFIXES={'.html','.js','.css','.webmanifest','.csv','.xlsx'}

def copy_file(source, target):
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(source,target)

def zip_folder(folder, archive):
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for file in sorted(folder.rglob('*')):
            if file.is_file(): z.write(file,folder.name+'/'+file.relative_to(folder).as_posix())

def package(source, destination, version):
    source=source.resolve(); destination=destination.resolve()
    if destination.exists(): raise ValueError('Escolha um destino novo para preservar entregas anteriores.')
    if source==destination or source in destination.parents: raise ValueError('O destino deve ficar fora do código-fonte.')
    for name in ['index.html','mobile.html','reading-average.js','supabase-setup.sql',f'KR2MELO-v{version}-Offline.exe']:
        if not (source/name).is_file(): raise ValueError('Arquivo obrigatório ausente: '+name)
    guide_path=source/'ATUALIZAR-ESTA-VERSAO.md'
    manual_path=source/f'MANUAL-ILUSTRADO-KR2MELO-v{version}.pdf'
    if not manual_path.is_file(): manual_path=source/'docs'/f'MANUAL-ILUSTRADO-KR2MELO-v{version}.pdf'
    if not guide_path.is_file() or version not in guide_path.read_text(encoding='utf-8').splitlines()[0]:
        raise ValueError('Falta o roteiro específico desta versão: ATUALIZAR-ESTA-VERSAO.md')
    if not manual_path.is_file(): raise ValueError('Falta o manual ilustrado desta versão.')
    destination.mkdir(parents=True)
    netlify=destination/'Netlify'; supabase=destination/'Supabase'; github=destination/'GitHub'
    for folder in [netlify,supabase,github]: folder.mkdir()
    for file in source.iterdir():
        if file.is_file() and file.suffix in WEB_SUFFIXES:
            for target in [netlify,github]: copy_file(file,target/file.name)
    for name in ['assets','portal-sindico']:
        for file in (source/name).rglob('*'):
            if file.is_file() and file.suffix.lower() in WEB_SUFFIXES|{'.png','.jpg','.jpeg','.webp','.svg','.ico','.txt'}:
                for target in [netlify,github]: copy_file(file,target/file.relative_to(source))
    for file in source.glob('*.md'): copy_file(file,github/file.name)
    for name in ['tests','tools']:
        if (source/name).is_dir(): shutil.copytree(source/name,github/name)
    copy_file(manual_path,github/'docs'/manual_path.name)
    copy_file(source/'ServidorIniciador.cs',github/'ServidorIniciador.cs')
    for sql in source.glob('supabase*.sql'):
        copy_file(sql,supabase/sql.name)
        copy_file(sql,github/'supabase'/sql.name)
    (github/'.gitignore').write_text('''# Arquivos locais e dados privados
*.exe
*.zip
*.7z
*.rar
*.pdf
*.json
*.env
.env*
!.env.example
node_modules/
__pycache__/
outputs/
backups/
BKP*/
''',encoding='utf-8')
    with (github/'.gitignore').open('a',encoding='utf-8') as f: f.write(f'!docs/MANUAL-ILUSTRADO-KR2MELO-v{version}.pdf\n')
    (netlify/'netlify.toml').write_text('''[build]
  publish = "."
''',encoding='utf-8')
    copy_file(netlify/'netlify.toml',github/'netlify.toml')
    (netlify/'LEIA-PUBLICACAO.md').write_text(f'''# Netlify — KR2MELO {version}

Esta pasta contém a versão web do painel, da Leitura in loco e do portal do síndico. O arquivo index.html está na raiz; não há etapa de compilação.

Para publicação manual, selecione esta pasta inteira. Para usar a cópia GitHub, use o conteúdo daquela pasta como origem e o netlify.toml incluído. Nenhuma publicação foi executada nesta entrega.

Endereços relativos: painel `index.html`, Leitura in loco `mobile.html`, consulta `consulta.html`, portal `portal-sindico/index.html`.

Se desejar publicar apenas o portal, a subpasta portal-sindico também contém seu próprio index.html e dependências.

O painel mantém o fluxo existente de início por BKP. Supabase continua sendo configurado pelo sistema com URL do projeto e chave pública; sessões não são incluídas neste pacote. A estrutura do banco está na entrega Supabase.
''',encoding='utf-8')
    (supabase/'LEIA-PRIMEIRO.md').write_text(f'''# Supabase — KR2MELO {version}

Esta é a entrega do backend. O site e o executável estão nos outros pacotes.

O arquivo supabase-setup.sql é o esquema já utilizado pelo projeto: tabela public.kr2melo_sync_state, payload JSONB, vínculo com auth.users e políticas RLS por usuário autenticado.

Leia PASSO-A-PASSO-ATUALIZACAO.md antes de executar SQL. O roteiro da versão informa qual arquivo aplicar e a ordem. supabase-setup.sql prepara a sincronização em instalações novas; arquivos adicionais preparam ou migram os módulos indicados. Em projetos existentes, preserve os registros e siga somente as etapas da versão.

Configure a sincronização no próprio sistema com a URL do projeto, a chave pública anon/publishable e a conta do usuário. Chaves service_role, senhas e tokens de sessão não fazem parte desta entrega.

Nenhum SQL foi executado remotamente. Este pacote não inclui cópia dos dados do banco.
''',encoding='utf-8')
    (github/'README.md').write_text(f'''# KR2MELO {version}

Código-fonte do painel, Leitura in loco, consulta e portal do síndico. A atualização está descrita em ATUALIZAR-ESTA-VERSAO.md. O padrão permanente de entrega está em AGENTS.md.

## Estrutura

- index.html / app.js: painel.
- mobile.html / mobile.js: Leitura in loco.
- reading-average.js: histórico e médias por apartamento.
- portal-sindico/: portal independente.
- supabase/supabase-setup.sql: esquema do backend.
- ServidorIniciador.cs: iniciador local para Windows.
- tests/: testes automatizados com dados fictícios.
- tools/package-release.py: gera o ZIP completo e as pastas Netlify, Supabase e GitHub.

## Validar

Com Node.js instalado, execute `node tests/test-reading-average.cjs`.

## Executável

Compile ServidorIniciador.cs com o compilador C# do .NET Framework, referenciando System.Windows.Forms.dll e usando target:winexe. O nome de saída deve ser KR2MELO-v{version}-Offline.exe, na raiz do projeto. A versão compilada já está disponível no ZIP completo.

## Gerar entregas

Com Python instalado e o executável compilado na raiz, execute:

`python tools/package-release.py --source . --version {version} --destination ../KR2MELO-v{version}-Entregas`

O destino deve ser novo e ficar fora da pasta do código. A ferramenta também cria um ZIP para transportar as entregas preservando as pastas separadas.

## Publicação

O netlify.toml aponta para a raiz estática, sem compilação. Para Supabase, use o SQL da subpasta supabase. A configuração pública existente de conexão é mantida em sync.js. Não publique BKPs, cobranças de moradores, senhas ou tokens.

Nenhum envio a GitHub, Netlify ou Supabase foi realizado pelo empacotador.
''',encoding='utf-8')
    complete=destination/f'KR2MELO-v{version}-Completo.zip'
    guide=guide_path.read_text(encoding='utf-8')
    def guide_part(title):
        marker='## '+title+'\n'
        if marker not in guide: raise ValueError('Seção obrigatória ausente no roteiro: '+title)
        return guide.split(marker,1)[1].split('\n## ',1)[0].strip()
    for folder,title in [(netlify,'Netlify e celular'),(supabase,'Supabase'),(github,'GitHub')]:
        content=f'# Atualizar {title} para {version}\n\n## Antes de começar\n\n'+guide_part('Antes de começar')+'\n\n## Passo a passo\n\n'+guide_part(title)+'\n\n## Aprovação\n\n'+guide_part('Aprovação da atualização')+'\n\n## Retorno\n\n'+guide_part('Retorno se necessário')+'\n'
        (folder/'PASSO-A-PASSO-ATUALIZACAO.md').write_text(content,encoding='utf-8')
    copy_file(manual_path,destination/manual_path.name)
    copy_file(guide_path,destination/guide_path.name)
    zip_folder(source,complete)
    (destination/'LEIA-PRIMEIRO.md').write_text(f'''# Entregas KR2MELO {version}

1. KR2MELO-v{version}-Completo.zip: sistema completo com executável. Extraia tudo antes de abrir o EXE.
2. Netlify/: arquivos estáticos para publicação web.
3. Supabase/: SQL e orientações do backend.
4. GitHub/: código-fonte, testes e empacotador.

As três pastas são independentes e estão identificadas. Nenhuma publicação ou alteração remota foi executada. O código de funcionamento é o da v{version}; esta organização não altera os cálculos.

Comece por ATUALIZAR-ESTA-VERSAO.md. O manual ilustrado está na raiz desta entrega e no ZIP completo. Cada pasta tem PASSO-A-PASSO-ATUALIZACAO.md com suas etapas específicas, testes e retorno.
''',encoding='utf-8')
    # Validate internal static entry-point dependencies before distributing.
    for folder in [netlify,github]:
        assert not list(folder.rglob('*.exe'))
        assert all(file == github/'docs'/manual_path.name for file in folder.rglob('*.pdf'))
        for html in folder.rglob('*.html'):
            for ref in re.findall(r'(?:src|href)=["\']([^"\']+)["\']',html.read_text(encoding='utf-8')):
                if ref.startswith(('http:', 'https:', '#', 'data:', 'mailto:', 'tel:')): continue
                clean=ref.split('?')[0].split('#')[0]
                if clean: assert (html.parent/clean).exists(), f'Dependência ausente: {html}: {clean}'
    assert 'enable row level security' in (supabase/'supabase-setup.sql').read_text(encoding='utf-8')
    bundle=destination.parent/(destination.name+'.zip')
    zip_folder(destination,bundle)
    print(json.dumps({'directory':str(destination),'complete_zip':str(complete),'bundle_zip':str(bundle),'checks':'Dependências HTML, ausência de EXE/PDF em publicação e presença de RLS verificadas.'},ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--destination',type=Path,required=True)
    parser.add_argument('--version',required=True)
    args=parser.parse_args()
    package(args.source,args.destination,args.version)
