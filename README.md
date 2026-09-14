# 🍽️ Já pode almoçar?

Agenda compartilhada para combinar desjejum, almoço e jantar no restaurante universitário.

## Stack

React 19, TypeScript, Vite, TanStack Router, TanStack Query, Tailwind CSS 4, Supabase e Bun. Veja [`docs/architecture.md`](docs/architecture.md).

## Desenvolvimento

Requisitos: Bun 1.3+ e um projeto Supabase.

```bash
bun install
copy .env.example .env.local
bun dev
```

Abra `http://localhost:5173`.

## Organização do frontend

```text
src/
├── app/
│   ├── providers/   # configuração global
│   ├── pages/       # arquivos que definem as URLs
│   └── routes/      # criação do router e árvore gerada
├── features/        # regras e telas por domínio
└── shared/          # componentes e utilitários reutilizáveis
```

O arquivo `src/app/routes/routeTree.gen.ts` é gerado automaticamente pelo plugin do TanStack Router.

## Rotas principais

- `/entrar`, `/cadastro` e `/esqueci-senha`: acesso e recuperação de conta.
- `/grupos`: lista de grupos.
- `/grupos/novo`: criação de grupo.
- `/g/:groupSlug`: integrantes e envio de convites.
- `/g/:groupSlug/hoje`: agenda diária do grupo.
- `/g/:groupSlug/agenda`: planejamento da semana.
- `/g/:groupSlug/rotinas`: horários recorrentes do usuário.
- `/g/:groupSlug/configuracoes`: horários de funcionamento do grupo.
- `/configuracoes/notificacoes`: preferências pessoais de notificação.
- `/configuracoes/perfil`: nome, e-mail, senha e exclusão da conta.
- `/convite/:code`: aceite de convite.

Links antigos com o UUID do grupo são redirecionados para o endereço legível correspondente.

## Banco

Com o Supabase CLI instalado e o projeto vinculado, aplique as migrations:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Nunca exponha a chave secreta/service role no navegador.

## Qualidade

```bash
bun test
bun run lint
bun run build
```

O teste de integração cria proprietário, integrante e usuário externo descartáveis e valida as políticas RLS. Ele exige variáveis exclusivas de servidor e nunca expõe a service role ao Vite:

```bash
SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SERVICE_ROLE_KEY=... bun run test:rls
```
