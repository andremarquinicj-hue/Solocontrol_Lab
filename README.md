# Solocontrol Lab v0.8.3

Versão corretiva baseada na v0.8.0.

## Correções principais

### Progresso Paredes / Lajes consolidado

As visões gerenciais não exibem mais três cartões separados para:

- Paredes;
- Lajes;
- Paredes / Lajes (histórico).

Agora Dashboard, Portal do Cliente e Mapa trabalham com uma única etapa gerencial:

`Paredes / Lajes`

Os registros históricos `PAREDES E LAJES` e os novos registros operacionais `PAREDES` ou `LAJE` alimentam a mesma etapa de progresso.

Isso elimina duplicidade sem perder a rastreabilidade operacional. Nas fichas novas, Paredes e Lajes continuam separados internamente porque possuem parâmetros próprios de slump, MPa, liberação de forma e plano de CPs.

### Dossiê Técnico do Lote

Foram consolidados os agrupamentos no:

- Resumo;
- mapa por elemento;
- tabela-resumo do lote;
- análise técnica;
- Portal do Cliente.

A tabela detalhada de concretagens continua mostrando o processo real da ficha quando ele estiver disponível, preservando a informação técnica.

### Metas da obra

Em `Obras`, a meta gerencial agora é cadastrada como:

`Paredes / Lajes`

em vez de duas metas concorrentes.

Cadastros antigos que já tenham `PAREDES`, `LAJES` ou `PAREDES E LAJES` continuam compatíveis e são consolidados automaticamente.

## Equipe padrão cadastrada

A versão inclui os laboratoristas:

- Lucas
- Fabiano
- Ederson
- Rafael
- Eduardo
- Ismael
- Leonardo
- Bruno

Ao abrir o sistema, `listTeam()` confere a coleção `team` do Firebase. Os nomes que ainda não existirem são cadastrados automaticamente, sem duplicar colaboradores já presentes.

Todos entram inicialmente como:

`Laboratorista • Ativo`

A matriz de treinamento permanece disponível em `Equipe` para você definir as competências de cada um.

## Compatibilidade

A v0.8.3 preserva:

- os 951 registros de concretagem;
- a base histórica consolidada;
- resultados de ruptura;
- mapa;
- PDF/WhatsApp;
- Gestão do Tanque;
- operação diária a partir de 28/09/2026;
- Portal do Cliente;
- auditoria e demais módulos.

Não é necessário apagar ou reimportar o histórico para corrigir a duplicidade visual.

## Publicação

Suba somente a v0.8.3. Leia `INSTRUCOES-ATUALIZACAO-v0.8.3.md`.


## Atualização v0.8.3
- Dashboard principal redesenhado com foco executivo/diretoria.
- Hero gerencial, KPIs com destaque visual, painel executivo de progresso, evolução da produção, distribuição por elemento, resumo gerencial, agenda do dia e equipe do laboratório.
- Mantidas as rotinas existentes de amostras, agenda e pendências históricas.


## Atualização v0.8.3 — Portal do Cliente
- Portal do Cliente redesenhado conforme o layout visual aprovado.
- Menu lateral exclusivo para o cliente.
- Hero da obra com cliente, executora e atualização.
- KPIs de unidades, volume, ensaios, laudos e rastreabilidade.
- Evolução da obra, distribuição do volume e indicadores de qualidade.
- Mapa interativo com acesso ao dossiê técnico por lote.
- Últimas concretagens, galeria de evidências e central de relatórios.
- Mantida a geração/compartilhamento do relatório técnico em PDF por lote.
