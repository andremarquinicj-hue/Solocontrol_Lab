# Solocontrol Lab v0.3.0 — Gestão Multiobra

Versão do Solocontrol Lab preparada para gerenciar várias obras no mesmo sistema, mantendo o histórico, agenda operacional, mapas e indicadores separados por obra.

## Novidades principais

### 1. Seletor global de obra
No topo do sistema existe o campo **Obra em análise**:

- Todas as obras
- Villa Arauco
- demais obras cadastradas

O filtro é mantido durante a navegação e afeta Dashboard, Amostras/Ensaios, Mapa, Histórico e Relatórios.

### 2. Dashboard por obra
Ao selecionar uma obra específica, o dashboard mostra:

- registros de concretagem;
- volume acumulado de concreto;
- ensaios/rupturas concluídos;
- quantidade de laudos registrados;
- registros sem controle;
- pendências operacionais;
- progresso de Radier;
- progresso de Paredes/Lajes;
- progresso de Oitões/Platibandas;
- progresso de Muros, quando houver meta;
- avanço do volume de concreto, quando houver volume previsto.

O progresso por elemento usa **unidades únicas por Quadra + Lote**, evitando contar duas vezes o mesmo lote quando houver mais de uma nota fiscal/caminhão.

### 3. Dashboard geral da Solocontrol
Em **Todas as obras** são exibidos indicadores consolidados e uma tabela por obra com:

- progresso;
- registros;
- volume;
- ensaios;
- ocorrências sem controle.

### 4. Planejamento da obra
Em **Obras** agora é possível cadastrar/editar:

- cliente e local;
- quantidade total de unidades prevista;
- volume de concreto previsto;
- meta de Radier;
- meta de Paredes/Lajes;
- meta de Oitões/Platibandas;
- meta de Muros;
- tipo de mapa.

A obra Villa Arauco recebe como referência inicial 620 unidades, conforme o material de projeto utilizado na implantação do sistema. As metas podem ser alteradas pelo coordenador.

### 5. Mapa individual por obra
O **Mapa da Obra** não é mais global.

- Villa Arauco: utiliza a planta de referência e a grade Quadra/Lote.
- Outras obras: podem usar uma grade Quadra/Lote construída a partir dos próprios registros.
- Uma obra também pode ser configurada sem mapa.

As cores continuam indicando:

- verde: possui registro;
- amarelo: parcial/sem controle;
- cinza: sem registro para o elemento selecionado.

### 6. Importação histórica por obra
Antes de importar o Excel, é obrigatório selecionar a **obra de destino**.

Assim, uma planilha nunca é misturada acidentalmente com outra obra.

### 7. Exportação por obra
A exportação Excel usa a obra selecionada no topo e gera as abas de controle de concretagem e Controle Iluminado somente daquela obra.

### 8. Quadra e Lote no lançamento rápido
As novas fichas agora possuem campos opcionais de **Quadra** e **Lote**, permitindo alimentar mapas e indicadores de avanço também com os registros futuros.

### 9. Lotes múltiplos em muros
O sistema interpreta formatos do histórico como:

- `01 E 18`
- `05 E 06`
- `11 A 14`
- `15/16/17/18/19`

Isso melhora o preenchimento do mapa e a contagem de unidades atendidas pelo elemento.

## Atualização no GitHub

Extraia o ZIP e substitua o conteúdo do repositório pelos arquivos desta versão.

Mantenha suas variáveis do Firebase no Vercel. Não envie `.env.local` ao GitHub.

## Firebase

Esta versão não exige nova coleção obrigatória. Os campos adicionais de planejamento são gravados na coleção existente `works`.

As coleções principais continuam:

- `works`
- `samples`
- `team`

As regras existentes de Firestore e Storage continuam compatíveis.

## Observação importante sobre progresso

O percentual depende das metas cadastradas em **Obras**. Sem meta, o sistema exibe a quantidade já executada, mas não inventa um percentual de avanço.
