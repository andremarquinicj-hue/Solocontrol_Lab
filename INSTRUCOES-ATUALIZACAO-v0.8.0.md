# PASSO A PASSO — SOLOCONTROL LAB v0.8.0

## 1. Qual versão subir

Suba **somente a v0.8.0**.

Ela substitui as versões anteriores e já contém a base histórica final enviada em 23/09/2026.

## 2. Atualizar o GitHub

1. Baixe `solocontrol-lab-v0.8.0.zip`.
2. Extraia o ZIP no computador.
3. Abra o repositório `Solocontrol_Lab` no GitHub.
4. Substitua os arquivos atuais pelo conteúdo interno da pasta extraída.
5. Na raiz do repositório devem ficar diretamente:
   - `app`
   - `components`
   - `lib`
   - `public`
   - `package.json`
   - `tsconfig.json`
   - regras Firebase etc.
6. Não envie `.env.local`.
7. Commit sugerido:

`Atualiza Solocontrol Lab para v0.8.0 - histórico consolidado e início operacional 28-09`

## 3. Vercel

Aguarde o deploy automático.

Não altere as variáveis Firebase já configuradas.

A versão continua usando `jspdf`, já presente no `package.json`.

Se o build ficar vermelho, envie o trecho do log a partir de `Type error` ou `Failed to compile`.

## 4. Primeira abertura depois do deploy

Depois que o deploy ficar verde:

1. abra o Solocontrol Lab;
2. pressione `Ctrl + F5`;
3. aguarde a mensagem `Consolidando a base histórica da Villa Arauco...`;
4. não feche a página durante essa primeira consolidação;
5. o sistema recarregará sozinho quando terminar.

A migração é executada uma única vez.

## 5. O que conferir depois da consolidação

### Dashboard

Selecione `Villa Arauco`.

Confira:

- faixa informando operação diária a partir de **28/09/2026**;
- histórico continua contando para volume/progresso;
- registros antigos não aparecem como atrasados;
- `Sem controle` antigo não aparece como pendência operacional;
- o sino não deve mais ficar carregado por rompimentos históricos.

### Importar / Exportar

Confira:

- Base final de rupturas com **1.323 linhas**;
- banner `Histórico consolidado até 27/09/2026`;
- `Pendências anteriores = 0` na visão operacional;
- tabela `Arquivo Histórico de Rupturas` pesquisável.

### Central do Coordenador

Não devem aparecer rompimentos antigos para delegação.

### Gestão do Tanque

Não devem aparecer CPs históricos como ocupação atual.

## 6. Não importe novamente a planilha manualmente

A base final enviada em 23/09 já está embutida na v0.8.0.

Não é necessário importar novamente:

`344-QUA-For-002-R00-CONTROLE DE CPs RUPTURAS(1).xlsx`

A primeira migração do sistema utilizará essa base automaticamente.

## 7. Importante sobre as 1.323 linhas

Todas as 1.323 linhas são preservadas.

Quando existe vínculo seguro com uma ficha histórica já cadastrada, o resultado é incorporado à ficha.

Quando não existe Quadra/Lote ou outro vínculo suficientemente seguro, a linha fica no **Arquivo Histórico de Rupturas** sem vínculo espacial.

O sistema não inventa Quadra/Lote e não cria concretagens falsas apenas para zerar alertas.

## 8. Como o histórico fica sem pendências

Toda ficha anterior a 28/09 é classificada como histórica e retirada da fila operacional.

Se determinada idade não possui resultado na fonte, a ficha registra:

`Histórico encerrado — sem dado na fonte`

Isso não equivale a afirmar que o ensaio foi realizado. Serve apenas para separar o histórico consolidado da operação diária nova.

## 9. Antes de iniciar 28/09

Entre em:

`Obras → Villa Arauco → Editar`

Confira os parâmetros oficiais:

- MPa de projeto/controle;
- MPa mínimo de baixa idade para liberação de formas;
- regra do par de CPs (manual, menor resultado ou média, conforme procedimento oficial);
- slump por processo;
- tanque/capacidade;
- cliente Arauco;
- executora COPLAN;
- data de início operacional: 28/09/2026.

A planilha histórica sustenta 25 MPa como referência de projeto nas linhas reconhecidas, mas os critérios de baixa idade precisam vir do projeto/procedimento oficial.

## 10. A partir de 28/09

Cadastre todas as fichas novas diariamente pelo Solocontrol Lab.

Use sempre a **data real da coleta/amostragem**.

Exemplo:

- concretagem no sábado;
- digitação na segunda.

A ficha deve receber a data de coleta de sábado. A data de digitação é registrada automaticamente para auditoria.

## 11. Relatório técnico / PDF

No mapa:

`Mapa da Obra → lote → Análise técnica`

Você pode gerar PDF e compartilhar pelo WhatsApp.

Teste também o relatório no Portal do Cliente.

## 12. Firebase

Continue usando as regras atuais do piloto durante a validação.

Não publique ainda as regras `production` até terminar a configuração dos usuários e permissões.
