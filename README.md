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

## Rotas do protótipo

- `/entrar`, `/cadastro` e `/esqueci-senha`: acesso e recuperação de conta.
- `/grupos`: lista de grupos.
- `/grupos/novo`: criação de grupo.
- `/grupos/:groupId`: integrantes e envio de convites.
- `/convite/:code`: aceite de convite.
- `/` e `/agenda`: agenda diária e semanal.

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

## Próximos incrementos

- autenticação e criação de perfil;
- criação de grupo e entrada por convite;
- edição da agenda diária e semanal;
- tarefas de e-mail semanais e diárias.
