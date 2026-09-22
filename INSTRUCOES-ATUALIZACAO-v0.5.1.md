# PASSO A PASSO — SOLOCONTROL LAB v0.5.1

## Qual versão subir?

Suba **somente a v0.5.1**.

Você informou que ainda não publicou a versão anterior. Portanto, não precisa subir v0.4.0 nem v0.5.0 antes.

A v0.5.1 já contém:

- gestão multiobra;
- Dashboard;
- Central do Coordenador;
- relatório diário com fotos;
- Portal do Cliente;
- login/perfis;
- auditoria;
- não conformidades;
- equipamentos;
- scanner;
- Visão Executiva;
- Dossiê Técnico do Lote;
- gestão individual de CPs;
- Gestão do Tanque;
- controle de CP reserva de 63 dias;
- idades de ruptura em horas e dias;
- ruptura de 24h com horário exato.

---

## 1. Baixar e extrair

Baixe:

`solocontrol-lab-v0.5.1.zip`

Extraia no computador.

Ao abrir a pasta extraída, você deve enxergar diretamente:

- `app`
- `components`
- `lib`
- `public`
- `package.json`
- `firestore.rules`
- `storage.rules`
- etc.

---

## 2. Atualizar o GitHub

Abra o repositório:

`Solocontrol_Lab`

Substitua os arquivos atuais pelo **conteúdo interno** da pasta extraída.

Não envie a pasta `solocontrol-lab-v0.5.1` como uma subpasta dentro do repositório.

Não envie `.env.local`.

Commit sugerido:

`Atualiza Solocontrol Lab para v0.5.1`

---

## 3. Vercel

Após o commit, o Vercel deve iniciar um novo deploy automaticamente.

Não altere as variáveis de ambiente do Firebase que já estão funcionando.

Aguarde o deploy ficar verde.

Se o Vercel mostrar qualquer erro vermelho, tire um print da parte do log onde aparece `Type error` ou `Build failed` e envie no chat.

---

## 4. Depois do deploy

Abra o sistema e pressione:

`Ctrl + F5`

para garantir que o navegador descarregou a versão nova do PWA/cache.

---

## 5. Configurar a obra

Entre em:

`Obras → Villa Arauco → Editar`

No campo **Idades padrão**, você agora pode usar algo como:

`24h,7d,28d,63d`

ou somente as idades realmente utilizadas nessa obra.

Exemplo:

- `24h` = vinte e quatro horas;
- `48h` = quarenta e oito horas;
- `7d` = sete dias;
- `28d` = vinte e oito dias;
- `63d` = sessenta e três dias.

Preencha também:

- fck padrão;
- idade principal de controle;
- idade de reserva;
- regra de triagem do CP reserva;
- nome do tanque;
- capacidade real do tanque.

Use os valores técnicos reais da obra/projeto/procedimento.

---

## 6. Teste recomendado para 24 horas

Crie uma ficha de teste.

Exemplo:

- Data da moldagem: hoje;
- Horário da moldagem: 09:35;
- Idades: `24h,7d,28d,63d`.

Confirme que o sistema mostra:

- 24h → amanhã às 09:35;
- 7d → data correspondente;
- 28d → data correspondente;
- 63d → data correspondente.

Confira também:

- Dashboard;
- Central do Coordenador;
- detalhe da amostra;
- relatório diário;
- mapa/dossiê do lote.

---

## 7. Firebase

Para testar esta versão, mantenha as regras atuais do piloto.

**Não publique ainda:**

- `firestore.production.rules`
- `storage.production.rules`

Primeiro valide:

1. lançamentos;
2. fotos;
3. rompimentos;
4. 24 horas;
5. Gestão do Tanque;
6. Portal do Cliente;
7. usuários nominais.

Depois fazemos juntos a migração final de segurança.

---

## 8. Observação importante

O sistema aceita horários e idades diferentes para organização, rastreabilidade e alertas.

A determinação da idade/tolerância válida para cada ensaio deve seguir os procedimentos, normas, projeto, contrato e orientação técnica aplicáveis à obra.
