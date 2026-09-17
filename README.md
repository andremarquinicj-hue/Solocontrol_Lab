# Solocontrol Lab v0.1.3

Versão de teste do sistema gerencial de laboratório da Solocontrol.

## Atualizações desta versão

- Logo oficial da Solocontrol atualizada no menu, relatórios e ícone do sistema.
- Opção **Excluir ficha** adicionada em:
  - `Amostras / Ensaios`
  - tela de rastreabilidade da própria ficha.
- A exclusão exige confirmação antes de prosseguir.
- Ao excluir uma ficha conectada ao Firebase, o sistema tenta remover:
  - documento da coleção `samples`;
  - fotos iniciais da ficha;
  - fotos das rupturas.
- `storage.rules` atualizado para permitir exclusão de arquivos por usuário autenticado.
- Correção de tipagem da tela de ruptura mantida nesta versão.
- Fotos continuam obrigatórias no cadastro e em cada etapa de ruptura.

## Funcionalidades atuais

- Dashboard gerencial.
- Agenda automática de rupturas.
- Controle de 7, 14 e 28 dias e outras idades configuráveis.
- Delegação de ensaios para a equipe.
- Lançamento rápido em 4 etapas.
- Fotos obrigatórias:
  - ficha;
  - coleta/amostra;
  - etiqueta;
  - rompimento;
  - prensa;
  - CP final.
- Rastreabilidade por amostra.
- Localização física da ficha.
- Cadastro de obras.
- Cadastro da equipe.
- Calculadora preliminar de resistência à compressão.
- Relatório gerencial imprimível.
- Integração com Firebase Authentication, Firestore e Storage.
- Modo local para testes quando o Firebase não estiver configurado.

## Subir no GitHub

Extraia o ZIP e envie **todo o conteúdo** para a raiz do repositório.

Os principais arquivos/pastas devem ficar assim:

```text
app/
components/
lib/
public/
.env.example
.gitignore
firebase.json
firestore.rules
next.config.mjs
package.json
storage.rules
tsconfig.json
```

Não envie `.env.local` para o GitHub.

## Variáveis do Vercel

Mantenha estas variáveis em `Vercel > Settings > Environment Variables`:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

## Atenção: regras do Firebase Storage

Como esta versão permite excluir fichas e também tenta apagar as imagens vinculadas, copie o conteúdo do arquivo `storage.rules` para:

`Firebase > Storage > Regras`

e clique em **Publicar**.

O Firestore continua usando o arquivo `firestore.rules`.

## Segurança

O login anônimo está sendo usado somente no piloto. Antes do uso definitivo, o sistema deverá ter perfis nominais e permissões separadas para Administrador, Coordenador, Laboratorista e Engenheiro/Aprovador.

## Observação técnica

A calculadora atual executa conversão de força e cálculo de força/área circular para apoio operacional. A validação técnica definitiva das calculadoras, fatores de correção, arredondamentos e critérios normativos deve ser feita conforme os procedimentos e normas adotados pela Solocontrol.
