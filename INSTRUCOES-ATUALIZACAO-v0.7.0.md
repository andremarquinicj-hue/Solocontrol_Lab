# PASSO A PASSO — SOLOCONTROL LAB v0.7.0

## 1. Qual arquivo subir

Suba somente:

`solocontrol-lab-v0.7.0.zip`

Ele substitui a v0.6.1 e já contém todas as funcionalidades anteriores.

## 2. GitHub

1. Baixe e extraia o ZIP.
2. Abra o repositório `Solocontrol_Lab`.
3. Substitua os arquivos da raiz pelos arquivos da v0.7.0.
4. Devem ficar diretamente na raiz:
   - `app`
   - `components`
   - `lib`
   - `public`
   - `package.json`
   - regras Firebase
   - demais arquivos do projeto.
5. Não envie `.env.local`.
6. Commit sugerido:

`Atualiza Solocontrol Lab para v0.7.0 - base de rupturas e relatório PDF`

## 3. Vercel

Após o commit, aguarde o deploy automático.

A v0.7.0 possui uma dependência nova:

`jspdf`

O Vercel deve instalá-la automaticamente.

Se o build ficar vermelho, envie a parte do log que começa em `Type error`, `Failed to compile` ou `npm ERR`.

## 4. Limpar cache

Depois do deploy verde:

1. abra o Solocontrol Lab;
2. pressione `Ctrl + F5`.

A versão do Service Worker foi atualizada para v0.7.0.

## 5. Sincronizar a planilha atualizada recebida

Selecione:

`Villa Arauco`

Depois acesse:

`Importar / Exportar`

Na parte superior haverá:

`Atualização de CPs e rupturas de 22/09/2026`

Clique:

1. `Preparar sincronização`;
2. confira a prévia;
3. `Aplicar atualização`.

Resultado esperado com a base atual:

- 1.323 linhas fonte;
- aproximadamente 884 linhas vinculadas;
- aproximadamente 878 fichas atualizadas;
- 439 linhas preservadas sem vínculo espacial.

Os números de vínculo dependem dos registros que estiverem no Firebase no momento da sincronização. Não force registros sem Quadra/Lote no mapa.

## 6. Não importe novamente os 951 registros se eles já estão no sistema

A planilha de rupturas foi desenhada para complementar os 951 registros já existentes.

Se os 951 históricos já aparecem no Dashboard/Histórico, apenas aplique a sincronização da nova base de CPs.

## 7. Configuração para começar o lançamento diário

Antes de começar as fichas de 23/09 em diante, abra:

`Obras → Villa Arauco → Editar`

Confira:

- MPa de projeto/controle;
- MPa de liberação de forma por processo;
- regra do par de CPs;
- capacidade/nome do tanque;
- perfis de slump.

Use os valores oficiais do projeto/procedimento.

## 8. Lançamentos feitos depois da concretagem

Na nova ficha use sempre:

`Data da coleta / amostragem`

como a data real em que o caminhão foi amostrado.

Exemplo:

- concretagem/coleta: sábado, 26/09;
- lançamento no sistema: segunda, 28/09.

Preencha:

`Data da coleta = 26/09`

O sistema mantém a criação do registro em 28/09 para auditoria, mas relatórios operacionais usam a data real da coleta.

## 9. Testar PDF e WhatsApp

Acesse:

`Mapa da Obra → clique em um lote → Análise técnica`

Teste:

- `Gerar PDF`;
- `PDF / WhatsApp`.

No celular, o compartilhamento deve oferecer os aplicativos compatíveis.

No computador, o PDF é baixado e o WhatsApp Web é aberto com uma mensagem pronta.

Teste também no Portal do Cliente.

## 10. Firebase

Não mude as variáveis que já funcionam.

Para o piloto, as regras atuais continuam adequadas para validação.

Não publique as regras `production` antes da configuração final de login/perfis.
