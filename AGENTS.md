<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# REGRAS DO PROJETO PORTAL IMOBILIÁRIO (MASTER_PLAN)

- Leia MASTER_PLAN.md antes de modificar arquitetura.
- Não crie tabelas sem justificar.
- Não altere migrations antigas; crie nova migration.
- Não use service role no frontend.
- Não remova RLS.
- Não altere contratos públicos de API sem analisar impacto.
- Não duplique componentes existentes.
- Não instale dependência sem verificar se o projeto já possui solução.
- Não faça refatoração fora do escopo solicitado.
- Não substitua arquivos grandes inteiros quando uma alteração localizada resolver.
- Preserve compatibilidade.
- Escreva TypeScript tipado.
- Não utilizar any sem justificativa.
- Sempre tratar loading, empty e error states.

