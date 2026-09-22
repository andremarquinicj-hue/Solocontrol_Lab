# PASSO A PASSO — SOLOCONTROL LAB v0.6.0

## 1. Qual versão subir

Suba **somente a v0.6.0**. Ela já inclui tudo das versões anteriores.

## 2. Antes de alterar o GitHub

Como seu sistema atual está funcionando, faça um backup simples do repositório atual ou mantenha o commit anterior disponível. O GitHub já permitirá voltar ao commit anterior se necessário.

## 3. Baixar e extrair

Baixe `solocontrol-lab-v0.6.0.zip` e extraia no computador.

Dentro da pasta devem aparecer diretamente:

- `app`
- `components`
- `lib`
- `public`
- `package.json`
- `firestore.rules`
- `storage.rules`
- demais arquivos da raiz.

## 4. Atualizar o GitHub

Abra o repositório `Solocontrol_Lab`.

Substitua os arquivos atuais pelo **conteúdo interno** da pasta extraída.

Não envie a pasta `solocontrol-lab-v0.6.0` como uma subpasta.

Não envie `.env.local`.

Commit sugerido:

`Atualiza Solocontrol Lab para v0.6.0 - fluxo Villa Arauco`

## 5. Vercel

Depois do commit, aguarde o deploy automático.

- Não altere as variáveis Firebase/Vercel que já funcionam.
- Se aparecer erro vermelho, envie a parte do log com `Type error` ou `Build failed`.
- Quando ficar verde, abra o sistema e pressione `Ctrl + F5`.

## 6. Não altere ainda as regras de produção

Para o primeiro teste da v0.6.0, mantenha as regras atuais do piloto.

Não publique ainda:

- `firestore.production.rules`
- `storage.production.rules`

Primeiro valide operação, usuários e portal.

## 7. Configurar Villa Arauco

Entre em:

`Obras → Villa Arauco → Editar`

Confira/preencha:

- Cliente: Arauco;
- Construtora/executora: COPLAN;
- Modo de processo: Villa Arauco;
- MPa de projeto aos 28 dias;
- Critério do par de 28 dias conforme documento da obra;
- MPa necessário de baixa idade para Paredes;
- MPa necessário de baixa idade para Laje;
- MPa necessário de baixa idade para Oitão/Platibanda;
- tanque/câmara e capacidade;
- planta da obra;
- Portal do Cliente habilitado.

### Muito importante

O sistema deixa o critério de avaliação do par como `Manual` até você confirmar no projeto/procedimento se deve ser usado o menor resultado, a média ou outro critério. Não escolha por conveniência.

## 8. Teste 1 — Radier

Crie uma ficha de teste:

- Processo: Radier;
- o sistema deve sugerir 6 CPs;
- 2 CPs → 7 dias;
- 2 CPs → 28 dias;
- 2 CPs → 63 dias;
- faixa de slump exibida: 8 ± 1 cm.

Confira se as fotos da ficha, coleta e etiqueta são obrigatórias.

## 9. Teste 2 — Paredes

Crie uma ficha de teste:

- Processo: Paredes;
- sistema deve sugerir 8 CPs;
- 2 CPs → 12 h;
- 2 CPs → 7 dias;
- 2 CPs → 28 dias;
- 2 CPs → 63 dias;
- faixa de slump: 20 ± 2 cm;
- horário de moldagem obrigatório.

Abra a ficha e confirme que o par de baixa idade pode ser reprogramado para 19 h ou 24 h.

## 10. Teste 3 — Laje

O sistema deve montar:

- 8 CPs;
- 12 h / 7 d / 28 d / 63 d, sempre 2 CPs por idade;
- slump 8 ± 1 cm.

## 11. Teste 4 — Oitão / Platibanda

O sistema deve montar:

- 8 CPs;
- 12 h / 7 d / 28 d / 63 d, 2 CPs por idade;
- slump 20 ± 2 cm.

## 12. Teste 5 — resultado em par

Abra uma ruptura e confira se aparecem os dois CPs individualmente. Para cada um, lance carga/unidade/dimensões.

Confirme que o sistema mostra MPa individual por CP e mantém ambos na rastreabilidade.

## 13. Teste 6 — 28 dias e reserva de 63 dias

Somente depois de configurar o MPa e o critério correto da obra, lance um resultado de teste de 28 dias.

Se o critério configurado for atendido, o CP de 63 dias deve aparecer como:

`Elegível para avaliação de descarte`

Ele **não deve ser descartado automaticamente**.

Abra `Gestão do Tanque` e confirme que o descarte exige decisão manual e foto.

## 14. Teste 7 — Mapa e cliente

Abra:

`Mapa da Obra → Villa Arauco`

Clique em um lote e confira:

- concretagens;
- resultados;
- cargas;
- gráfico de evolução;
- análise técnica rápida.

Depois abra o `Portal do Cliente` com um usuário de cliente e confira que ele vê somente as obras autorizadas e uma versão profissional/sanitizada do relatório do lote.

## 15. Registros históricos

Os registros antigos importados continuam disponíveis.

A planilha antiga possui a categoria `PAREDES E LAJES`. O sistema mantém esse histórico combinado porque não existe informação suficiente para separar os registros antigos com segurança. Novos lançamentos passam a separar Paredes e Lajes.

## 16. Depois dos testes

Quando toda a operação estiver validada, o próximo passo é:

1. criar usuários nominais;
2. testar Administrador, Coordenador, Laboratorista, Engenheiro e Cliente;
3. conferir quais obras cada cliente pode visualizar;
4. ativar as regras de produção;
5. desativar o modo anônimo/piloto.
