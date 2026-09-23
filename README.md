# Solocontrol Lab v0.8.1

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

A v0.8.1 preserva:

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

Suba somente a v0.8.1. Leia `INSTRUCOES-ATUALIZACAO-v0.8.1.md`.
