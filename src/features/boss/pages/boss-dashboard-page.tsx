import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  Crown,
  Lock,
  Search,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useState } from "react";

import { fetchBossDashboardData, setUserBossStatus } from "@/features/boss/api/boss-api";
import { useBossStatus } from "@/features/boss/hooks/use-boss-status";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { AppShell } from "@/shared/components/app-shell";

function formatDate(dateString: string | null): string {
  if (!dateString) return "Nunca";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function BossDashboardPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { data: isBoss, isLoading: isBossLoading } = useBossStatus();
  const [activeTab, setActiveTab] = useState<"groups" | "users">("groups");
  const [groupSearch, setGroupSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ["boss-dashboard-data"],
    queryFn: fetchBossDashboardData,
    enabled: Boolean(isBoss),
  });

  const setBossMutation = useMutation({
    mutationFn: ({ userId, makeBoss }: { userId: string; makeBoss: boolean }) =>
      setUserBossStatus(userId, makeBoss),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["boss-dashboard-data"] });
      setActionNotice(
        variables.makeBoss
          ? "Usuário promovido a Boss com sucesso."
          : "Papel de Boss removido do usuário com sucesso."
      );
    },
    onError: (err) => {
      setActionNotice(err instanceof Error ? err.message : "Erro ao alterar papel de Boss.");
    },
  });

  const data = dashboardQuery.data;
  const groups = data?.groups ?? [];
  const users = data?.users ?? [];

  const filteredGroups = groupSearch.trim()
    ? groups.filter((g) => {
        const term = groupSearch.trim().toLowerCase();
        return (
          g.name.toLowerCase().includes(term) ||
          g.slug.toLowerCase().includes(term) ||
          g.ownerName.toLowerCase().includes(term) ||
          g.ownerEmail.toLowerCase().includes(term)
        );
      })
    : groups;

  const filteredUsers = userSearch.trim()
    ? users.filter((u) => {
        const term = userSearch.trim().toLowerCase();
        return (
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
        );
      })
    : users;

  const totalGroups = groups.length;
  const totalUsers = users.length;
  const totalMemberships = groups.reduce((acc, g) => acc + g.membersCount, 0);
  const avgMembers = totalGroups > 0 ? (totalMemberships / totalGroups).toFixed(1) : "0";
  const activeUsersCount = users.filter((u) => Boolean(u.lastSignInAt)).length;

  if (isBossLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-5 py-20 text-center text-sm text-black/45">
          Verificando permissões de acesso…
        </div>
      </AppShell>
    );
  }

  if (!isBoss) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-amber-100 text-amber-700 shadow-sm">
            <Lock className="size-8" aria-hidden="true" />
          </div>
          <h1 className="mt-6 font-serif text-3xl font-extrabold text-[var(--ink)]">
            Acesso Restrito ao Boss
          </h1>
          <p className="mt-3 text-sm text-black/60 leading-relaxed">
            Este painel administrativo é reservado exclusivamente para perfis com permissão Boss.
            Caso precise de acesso, solicite a inclusão ao administrador do sistema.
          </p>

          <div className="mt-8">
            <Link
              to="/grupos"
              className="inline-flex rounded-2xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-black"
            >
              ← Voltar para meus grupos
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
                <Crown className="size-3.5" aria-hidden="true" /> Boss
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-black/40">
                Visão Geral do Sistema
              </span>
            </div>
            <h1 className="mt-2 font-serif text-4xl font-extrabold tracking-tight sm:text-5xl">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-black/60">
              Acompanhamento de todos os grupos cadastrados, integrantes e acessos na plataforma.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => dashboardQuery.refetch()}
              disabled={dashboardQuery.isFetching}
              className="rounded-2xl border border-black/10 bg-white px-5 py-2.5 text-sm font-bold shadow-sm transition hover:bg-black/5 disabled:opacity-50"
            >
              {dashboardQuery.isFetching ? "Atualizando…" : "Atualizar dados"}
            </button>
          </div>
        </div>

        {/* Métricas Principais */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_30px_rgba(42,35,28,.04)]">
            <div className="flex items-center justify-between text-black/40">
              <span className="text-xs font-bold uppercase tracking-[0.12em]">Total de Grupos</span>
              <Users className="size-5 text-[var(--tomato)]" aria-hidden="true" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-[var(--ink)]">{totalGroups}</p>
            <p className="mt-1 text-xs text-black/45">Espaços de almoço ativos</p>
          </div>

          <div className="rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_30px_rgba(42,35,28,.04)]">
            <div className="flex items-center justify-between text-black/40">
              <span className="text-xs font-bold uppercase tracking-[0.12em]">Pessoas Cadastradas</span>
              <UserCheck className="size-5 text-[var(--sage)]" aria-hidden="true" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-[var(--ink)]">{totalUsers}</p>
            <p className="mt-1 text-xs text-black/45">Perfis únicos registrados</p>
          </div>

          <div className="rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_30px_rgba(42,35,28,.04)]">
            <div className="flex items-center justify-between text-black/40">
              <span className="text-xs font-bold uppercase tracking-[0.12em]">Média por Grupo</span>
              <TrendingUp className="size-5 text-indigo-600" aria-hidden="true" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-[var(--ink)]">{avgMembers}</p>
            <p className="mt-1 text-xs text-black/45">Integrantes por comunidade</p>
          </div>

          <div className="rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_30px_rgba(42,35,28,.04)]">
            <div className="flex items-center justify-between text-black/40">
              <span className="text-xs font-bold uppercase tracking-[0.12em]">Usuários Ativos</span>
              <Clock className="size-5 text-amber-600" aria-hidden="true" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-[var(--ink)]">{activeUsersCount}</p>
            <p className="mt-1 text-xs text-black/45">Com histórico de acesso</p>
          </div>
        </div>

        {/* Seletor de Abas */}
        <div className="mt-10 border-b border-black/10">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("groups")}
              className={`flex items-center gap-2 border-b-2 pb-4 text-base font-extrabold transition ${
                activeTab === "groups"
                  ? "border-[var(--tomato)] text-[var(--tomato-dark)]"
                  : "border-transparent text-black/45 hover:text-black/80"
              }`}
            >
              <Users className="size-4" aria-hidden="true" />
              Grupos ({filteredGroups.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 border-b-2 pb-4 text-base font-extrabold transition ${
                activeTab === "users"
                  ? "border-[var(--tomato)] text-[var(--tomato-dark)]"
                  : "border-transparent text-black/45 hover:text-black/80"
              }`}
            >
              <UserCheck className="size-4" aria-hidden="true" />
              Pessoas Cadastradas ({filteredUsers.length})
            </button>
          </div>
        </div>

        {/* Conteúdo da Aba Grupos */}
        {activeTab === "groups" && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-black/35" />
                <input
                  type="text"
                  placeholder="Buscar grupo ou proprietário…"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[var(--tomato)]"
                />
              </div>
              <p className="text-xs text-black/45">
                Exibindo {filteredGroups.length} de {data?.groups.length ?? 0} grupos
              </p>
            </div>

            <div className="overflow-x-auto rounded-[28px] border border-black/8 bg-white shadow-[0_18px_60px_rgba(42,35,28,.05)]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/7 bg-[var(--cream)]/60 text-xs font-bold uppercase tracking-[0.08em] text-black/55">
                    <th scope="col" className="px-6 py-4">Grupo</th>
                    <th scope="col" className="px-6 py-4">Proprietário</th>
                    <th scope="col" className="px-6 py-4 text-center">Integrantes</th>
                    <th scope="col" className="px-6 py-4">Fuso Horário</th>
                    <th scope="col" className="px-6 py-4">Criado em</th>
                    <th scope="col" className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6">
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-black/45">
                        Nenhum grupo encontrado para a busca.
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((group) => (
                      <tr key={group.id} className="hover:bg-black/[0.015] transition">
                        <td className="px-6 py-4 font-bold">
                          <Link
                            to="/g/$groupSlug/hoje"
                            params={{ groupSlug: group.slug }}
                            className="font-extrabold text-[var(--ink)] hover:text-[var(--tomato)]"
                          >
                            {group.name}
                          </Link>
                          <span className="block font-mono text-xs font-normal text-black/40">
                            /{group.slug}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="block font-semibold text-black/80">{group.ownerName}</span>
                          <span className="block text-xs text-black/40">{group.ownerEmail}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center rounded-full bg-[var(--blush)] px-3 py-1 font-mono text-xs font-extrabold text-[var(--tomato-dark)]">
                            {group.membersCount} {group.membersCount === 1 ? "pessoa" : "pessoas"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-black/55">
                          {group.timezone}
                        </td>
                        <td className="px-6 py-4 text-xs text-black/50">
                          {formatDateShort(group.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to="/g/$groupSlug/hoje"
                            params={{ groupSlug: group.slug }}
                            className="inline-flex rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-black/70 hover:bg-[var(--blush)] hover:text-[var(--tomato-dark)] transition"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba Usuários */}
        {activeTab === "users" && (
          <div className="mt-6 space-y-4">
            {actionNotice && (
              <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-900">
                <span>{actionNotice}</span>
                <button
                  type="button"
                  onClick={() => setActionNotice(null)}
                  className="text-amber-800 hover:text-amber-950 font-bold ml-2"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-black/35" />
                <input
                  type="text"
                  placeholder="Buscar usuário por nome ou email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[var(--tomato)]"
                />
              </div>
              <p className="text-xs text-black/45">
                Exibindo {filteredUsers.length} de {data?.users.length ?? 0} pessoas
              </p>
            </div>

            <div className="overflow-x-auto rounded-[28px] border border-black/8 bg-white shadow-[0_18px_60px_rgba(42,35,28,.05)]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/7 bg-[var(--cream)]/60 text-xs font-bold uppercase tracking-[0.08em] text-black/55">
                    <th scope="col" className="px-6 py-4">Pessoa</th>
                    <th scope="col" className="px-6 py-4">E-mail</th>
                    <th scope="col" className="px-6 py-4 text-center">Grupos Inscritos</th>
                    <th scope="col" className="px-6 py-4">Último Acesso ao Site</th>
                    <th scope="col" className="px-6 py-4">Data de Cadastro</th>
                    <th scope="col" className="px-6 py-4 text-right">Gerenciar Papel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-black/45">
                        Nenhuma pessoa encontrada para a busca.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelf = user.id === currentUser?.id;

                      return (
                        <tr key={user.id} className="hover:bg-black/[0.015] transition">
                          <td className="px-6 py-4 font-bold">
                            <div className="flex items-center gap-2.5">
                              <span className="grid size-8 place-items-center rounded-full bg-[var(--peach)] text-xs font-extrabold text-[var(--tomato-dark)]">
                                {user.name.slice(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <span className="block font-extrabold text-[var(--ink)]">
                                  {user.name} {isSelf && "(você)"}
                                </span>
                                {user.isBoss && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                                    <Crown className="size-2.5" /> Boss
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-black/60">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-extrabold text-slate-800">
                              {user.groupsCount} {user.groupsCount === 1 ? "grupo" : "grupos"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-black/70">
                            {formatDate(user.lastSignInAt)}
                          </td>
                          <td className="px-6 py-4 text-xs text-black/45">
                            {formatDateShort(user.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {user.isBoss ? (
                              isSelf ? (
                                <span className="text-[11px] font-semibold text-black/40 italic">
                                  Sua conta
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={setBossMutation.isPending}
                                  onClick={() =>
                                    setBossMutation.mutate({ userId: user.id, makeBoss: false })
                                  }
                                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                                >
                                  Remover Boss
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                disabled={setBossMutation.isPending}
                                onClick={() =>
                                  setBossMutation.mutate({ userId: user.id, makeBoss: true })
                                }
                                className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition disabled:opacity-50"
                              >
                                <Crown className="size-3 text-amber-600" /> Tornar Boss
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
