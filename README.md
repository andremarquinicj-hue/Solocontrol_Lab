# Solocontrol Lab v0.2.0

Atualização baseada na planilha **PLANILHA CONTROLE CONCRETAGEM** e na planta do **Loteamento Villa Arauco**.

## Novidades

- Importação retroativa de planilhas Excel usadas atualmente na obra.
- Reconhecimento das abas:
  - CONTROLE DE CONC. - RADIER
  - CONTROLE DE CONC. - PAREDES
  - CONTROLE DE CONC. - OITÕES
  - CONTROLE DE CONC. - MUROS
- Preserva nº da concretagem, data, quadra, lote, pavimento, concreteira, NF, volume, laudo, folha e resultados.
- Trata casos como `SEM CONTROLE`, `DESCARTADO`, datas de ruptura ainda previstas e células com texto do tipo `28,52 - 14 DIAS`.
- Registros importados ficam marcados como **Histórico importado** e não poluem a agenda operacional com atrasos antigos.
- Novo **Mapa da Obra** com Quadra + Lote + Elemento.
- Planta Villa Arauco disponível como referência visual.
- Exportação para Excel recriando as abas de controle e um Controle Iluminado.
- Histórico continua pesquisável em Amostras / Ensaios e pode receber anexos posteriormente.

## Como atualizar

Extraia o ZIP e envie todo o conteúdo para a raiz do repositório GitHub, substituindo os arquivos existentes.
O Vercel instalará automaticamente a nova dependência `xlsx` no próximo deploy.

## Firebase

Não é necessário criar novas coleções manualmente. Os registros históricos serão gravados na mesma coleção `samples`, com `source: historical_excel`.

## Primeiro uso

1. Entre em **Importar / Exportar**.
2. Selecione a planilha de controle atual.
3. Confira a prévia e as quantidades.
4. Clique em **Importar registros**.
5. Abra **Mapa da Obra** para navegar por quadra/lote.
6. Use **Exportar planilha atualizada** quando quiser gerar uma cópia em Excel.

> Recomenda-se fazer a primeira importação com uma cópia da planilha original e conferir alguns laudos antes de considerar o histórico validado.


## v0.2.1 — correção de deploy

Corrigido erro de TypeScript no Vercel em `lib/store.ts`:

`FirebaseStorage | null is not assignable to FirebaseStorage`

A referência do Firebase Storage agora é capturada em uma constante não nula antes da exclusão assíncrona das imagens vinculadas à ficha.


## v0.2.2 — correção da importação histórica

- Corrigida a falha ao importar os registros da planilha no Firestore.
- O Firestore não aceita propriedades com valor `undefined`; a planilha histórica possui diversos campos opcionais vazios.
- Agora todos os objetos são higienizados antes da gravação no Firebase.
- Mantida importação em lotes de até 400 documentos (abaixo do limite de 500 do Firestore).
- O botão mostra `Importando...` durante a gravação e exibe detalhes do erro caso algo ainda falhe.
