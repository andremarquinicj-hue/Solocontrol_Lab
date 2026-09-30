# Atualização — Solocontrol Lab v0.9.0

## Objetivo
Consolidar o histórico existente e iniciar a operação diária limpa em **01/10/2026**.

## Fontes incorporadas
- PICTOGRAMA COPLAN VILA ARAUCO — avanço físico;
- Controle Solocontrol de CPs / rupturas recebido em 29/09/2026 — 1.587 linhas;
- Histórico de concretagens já existente no Firebase.

## Como publicar
1. Extraia `solocontrol-lab-v0.9.0.zip`.
2. Substitua os arquivos do repositório pelos arquivos desta versão.
3. Commit sugerido: `Consolida histórico Villa Arauco e inicia operação 01-10 - v0.9.0`.
4. Aguarde o deploy do Vercel.
5. Abra o sistema e faça `Ctrl + F5`.
6. No primeiro acesso, aguarde a mensagem de consolidação histórica terminar.

## O que a migração faz
- atualiza os resultados históricos quando o vínculo é seguro;
- substitui o arquivo complementar de rupturas da Villa Arauco pela fonte atual de 29/09;
- arquiva operacionalmente registros anteriores a 01/10/2026;
- mantém o pictograma COPLAN como fonte separada de avanço físico;
- não cria Quadra/Lote artificial para linhas sem vínculo confiável.

## Depois da migração
Confira em `Importar / Exportar`:
- quantidade de linhas da base de rupturas;
- arquivo complementar;
- marco operacional em 01/10/2026.

A partir de 01/10/2026, lance todas as novas fichas diretamente no sistema.
