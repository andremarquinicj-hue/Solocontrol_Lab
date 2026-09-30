# Solocontrol Lab v0.9.1 — Mapa COPLAN × Solocontrol

## O que mudou
A v0.9.1 atualiza o mapa da Villa Arauco para trabalhar com duas fontes de informação sem misturar a origem dos dados:

- **PICTOGRAMA COPLAN / Letícia**: avanço físico da obra;
- **Solocontrol**: fichas, concretagens, ensaios, rompimentos, volume e rastreabilidade.

## Novos modos do mapa
### 1. Visão consolidada
Mostra o avanço COPLAN no cabeçalho de cada quadra e a rastreabilidade Solocontrol nos lotes.

### 2. Avanço físico COPLAN
Exibe a imagem do pictograma oficial e o progresso por quadra extraído da própria planilha.

### 3. Controle Solocontrol
Mantém o mapa técnico baseado apenas nas fichas e registros do laboratório.

## Portal do Cliente
O cliente COPLAN também recebe os três modos do mapa. Assim ele consegue conferir o pictograma que já utiliza e, ao mesmo tempo, verificar onde a Solocontrol possui rastreabilidade técnica.

## Regra de segurança da conciliação
Quando a PICTOGRAMA não identifica explicitamente o número do lote, o sistema mostra a quantidade oficial da quadra, mas **não inventa qual lote corresponde àquele avanço**.

Quando existe lote explicitamente identificado na fonte, o sistema permite classificar a situação como:

- COPLAN + Solocontrol conciliados;
- executado COPLAN sem ficha vinculada;
- controle Solocontrol sem identificação individual no pictograma.

## Arquivos incorporados
- `public/data/villa-arauco-pictograma-map-2026-09-29.json`
- `public/pictograma-radier.png`
- `public/pictograma-parede.png`
- `public/pictograma-casa-concretada.png`

A extração da PICTOGRAMA confere os totais oficiais:
- 620 unidades;
- 373 radiers concretados;
- 362 paredes concretadas;
- 152 oitões concretados.

## Atualização no GitHub
1. Baixe e extraia `solocontrol-lab-v0.9.1.zip`.
2. Substitua os arquivos atuais do repositório pelos arquivos desta versão.
3. Commit sugerido: `Atualiza mapa COPLAN x Solocontrol - v0.9.1`.
4. Aguarde o deploy automático do Vercel.
5. Após o deploy ficar verde, faça `Ctrl + F5`.
6. Teste primeiro `Mapa da Obra` e depois `/portal-cliente`.

## Firebase
Não é necessário alterar variáveis ou regras para esta atualização.
