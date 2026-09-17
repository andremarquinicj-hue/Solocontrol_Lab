# Solocontrol Lab v0.1

Primeira versão funcional do sistema gerencial de laboratório da Solocontrol.

## O que já está nesta versão

- Dashboard gerencial com rupturas do dia, atrasados, 7/14/28 dias e fichas ativas.
- Delegação de ruptura para laboratoristas pelo dashboard.
- Lançamento rápido de ficha em 4 passos.
- Datas de ruptura calculadas automaticamente.
- Geração automática dos identificadores individuais dos CPs a partir da etiqueta base.
- Fotos obrigatórias no cadastro: ficha, coleta/amostra e etiqueta.
- Rastreabilidade da amostra em linha do tempo.
- Fotos obrigatórias na ruptura: rompimento, prensa e CP final.
- Lançamento de carga da prensa e cálculo preliminar de resistência à compressão.
- Movimentação automática do local físico da ficha conforme a próxima ruptura.
- Cadastro de obras e equipe.
- Relatório gerencial imprimível.
- Modo demonstração com localStorage quando o Firebase ainda não foi configurado.
- Integração preparada para Firestore e Firebase Storage.

## 1. Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Sem Firebase configurado o sistema funciona em **modo demonstração**, armazenando dados no navegador.

## 2. Configurar Firebase

Crie um projeto no Firebase e ative:

- Firestore Database
- Storage
- Authentication → habilite **Anonymous** para o piloto da v0.1. O sistema autentica automaticamente. Na v0.2 trocaremos isso por login nominal e perfis.

Copie `.env.example` para `.env.local` e preencha as chaves do aplicativo Web do Firebase.

```bash
cp .env.example .env.local
```

### Coleções usadas

- `samples`
- `works`
- `team`

### Regras

Arquivos incluídos:

- `firestore.rules`
- `storage.rules`

Antes de produção, as regras devem ser refinadas por perfil (Administrador, Coordenador, Laboratorista e Engenheiro/Aprovador).

## 3. GitHub

Crie um repositório, extraia os arquivos e envie:

```bash
git init
git add .
git commit -m "Solocontrol Lab v0.1"
git branch -M main
git remote add origin SEU_REPOSITORIO
git push -u origin main
```

## 4. Vercel

- Importe o repositório do GitHub no Vercel.
- Adicione as mesmas variáveis de `.env.local` em **Settings > Environment Variables**.
- Faça o deploy.

## Fluxo recomendado no laboratório

1. Laboratorista entrega a ficha preenchida ao coordenador.
2. Coordenador usa **Lançamento rápido**.
3. Anexa obrigatoriamente foto da ficha, foto da coleta/amostra e foto da etiqueta.
4. Sistema cria as rupturas automaticamente.
5. Dashboard mostra o volume diário e permite delegar.
6. Na ruptura, são obrigatórias foto do rompimento, foto da prensa e foto final do CP.
7. O resultado é lançado e a localização física da ficha muda para a próxima data.
8. Após a última ruptura, a ficha muda para `Arquivo Encerrado`.

## Observação técnica importante

A calculadora da v0.1 executa a conversão da força e a relação `força / área circular`. Ela é uma ferramenta operacional preliminar. Critérios normativos adicionais, fatores de correção, arredondamentos e regras de aceitação devem ser implementados somente após validação técnica do procedimento/norma aplicável pela Solocontrol.

## Próxima etapa recomendada (v0.2)

- Tela de login e perfis de acesso.
- Leitura real do código de barras pela câmera.
- Compressão automática de imagens antes do upload.
- Notificações de ruptura vencendo / atrasada.
- Não conformidades.
- Relatório técnico oficial no padrão Solocontrol.
- Registro de auditoria (quem alterou, valor anterior, valor novo e data/hora).
- Aprovação do engenheiro antes da emissão.
- Mais calculadoras validadas conforme cada ensaio.
