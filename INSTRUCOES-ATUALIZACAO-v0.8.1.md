# Atualização Solocontrol Lab v0.8.1

## 1. Suba somente esta versão

Use:

`solocontrol-lab-v0.8.1.zip`

A v0.8.1 já contém tudo da v0.8.0.

## 2. GitHub

1. Extraia o ZIP.
2. Abra o repositório `Solocontrol_Lab`.
3. Substitua os arquivos atuais pelo conteúdo interno da pasta extraída.
4. Não envie `.env.local`.
5. Faça o commit.

Sugestão:

`Corrige Paredes/Lajes e cadastra equipe - v0.8.1`

## 3. Vercel

Aguarde o deploy automático.

Não altere Firebase nem variáveis de ambiente.

Quando ficar verde, abra o sistema e pressione:

`Ctrl + F5`

## 4. O que conferir

### Dashboard

Em `Progresso da obra`, devem aparecer apenas:

- Radier;
- Paredes / Lajes;
- Oitões / Platibandas;
- Muros, quando houver.

Não devem existir cartões separados `Paredes`, `Lajes` e `Paredes/Lajes (histórico)`.

### Mapa

Nos filtros do mapa deve existir apenas:

`Paredes / Lajes`

O Resumo do Dossiê Técnico também deve apresentar um único agrupamento.

### Portal do Cliente

O progresso e o mapa externo devem seguir o mesmo agrupamento consolidado.

### Equipe

Abra:

`Equipe`

Confirme os nomes:

- Lucas
- Fabiano
- Ederson
- Rafael
- Eduardo
- Ismael
- Leonardo
- Bruno

Os que ainda não estiverem na coleção `team` serão gravados automaticamente no Firebase no primeiro carregamento.

## 5. Importante

Paredes e Lajes continuam sendo processos distintos nas novas fichas para fins técnicos. A consolidação ocorre apenas nas visões de progresso/mapa para evitar a duplicidade causada pelo histórico antigo `PAREDES E LAJES`.
