# Solocontrol Lab v0.9.1 — Base histórica consolidada até 30/09/2026

Esta versão une, sem misturar as responsabilidades de cada fonte:

1. **PICTOGRAMA COPLAN / Letícia** — avanço físico por etapa, quadra e lote;
2. **Controle Solocontrol de CPs / rupturas** — identificação, concreteira, NF, data, MPa de projeto, 7d, 28d, 63d, AP/RP e observações;
3. **Histórico espacial já existente no sistema** — Quadra/Lote, volume, laudos e dados de concretagem previamente importados.

## Marco operacional

- Histórico consolidado: até **30/09/2026**.
- Operação diária oficial no sistema: a partir de **01/10/2026**.
- Registros anteriores permanecem rastreáveis, mas não geram atrasos ou pendências operacionais retroativas.

## Base Solocontrol incorporada

Arquivo recebido em 29/09/2026:

`344-QUA-For-002-R00-CONTROLE DE CPs RUPTURAS (1).xlsx`

- **1.587 linhas** reconhecidas;
- Parede: **683 linhas**, de 04/03/2026 a 17/06/2026;
- Radier: **904 linhas**, de 03/02/2026 a 25/07/2026;
- resultados de 7d/28d, AP/RP e observações são preservados conforme a fonte;
- uma linha sem identificação, mas com NF/data, também é preservada;
- linhas que não possam ser vinculadas com segurança a Quadra/Lote permanecem no arquivo complementar e não são forçadas no mapa.

## Base COPLAN / Letícia

A fotografia de avanço físico recebida em 29/09/2026 continua incorporada como fonte de produção da obra. Ela não substitui os dados laboratoriais e não é usada para inventar vínculos de NF com lote quando o arquivo não oferece chave suficiente.

## Estratégia de rastreabilidade

O sistema cruza automaticamente quando existe vínculo seguro. O que não puder ser ligado com segurança fica preservado como histórico complementar, pesquisável por data, NF, identificação, concreteira, AP/RP e observação.

A partir de 01/10/2026, cada nova ficha deve ser lançada diretamente no sistema com Quadra, Lote, NF, concreteira, coleta/moldagem, slump, CPs, idades e fotos. Isso elimina a ambiguidade histórica dali para frente.


## v0.9.1 — Mapa conciliado COPLAN × Solocontrol
- três modos de visualização do mapa;
- pictograma oficial COPLAN disponível no sistema;
- progresso por quadra extraído diretamente das abas RADIER/PAREDE;
- visão técnica Solocontrol preservada;
- visão consolidada com origem dos dados separada;
- Portal do Cliente atualizado com a mesma lógica.
