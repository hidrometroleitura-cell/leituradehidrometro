# KR2MELO 5.3.46

Código-fonte do painel, Leitura in loco, consulta e portal do síndico. A atualização está descrita em ATUALIZACAO-5.3.46.md. O padrão permanente de entrega está em AGENTS.md.

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

Compile ServidorIniciador.cs com o compilador C# do .NET Framework, referenciando System.Windows.Forms.dll e usando target:winexe. O nome de saída deve ser KR2MELO-v5.3.46-Offline.exe, na raiz do projeto. A versão compilada já está disponível no ZIP completo.

## Gerar entregas

Com Python instalado e o executável compilado na raiz, execute:

`python tools/package-release.py --source . --version 5.3.46 --destination ../KR2MELO-v5.3.46-Entregas`

O destino deve ser novo e ficar fora da pasta do código. A ferramenta também cria um ZIP para transportar as entregas preservando as pastas separadas.

## Publicação

O netlify.toml aponta para a raiz estática, sem compilação. Para Supabase, use o SQL da subpasta supabase. A configuração pública existente de conexão é mantida em sync.js. Não publique BKPs, cobranças de moradores, senhas ou tokens.

Nenhum envio a GitHub, Netlify ou Supabase foi realizado pelo empacotador.
