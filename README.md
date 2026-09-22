# Solocontrol Lab v0.7.0 — Operação diária + base atualizada de rupturas

Versão consolidada recomendada para publicação.

A v0.7.0 contém tudo o que já estava na v0.6.1 e acrescenta a atualização baseada na planilha enviada em 22/09/2026:

`344-QUA-For-002-R00-CONTROLE DE CPs RUPTURAS.xlsx`

## O que foi corrigido

### 1. Nova planilha de CPs / rupturas
A tela `Importar / Sincronizar Excel` agora reconhece dois formatos diferentes:

1. planilha de concretagens, com Quadra/Lote/volume/laudo;
2. planilha atualizada de CPs/rupturas, com MPa de projeto, 7d, 28d, 63d, AP/RP e observações.

A planilha de rupturas **não cria uma nova concretagem**. Ela atualiza os registros espaciais já existentes quando o vínculo é seguro.

### 2. Base recebida já embutida na versão
A planilha enviada pelo coordenador já foi convertida e incluída em:

`public/data/villa-arauco-rupturas-2026-09-22.json`

Na tela de histórico da Villa Arauco aparece:

`Atualização de CPs e rupturas de 22/09/2026`

Basta:

1. clicar em `Preparar sincronização`;
2. revisar a prévia;
3. clicar em `Aplicar atualização`.

### 3. Resultado da análise da planilha recebida
A fonte possui:

- 2 abas;
- 1.323 linhas reconhecidas;
- período de 03/02/2026 a 17/06/2026;
- MPa de projeto;
- resultados de 7, 28 e 63 dias;
- AP/RP;
- observações, inclusive descarte de CPs de 63 dias e registros de NC.

Ao comparar com os 951 registros espaciais já existentes da Villa Arauco:

- 884 linhas possuem vínculo seguro;
- 878 fichas existentes podem ser atualizadas;
- 439 linhas não possuem informação suficiente para um vínculo espacial seguro;
- essas 439 linhas ficam preservadas no `Arquivo complementar de rupturas`, sem inventar Quadra/Lote e sem duplicar concretagens.

Essa separação é proposital para proteger a rastreabilidade.

## Data real da coleta / amostragem

Novas fichas possuem:

- data da coleta;
- horário da coleta;
- data/hora da moldagem;
- data/hora em que a ficha foi lançada no sistema.

Assim, se uma concretagem ocorrer no sábado e for digitada na segunda-feira, o sistema continua atribuindo a concretagem e o relatório diário à **data real da coleta**.

A data de criação do registro permanece no histórico de auditoria.

## Relatório técnico em PDF

O Dossiê Técnico do Lote agora possui:

- `Gerar PDF`
- `PDF / WhatsApp`

O PDF inclui:

- identificação da obra;
- Quadra/Lote;
- cliente e executora;
- quantidade de concretagens;
- volume controlado;
- ensaios/resultados;
- rastreabilidade das concretagens;
- resultados por idade;
- gráfico de evolução da resistência;
- MPa de projeto;
- análise técnica automática de apoio;
- observações e ressalvas técnicas.

No celular, quando o navegador suporta compartilhamento de arquivos, o próprio PDF pode ser enviado pelo menu de compartilhamento.

No computador, o sistema baixa o PDF e abre o WhatsApp Web com uma mensagem pronta para o usuário anexar o arquivo.

O Portal do Cliente possui a mesma geração de PDF, em versão apropriada para acompanhamento externo.

## Planilha atualizada e CP de 63 dias

Quando a fonte histórica informa que o CP de reserva já foi descartado ou já foi ensaiado aos 63 dias, a análise técnica passa a respeitar essa informação e não apresenta o CP como uma nova reserva pendente.

## Fluxo Villa Arauco preservado

Continuam disponíveis:

### Radier
- 6 CPs
- 2 aos 7 dias
- 2 aos 28 dias
- 2 aos 63 dias
- slump configurável, perfil inicial 8 ± 1 cm

### Paredes / Lajes / Oitão / Platibanda
- 8 CPs
- 2 inicialmente em 12 h, com reprogramação dos mesmos CPs para 19 h ou 24 h quando necessário
- 2 aos 7 dias
- 2 aos 28 dias
- 2 aos 63 dias
- perfis de slump configuráveis por processo

Os critérios de MPa e a regra do par de CPs permanecem configuráveis na obra.

## Compatibilidade

Os registros históricos antigos continuam funcionando.

A atualização de rupturas complementa os registros existentes em vez de apagá-los.

Nenhuma linha da nova planilha é simplesmente descartada: registros que não podem ser ligados com segurança a Quadra/Lote são preservados separadamente.

## Dependência nova

A v0.7.0 utiliza `jspdf` para gerar o relatório técnico em PDF no navegador.

O Vercel instalará essa dependência automaticamente a partir do `package.json`.

## Segurança

Durante a validação mantenha as regras atuais do piloto.

Ainda não publique:

- `firestore.production.rules`
- `storage.production.rules`

até os usuários nominais/perfis estarem testados.

## Validação do pacote

Foram executadas:

- verificação estrutural de tipos dos arquivos internos;
- transpilação/sintaxe dos 42 arquivos TypeScript/TSX;
- conferência da base JSON embutida com 1.323 linhas.

O build final com Next.js/Firebase/jsPDF será executado pelo Vercel no deploy.
