# 🍽️ Já pode almoçar?

Agenda compartilhada para combinar desjejum, almoço e jantar no restaurante universitário.

[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite 8](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![TanStack](https://img.shields.io/badge/TanStack_Router_+_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)](https://tanstack.com/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3FCF8E)](https://supabase.com/)
[![Bun](https://img.shields.io/badge/Bun_1.3-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Brevo](https://img.shields.io/badge/Brevo-0B996E?style=for-the-badge&logo=brevo&logoColor=white)](https://www.brevo.com/)

## Tecnologias

- **Frontend:** React 19, TypeScript, Vite 8 e Tailwind CSS 4.
- **Rotas e dados assíncronos:** TanStack Router e TanStack Query.
- **Backend:** Supabase PostgreSQL, Auth, Row Level Security, Realtime, Cron e Edge Functions.
- **E-mails:** Brevo.
- **Ferramentas e hospedagem:** Bun e Vercel.

As decisões e responsabilidades de cada parte estão em [`docs/architecture.md`](docs/architecture.md).

## Funcionalidades

- Cadastro, confirmação de e-mail, recuperação de senha e configurações de perfil.
- Criação de grupos, convites, troca de grupo e gestão de integrantes.
- Agenda diária com desjejum, almoço e jantar, horários exatos ou intervalos de disponibilidade.
- Possibilidade de confirmar presença, informar ausência ou esperar outro integrante.
- Rotinas recorrentes e ajustes específicos para cada data, com proteção contra sobreposições.
- Navegação entre datas e atualização em tempo real para todos os integrantes.
- Preferências pessoais e lembretes por e-mail respeitando o fuso horário de cada grupo.
- Interface responsiva, URLs legíveis por slug e políticas RLS no banco.

## Desenvolvimento

Requisitos: Bun 1.3+ e um projeto Supabase.

```bash
bun install
copy .env.example .env.local
bun dev
```

Abra `http://localhost:5173`.

Para executar o frontend, preencha em `.env`:

```text
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

Somente variáveis iniciadas por `VITE_` ficam disponíveis no navegador. Nunca use a chave `service_role` em uma variável `VITE_*`.

## Organização do frontend

```text
src/
├── app/
│   ├── providers/   # configuração global
│   ├── pages/       # arquivos que definem as URLs
│   └── routes/      # criação do router e árvore gerada
├── features/        # regras e telas por domínio
└── shared/          # componentes e utilitários reutilizáveis
supabase/
├── functions/       # envio de notificações e integrações privilegiadas
├── migrations/      # schema, funções SQL, RLS, Realtime e Cron
└── templates/       # modelos dos e-mails de autenticação
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

## Lembretes por e-mail

Os lembretes são enviados por uma Supabase Edge Function através do Brevo. Configure os segredos no projeto remoto:

```text
BREVO_API_KEY=...
EMAIL_FROM=Já pode almoçar? <remetente-verificado@example.com>
APP_URL=https://seu-dominio.example.com
```

Depois, publique o banco e a função. A migration agenda a execução a cada cinco minutos e protege a chamada com um token interno:

```bash
supabase db push
supabase functions deploy send-notification-reminders
```

Os horários iniciais, sempre no fuso de cada grupo, são: desjejum às 6h30, confirmação às 8h30, almoço às 10h30, jantar às 16h30 e revisão semanal aos domingos às 17h30. Os resumos de desjejum e jantar começam desativados. Sábado e domingo também começam fora da agenda do grupo; quando o proprietário ativa um desses dias, ele passa a aparecer na agenda semanal e pode receber as notificações correspondentes. Nenhum e-mail do grupo é enviado em um dia de fim de semana desativado, inclusive a revisão semanal aos domingos. Falhas são registradas em `notification_deliveries` e tentadas novamente até cinco vezes.

### Confirmação de cadastro

O e-mail de confirmação é enviado pelo Supabase Auth, separadamente dos lembretes. Para usar o mesmo visual:

1. Em **Authentication > SMTP Settings**, configure o servidor, a porta, o usuário e a **SMTP key** do Brevo.
2. Em **Authentication > Email Templates > Confirm signup**, use o assunto `Desculpa a ansiedade, mas… confirme seu e-mail`.
3. Copie [`supabase/templates/confirmation.html`](supabase/templates/confirmation.html) para o corpo do template.

`BREVO_API_KEY` é usada pela Edge Function e não substitui a SMTP key usada pelo Supabase Auth.

## Deploy

O frontend é publicado na Vercel e utiliza o rewrite de [`vercel.json`](vercel.json) para manter as rotas da SPA funcionando ao recarregar a página. Configure na Vercel apenas:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

`APP_URL`, `EMAIL_FROM` e `BREVO_API_KEY` são segredos da Edge Function e devem ficar no Supabase. O endpoint `/health.json` pode ser usado para uma verificação básica de disponibilidade.

## Qualidade

```bash
bun test
bun run lint
bun run build
```

O teste de integração cria proprietário, integrante e usuário externo descartáveis no projeto indicado, valida as políticas RLS e remove os usuários ao final. Use um projeto de teste quando possível. Ele exige variáveis exclusivas de servidor e nunca expõe a service role ao Vite:

```bash
SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SERVICE_ROLE_KEY=... bun run test:rls
```
