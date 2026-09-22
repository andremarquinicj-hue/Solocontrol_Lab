
## v0.6.1 — correção de build

- Corrigida a tipagem do campo **Construtora / executora** no cadastro de Obras.
- O formulário agora inicializa e carrega corretamente `contractor`, permitindo salvar COPLAN ou outra executora sem erro no build do Vercel.
- Nenhuma funcionalidade da v0.6.0 foi removida.

# Solocontrol Lab v0.5.1

Versão consolidada recomendada para publicação.

A v0.5.1 já contém as melhorias das versões anteriores. Não é necessário publicar v0.4.0 ou v0.5.0 antes.

## Principais módulos

- Dashboard multiobra
- Central do Coordenador
- Lançamento rápido de fichas
- Amostras e rastreabilidade
- Dossiê Técnico do Lote
- Mapa por obra
- Histórico / importação e exportação Excel
- Relatório Diário com fotos
- Portal do Cliente
- Gestão individual de CPs
- Gestão do Tanque / câmara de cura
- Controle de CPs de reserva
- Não conformidades
- Equipamentos e calibrações
- Scanner de etiquetas
- Equipe e matriz de treinamento
- Auditoria
- Visão Executiva
- Acessos e perfis
- Backup JSON
- PWA

## Idades de ruptura em horas e dias

O sistema aceita idades como:

```text
24h
48h
72h
3d
7d
14d
28d
63d
90d
```

Também aceita idades personalizadas, por exemplo:

```text
36h
21d
45d
```

Em `Obras`, as idades padrão podem ser cadastradas assim:

```text
24h,7d,28d,63d
```

- `h` = horas
- `d` = dias

### Ruptura de 24 horas

Quando existir uma idade em horas, o horário da moldagem é obrigatório.

Exemplo:

```text
Moldagem: 22/09/2026 às 09:35
Ruptura 24h: 23/09/2026 às 09:35
```

O horário programado aparece no Dashboard, Central do Coordenador, ficha, relatório diário, Dossiê Técnico e Gestão do Tanque.

Para idades em dias sem horário de moldagem, o sistema mantém vencimento diário, sem marcar atraso artificialmente no meio do dia.

## Dossiê Técnico do Lote

No `Mapa da Obra`, clicar em um lote abre:

- resumo técnico;
- concretagens;
- concreteira e NF;
- volume;
- slump;
- fck;
- laudos;
- cargas;
- resultados em MPa;
- rompimentos por idade;
- análise automática de apoio;
- links para as fichas completas.

A análise automática é gerencial e não substitui normas, projeto, contrato, procedimentos nem a avaliação do responsável técnico.

## Gestão dos CPs de reserva

Cada nova ficha pode criar os CPs individualmente.

Estados previstos:

```text
Armazenado
Rompido
Manter reserva
Elegível para avaliação de descarte
Descartado
```

O sistema nunca descarta CP automaticamente.

Quando a idade principal de controle atende à referência gerencial configurada, o CP de reserva pode ser classificado como:

`Elegível para avaliação de descarte`

A decisão final continua manual e rastreada.

## Gestão do Tanque

A tela `/tanque` mostra:

- CPs armazenados;
- CPs de reserva;
- CPs elegíveis;
- rupturas próximas;
- capacidade do tanque;
- ocupação atual;
- posições livres;
- localização física dos CPs.

O descarte rastreado registra:

- CP;
- usuário;
- data/hora;
- motivo;
- foto;
- ficha de origem.

## Relatório Diário

A rota `/relatorios/diario` permite gerar um relatório diário com:

- concretagens;
- locais de utilização;
- quadra e lote;
- volume;
- ensaios realizados;
- idades;
- horário programado quando aplicável;
- carga;
- resistência;
- responsável;
- fotos.

Pode ser impresso/salvo em PDF pelo navegador e compartilhado.

## Portal do Cliente

O Portal do Cliente permite acompanhamento em tempo real das obras liberadas:

- progresso;
- volume;
- ensaios;
- laudos;
- mapa;
- quadras/lotes;
- detalhes resumidos de cada lote.

Informações internas de tanque, descarte e decisões operacionais permanecem restritas à Solocontrol.

## Firebase

Variáveis esperadas no Vercel:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Opcional:

```text
NEXT_PUBLIC_RECAPTCHA_SITE_KEY
```

Durante a validação, mantenha as regras atuais do piloto.

Não publique ainda:

```text
firestore.production.rules
storage.production.rules
```

até validar usuários nominais, permissões e acessos.

## Publicação

Leia:

`INSTRUCOES-ATUALIZACAO-v0.5.1.md`

A orientação principal é: publicar somente a v0.5.1.

## Compatibilidade

Os registros históricos já importados continuam disponíveis.

Registros antigos sem horário continuam usando datas diárias.

Novas fichas passam a poder armazenar:

- data de moldagem;
- horário de moldagem;
- valor da idade;
- unidade (horas/dias);
- data/hora programada do rompimento.

## Segurança técnica

Alertas automáticos, análises rápidas e sugestões de avaliação de descarte são ferramentas de apoio à gestão.

Critérios de aceitação, tolerâncias de idade, descarte de reserva e aprovação técnica devem seguir os documentos aplicáveis à obra, procedimentos internos e decisão do responsável técnico.

## Verificação do pacote

Os arquivos TypeScript/TSX foram submetidos a verificação sintática/transpilação antes do empacotamento. O build final com as dependências do Next.js/Firebase será executado pelo Vercel.
