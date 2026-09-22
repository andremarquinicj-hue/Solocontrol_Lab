# Solocontrol Lab v0.6.0 — Operação Villa Arauco

Versão consolidada para publicação. **Não é necessário subir v0.4.0, v0.5.0 ou v0.5.1 antes.**

A v0.6.0 foi estruturada a partir do fluxo operacional informado para a Villa Arauco/COPLAN e mantém o modo genérico para as demais obras que a Solocontrol cadastrar futuramente.

## Objetivo

O sistema foi organizado para trabalhar junto com a ficha física padrão da Solocontrol. No início, a ficha continua sendo preenchida e arquivada fisicamente para auditoria; o sistema funciona como controle operacional, rastreabilidade, agenda, análise gerencial, evidência fotográfica e portal de acompanhamento.

## Perfil operacional — Villa Arauco

### Radier

- 6 CPs por amostragem;
- 2 CPs aos 7 dias;
- 2 CPs aos 28 dias;
- 2 CPs aos 63 dias;
- slump operacional informado: **8 ± 1 cm**.

### Paredes

- 8 CPs por amostragem;
- 2 CPs inicialmente programados para 12 h;
- se a condição ainda não permitir o ensaio/liberação, os mesmos CPs podem ser reprogramados para 19 h ou 24 h;
- 2 CPs aos 7 dias;
- 2 CPs aos 28 dias;
- 2 CPs aos 63 dias;
- slump operacional informado: **20 ± 2 cm**.

### Lajes

- 8 CPs;
- 2 CPs em baixa idade (12 h, com possibilidade de reprogramação para 19 h ou 24 h);
- 2 CPs aos 7 dias;
- 2 CPs aos 28 dias;
- 2 CPs aos 63 dias;
- slump operacional informado: **8 ± 1 cm**.

### Oitão / Platibanda

- 8 CPs;
- 2 CPs em baixa idade (12 h, com possibilidade de reprogramação para 19 h ou 24 h);
- 2 CPs aos 7 dias;
- 2 CPs aos 28 dias;
- 2 CPs aos 63 dias;
- slump operacional informado: **20 ± 2 cm**.

Esses valores são tratados pelo sistema como **perfil operacional configurável da obra**, não como regra normativa universal. Devem ser conferidos com projeto, especificações, procedimento da Solocontrol e requisitos do cliente.

## Cadastro da obra

Em `Obras`, a Villa Arauco pode guardar:

- cliente;
- construtora/executora (ex.: COPLAN);
- metas por etapa;
- MPa de projeto aos 28 dias;
- MPa de baixa idade para liberação de formas por processo;
- critério de avaliação do par (`manual`, `menor resultado` ou `média`);
- idade principal de controle;
- idade de reserva;
- regra de triagem de CPs de 63 dias;
- capacidade do tanque/câmara;
- planta da obra;
- liberação no Portal do Cliente.

O modo padrão de avaliação é **manual**. O sistema não presume se o projeto exige o menor resultado ou a média do par.

## Lançamento baseado na ficha física

A tela `Lançamento rápido` virou uma transcrição orientada da ficha de moldagem.

Ela registra, quando disponível:

- obra;
- referência da ficha física;
- relatório;
- fornecedor/concreteira;
- NF;
- caminhão/betoneira e placa;
- volume;
- brita;
- slump medido;
- MPa de projeto;
- quadra/lote/local;
- método de lançamento;
- saída da usina;
- chegada na obra;
- horário do slump;
- início de descarga;
- data e horário de moldagem;
- água adicionada;
- laboratorista;
- etiqueta;
- fotos da ficha, coleta e etiqueta.

Ao escolher `Radier`, `Paredes`, `Laje` ou `Oitão / Platibanda`, o plano de CPs é montado automaticamente. Existe uma opção de **amostragem excepcional** caso uma ficha real tenha um plano diferente.

## Slump

O sistema compara o valor lançado com a faixa configurada para o processo e sinaliza:

- dentro da faixa;
- abaixo;
- acima;
- sem critério configurado.

O alerta é gerencial e não substitui decisão técnica de campo.

## Ensaio de baixa idade e liberação de formas

Para Paredes, Lajes e Oitão/Platibanda, o sistema cria o par de CPs de baixa idade.

O ensaio começa programado para 12 h. Se for necessário aguardar, a própria ficha permite reprogramar os **mesmos CPs** para 19 h ou 24 h, registrando:

- horário original;
- novo horário;
- motivo;
- data da alteração.

O sistema compara o resultado com o MPa de baixa idade configurado, mas **não libera a forma automaticamente**. A liberação continua sendo uma decisão responsável conforme projeto/procedimento.

## Resultados em pares

Cada CP do par recebe individualmente:

- carga;
- unidade;
- diâmetro;
- altura, quando registrada;
- resistência calculada em MPa.

O evento mantém os resultados individuais e uma consolidação para gráfico/relatório.

## 28 dias e CP de 63 dias

O sistema permite cadastrar o MPa exigido pelo projeto.

Quando o resultado de controle de 28 dias atende ao critério configurado, os CPs de 63 dias passam para:

`Elegível para avaliação de descarte`

Eles **não são descartados automaticamente**. A Gestão do Tanque exige confirmação manual, usuário, motivo e foto do CP antes do descarte.

## Gestão do Tanque

A tela `/tanque` mostra:

- CPs armazenados;
- reservas de 63 dias;
- CPs elegíveis;
- capacidade;
- ocupação;
- posições livres;
- localização física;
- saídas previstas;
- histórico de descartes.

## Mapa e Dossiê Técnico do Lote

No mapa interno, clicar em um lote abre um dossiê com:

- resumo;
- concretagens;
- volume;
- processo;
- concreteira/NF;
- slump;
- MPa de projeto;
- cargas e resultados individuais;
- rompimentos;
- análise gerencial;
- **gráfico de evolução da resistência/cura do concreto**.

Os dados históricos antigos `PAREDES E LAJES` permanecem identificados dessa forma porque a planilha antiga não permite separar com segurança o que foi Parede e o que foi Laje. Novos lançamentos passam a registrar as etapas separadamente.

## Relatório Diário

A rota `/relatorios/diario` consolida o dia com:

- concretagens e locais de uso;
- quadra/lote;
- processo;
- ficha física;
- slump e situação;
- volume;
- ensaios;
- resultados individuais dos CPs;
- controle de baixa idade;
- fotos.

Pode ser impresso/salvo em PDF pelo navegador e compartilhado com o grupo.

## Portal do Cliente

O Portal do Cliente foi estruturado como apresentação profissional da Solocontrol:

- dashboard da obra;
- volume controlado;
- concretagens;
- ensaios;
- laudos/referências;
- progresso por etapa;
- mapa de quadras/lotes;
- atualização em tempo real pelo Firebase;
- relatório técnico de acompanhamento ao clicar no lote;
- gráfico de evolução da resistência;
- resultados e evidências liberadas;
- impressão/PDF do relatório do lote.

O cliente **não vê** informações internas de tanque, descarte, auditoria ou decisões operacionais.

## Segurança técnica

Os alertas e análises automáticas são ferramentas de apoio. Critérios de aceitação, tolerâncias, liberação de formas e descarte de reservas devem seguir projeto, especificações, procedimentos, contrato, normas aplicáveis e responsável técnico.

## Firebase

A v0.6.0 não exige nova coleção para o fluxo principal. Os novos campos são gravados nos documentos existentes.

Durante a validação, mantenha as regras atuais do piloto. **Não publique ainda** `firestore.production.rules` e `storage.production.rules` até validar os usuários nominais e permissões.

## Publicação

Leia `INSTRUCOES-ATUALIZACAO-v0.6.0.md`.

## Verificação

Os arquivos TypeScript/TSX foram submetidos a verificação sintática local. O build completo com as dependências Next.js/Firebase será executado pelo Vercel durante o deploy.
