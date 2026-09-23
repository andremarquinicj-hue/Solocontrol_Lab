# Solocontrol Lab v0.8.0 — Base histórica consolidada + início operacional em 28/09/2026

Esta é a versão consolidada para colocar a Villa Arauco em operação diária no Solocontrol Lab a partir de **28/09/2026**.

A v0.8.0 contém todas as funções anteriores e incorpora a planilha final enviada em 23/09/2026:

`344-QUA-For-002-R00-CONTROLE DE CPs RUPTURAS(1).xlsx`

## Objetivo da versão

Separar claramente dois períodos:

- **Histórico anterior a 28/09/2026**: permanece integralmente rastreável, mas não gera tarefas, atrasos ou pendências operacionais retroativas.
- **Operação a partir de 28/09/2026**: fichas novas passam a alimentar agenda, delegação, alertas, rompimentos, tanque, relatórios e indicadores em tempo real.

Nenhum resultado ausente na fonte histórica é inventado. Quando a planilha não possui determinado resultado, o sistema mostra **“sem dado na fonte / histórico encerrado”** e preserva a ausência como parte da rastreabilidade.

## Base final de rupturas incorporada

O pacote contém:

`public/data/villa-arauco-rupturas-final-2026-09-23.json`

Resumo da planilha recebida:

- 2 abas;
- 1.323 linhas reconhecidas;
- período informado na fonte: 03/02/2026 a 17/06/2026;
- MPa de projeto;
- resultados de 7 dias;
- resultados de 28 dias;
- informações de 63 dias;
- AP/RP;
- observações;
- menções a descarte de CPs de 63 dias;
- ocorrências históricas/NC descritas na própria fonte.

SHA-256 da planilha utilizada:

`0a4dd8bc4acb0fc61ca7230c1353f50d7bd45db76605c5cb718d66572410489f`

## Migração automática da base histórica

Na primeira abertura interna após o deploy, o sistema executa uma migração única e idempotente:

1. carrega os registros históricos existentes da Villa Arauco no Firebase;
2. cruza a base final de rupturas com as fichas existentes quando há vínculo seguro;
3. atualiza MPa de projeto, resultados e observações encontrados na fonte;
4. preserva todas as 1.323 linhas da planilha no Arquivo Histórico de Rupturas;
5. registros que não podem ser vinculados com segurança a Quadra/Lote ficam arquivados sem vínculo espacial — não são descartados nem inventados;
6. todas as fichas anteriores a 28/09/2026 são retiradas da fila operacional;
7. salva um marcador de migração para não repetir a operação em cada acesso.

## “Sem pendência” significa operação limpa, não dados inventados

O histórico anterior pode conter:

- idade sem resultado na fonte;
- observação de NC antiga;
- “sem controle” na planilha antiga;
- CP de 63 dias descartado;
- CP de 63 dias já rompido.

Essas informações continuam registradas e consultáveis. Porém, não aparecem como tarefa ativa a partir do corte operacional.

Uma ruptura antiga sem resultado passa a aparecer como:

`Histórico encerrado — resultado não disponível na fonte consolidada`

Ela não aparece como “atrasada” e não cria atividade para a equipe.

## Data de início da operação diária

A Villa Arauco recebe:

`Início da operação diária no sistema: 28/09/2026`

A partir dessa data, o fluxo normal passa a valer integralmente:

- coleta/amostragem;
- ficha física;
- lançamento digital;
- slump;
- identificação da utilização do concreto;
- CPs individualizados;
- programação de 12 h / 19 h / 24 h / 7 d / 28 d / 63 d conforme processo;
- delegação;
- fotos;
- cargas;
- resultados em MPa;
- análise técnica;
- tanque;
- descarte rastreado;
- relatório diário;
- mapa;
- Portal do Cliente.

## Coleta em um dia e digitação depois

A ficha possui campos separados para:

- **Data da coleta / amostragem**;
- Horário da coleta;
- Data/hora da moldagem;
- Data/hora de criação do registro no sistema.

Exemplo:

- concretagem e coleta no sábado: 26/09;
- ficha digitada na segunda: 28/09.

O sistema usa **26/09** como data da atividade da obra e preserva **28/09** como data de lançamento/auditoria.

## Histórico de rupturas completo

Em `Importar / Exportar` existe uma tabela pesquisável com todas as linhas da fonte final.

Pode-se pesquisar por:

- identificação;
- data;
- concreteira;
- NF;
- AP/RP;
- observação.

Assim, mesmo uma linha que não possua vínculo seguro com Quadra/Lote continua disponível no sistema.

## Dashboard e Central do Coordenador

Registros históricos arquivados deixam de entrar em:

- sino de alertas;
- agenda de rompimentos;
- atrasados;
- Central do Coordenador;
- carga de equipe;
- Gestão do Tanque;
- pendências executivas.

Os indicadores de volume, progresso e rastreabilidade histórica continuam utilizando a base anterior.

## Dossiê Técnico do Lote

O mapa continua permitindo abrir um dossiê completo por Quadra/Lote:

- resumo;
- concretagens;
- cargas e rompimentos;
- evolução da cura;
- análise técnica.

Para o histórico consolidado, resultados ausentes aparecem como **“sem dado na fonte”**, nunca como pendência operacional.

## PDF / WhatsApp

O relatório técnico do lote pode ser:

- gerado em PDF;
- baixado;
- compartilhado pelo menu nativo em dispositivos compatíveis;
- encaminhado pelo WhatsApp/WhatsApp Web.

O PDF inclui rastreabilidade, resultados, gráfico de evolução e análise de apoio.

## Portal do Cliente

A versão externa mantém:

- Dashboard profissional;
- progresso da obra;
- volume;
- ensaios;
- mapa;
- relatório técnico por lote;
- gráfico da cura;
- PDF de acompanhamento.

Dados internos como gestão do tanque, descarte, auditoria e decisões operacionais permanecem restritos à Solocontrol.

## Parâmetros técnicos da Villa Arauco

A planilha final informa **25 MPa** como referência de projeto nas linhas reconhecidas, portanto o sistema pode utilizar 25 MPa como referência histórica/padrão inicial da obra.

Os critérios específicos de baixa idade/liberação de formas e a regra de avaliação do par de CPs devem continuar configurados conforme os documentos oficiais da obra e não são inferidos pela planilha.

## Firebase e segurança

Durante esta etapa de validação, mantenha as regras atuais do piloto.

Não publique ainda:

- `firestore.production.rules`
- `storage.production.rules`

até que os usuários nominais/perfis tenham sido validados.

## Validação local do código

Foi executada uma checagem interna de tipos com stubs das dependências externas e uma transpilação sintática de todos os arquivos TypeScript/TSX.

Resultado da transpilação:

- 44 arquivos TS/TSX;
- 0 erros de sintaxe.

O `npm install` local não concluiu dentro do limite do ambiente, portanto o build completo com as dependências reais Next/Firebase/jsPDF deve ser confirmado pelo Vercel no deploy.
