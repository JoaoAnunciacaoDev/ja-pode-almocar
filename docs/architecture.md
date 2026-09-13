# Decisões de arquitetura

## Stack do MVP

- **Runtime e gerenciador:** Bun 1.3.13.
- **Aplicação:** React 19, TypeScript e Vite.
- **Roteamento:** TanStack Router com rotas baseadas em arquivos e árvore tipada gerada.
- **Estado assíncrono:** TanStack Query.
- **Estilos:** Tailwind CSS 4, mantendo tokens visuais em CSS.
- **Dados e identidade:** Supabase (PostgreSQL, Auth e Row Level Security).
- **Agendamentos:** Supabase Cron invocando Edge Functions.
- **E-mail:** Resend, atrás de uma função própria para permitir troca futura.
- **Hospedagem:** Vercel para a aplicação SPA; Supabase para banco, funções e tarefas.
- **Testes iniciais:** `bun test` para regras de domínio; lint e build no CI.

## Por que esta combinação

O frontend é uma SPA com uma fundação pequena e tipada. A lógica de backend fica no Supabase: RLS protege os dados e Edge Functions concentram operações privilegiadas, notificações e e-mails. Bun é usado para instalação, scripts e testes.

## Organização

```text
src/app/providers    configuração global de query, auth e tema
src/app/pages        arquivos de rota e estrutura de URLs
src/app/routes       instância do router e árvore gerada
src/features         UI e regras agrupadas por domínio
src/shared           componentes, hooks e utilitários reutilizáveis
supabase/migrations  schema, funções e políticas RLS
```

## Regras arquiteturais

1. Uma entrada de data específica sempre prevalece sobre a rotina semanal.
2. Autorização não depende da interface: todas as tabelas públicas usam RLS.
3. Usuários podem escrever somente seus próprios horários.
4. Horários são `time`; datas acadêmicas são `date`. Instantes de auditoria são `timestamptz`.
5. O fuso padrão inicial é `America/Sao_Paulo`, armazenado por grupo para evolução futura.
