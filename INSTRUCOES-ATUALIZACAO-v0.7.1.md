# Solocontrol Lab v0.7.1 — correção do build Vercel

Esta versão corrige o erro de TypeScript apresentado no Vercel em `lib/rupture-import.ts:367`.

## Erro corrigido

O build utilizava `target: es5` e iterava diretamente um `Map`, causando:

`Type Map<string, RuptureImportRecord[]> can only be iterated through when using --downlevelIteration or target es2015+`

A v0.7.1 corrige de duas formas:

- a iteração usa `Array.from(matchedGroups.entries())`;
- `downlevelIteration: true` foi habilitado no `tsconfig.json`.

## Como atualizar

1. Baixe `solocontrol-lab-v0.7.1.zip`.
2. Extraia.
3. Substitua no GitHub os arquivos da v0.7.0 pelos arquivos desta versão.
4. Commit sugerido: `Corrige build Solocontrol Lab v0.7.1`.
5. Aguarde o novo deploy automático do Vercel.
6. Não altere Firebase, variáveis de ambiente nem regras.

A v0.7.1 contém integralmente a v0.7.0, incluindo a sincronização da planilha de rupturas e geração de PDF.
