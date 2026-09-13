import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { deleteMealRoutine, fetchMealRoutines, saveMealRoutine, type MealRoutineInput } from "@/features/agenda/api/meal-routines-api";
import { mealTypes, type MealType } from "@/features/agenda/model/meals";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchGroupBySlug } from "@/features/groups/api/groups-api";
import { fetchMealWindows } from "@/features/groups/api/meal-windows-api";
import { buildTimeOptions, defaultMealWindows } from "@/features/groups/model/meal-windows";
import { AppShell } from "@/shared/components/app-shell";
import { inputClassName } from "@/shared/components/form-styles";

const weekdays = [
  { value: 1, label: "Segunda-feira" }, { value: 2, label: "Terça-feira" }, { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" }, { value: 5, label: "Sexta-feira" }, { value: 6, label: "Sábado" }, { value: 0, label: "Domingo" },
];
const mealLabels: Record<MealType, string> = { BREAKFAST: "Desjejum", LUNCH: "Almoço", DINNER: "Jantar" };

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function defaultDraft(): MealRoutineInput {
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 6);
  return { weekday: 1, mealType: "LUNCH", time: "12:00", startDate: localDate(start), endDate: localDate(end) };
}

export function MealRoutinesPage({ groupSlug }: { groupSlug: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const groupQuery = useQuery({ queryKey: ["groups", "slug", groupSlug], queryFn: () => fetchGroupBySlug(groupSlug) });
  const group = groupQuery.data;
  const windowsQuery = useQuery({ queryKey: ["meal-windows", group?.id], queryFn: () => fetchMealWindows(group!.id), enabled: Boolean(group) });
  const routinesQuery = useQuery({ queryKey: ["meal-routines", group?.id, user?.id], queryFn: () => fetchMealRoutines(group!.id, user!.id), enabled: Boolean(group && user) });
  const [draft, setDraft] = useState<MealRoutineInput>(defaultDraft);
  const windows = windowsQuery.data ?? defaultMealWindows;
  const selectedWindow = windows.find((window) => window.mealType === draft.mealType) ?? windows[0];
  const timeOptions = buildTimeOptions(selectedWindow);
  const selectedTime = timeOptions.includes(draft.time) ? draft.time : timeOptions[0];
  const saveMutation = useMutation({
    mutationFn: () => saveMealRoutine(group!.id, user!.id, { ...draft, time: selectedTime }),
    onSuccess: async () => {
      setDraft(defaultDraft());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["meal-routines", group?.id, user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["weekly-agenda", group?.id] }),
        queryClient.invalidateQueries({ queryKey: ["daily-agenda", group?.id] }),
      ]);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMealRoutine,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["meal-routines", group?.id, user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["weekly-agenda", group?.id] }),
        queryClient.invalidateQueries({ queryKey: ["daily-agenda", group?.id] }),
      ]);
    },
  });

  function changeMealType(mealType: MealType) {
    const window = windows.find((item) => item.mealType === mealType) ?? windows[0];
    setDraft({ ...draft, mealType, time: buildTimeOptions(window)[0] });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    saveMutation.mutate();
  }

  if (groupQuery.isLoading) return <AppShell groupSlug={groupSlug}><div className="mx-auto max-w-6xl px-5 py-16 text-center text-sm text-black/45">Carregando rotinas…</div></AppShell>;
  if (!group || groupQuery.error) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="font-serif text-3xl font-bold">Grupo não encontrado</h1><Link to="/grupos" className="mt-6 inline-block font-bold text-[var(--tomato)]">Ver meus grupos</Link></div></AppShell>;

  return (
    <AppShell groupSlug={group.slug}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/g/$groupSlug/agenda" params={{ groupSlug: group.slug }} className="text-sm font-bold text-[var(--tomato)]">← Voltar para minha semana</Link>
        <div className="mt-6"><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">{group.name}</p><h1 className="mt-2 font-serif text-4xl font-bold">Minhas rotinas</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Defina horários recorrentes por dia da semana. Uma alteração feita diretamente em uma data da agenda continua tendo prioridade sobre a rotina.</p></div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <form onSubmit={submit} className="h-fit rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(42,35,28,.07)]">
            <h2 className="text-xl font-extrabold">{draft.id ? "Editar rotina" : "Nova rotina"}</h2>
            <label className="mt-5 block text-sm font-bold">Dia da semana<select value={draft.weekday} onChange={(event) => setDraft({ ...draft, weekday: Number(event.target.value) })} className={inputClassName}>{weekdays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
            <label className="mt-5 block text-sm font-bold">Refeição<select value={draft.mealType} onChange={(event) => changeMealType(event.target.value as MealType)} className={inputClassName}>{mealTypes.map((mealType) => <option key={mealType} value={mealType}>{mealLabels[mealType]}</option>)}</select></label>
            <label className="mt-5 block text-sm font-bold">Horário<select value={selectedTime} onChange={(event) => setDraft({ ...draft, time: event.target.value })} className={inputClassName}>{timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
            <div className="mt-5 grid grid-cols-2 gap-3"><label className="text-sm font-bold">Início<input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} className={inputClassName} required /></label><label className="text-sm font-bold">Fim<input type="date" min={draft.startDate} value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} className={inputClassName} required /></label></div>
            {draft.endDate < draft.startDate && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">A data final deve ser igual ou posterior à inicial.</p>}
            {saveMutation.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{saveMutation.error.message}</p>}
            {saveMutation.isSuccess && <p role="status" className="mt-4 rounded-xl bg-[var(--sage)] p-3 text-sm font-semibold text-white">✓ Rotina salva.</p>}
            <div className="mt-6 flex gap-2"><button disabled={saveMutation.isPending || draft.endDate < draft.startDate} className="flex-1 rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{saveMutation.isPending ? "Salvando…" : draft.id ? "Salvar rotina" : "Criar rotina"}</button>{draft.id && <button type="button" onClick={() => setDraft(defaultDraft())} className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-bold">Cancelar</button>}</div>
          </form>

          <section>
            <div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-black/40">Planejamento recorrente</p><h2 className="mt-1 text-2xl font-bold">Rotinas cadastradas</h2></div><span className="text-sm text-black/40">{routinesQuery.data?.length ?? 0}</span></div>
            {routinesQuery.isLoading && <div className="mt-5 rounded-[24px] bg-white p-8 text-center text-sm text-black/45">Carregando…</div>}
            {routinesQuery.error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{routinesQuery.error.message}</p>}
            {deleteMutation.error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{deleteMutation.error.message}</p>}
            {!routinesQuery.isLoading && !routinesQuery.data?.length && <div className="mt-5 rounded-[24px] border border-dashed border-black/15 bg-white/50 p-8 text-center"><p className="text-3xl">🗓️</p><p className="mt-3 font-bold">Nenhuma rotina cadastrada</p><p className="mt-1 text-sm text-black/45">Use o formulário para criar seu primeiro horário recorrente.</p></div>}
            <div className="mt-5 space-y-3">{routinesQuery.data?.map((routine) => <article key={routine.id} className="flex flex-col justify-between gap-4 rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_12px_35px_rgba(42,35,28,.05)] sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold">{weekdays.find((day) => day.value === routine.weekday)?.label}</span><span className="rounded-full bg-[var(--blush)] px-2.5 py-1 text-xs font-bold text-[var(--tomato-dark)]">{mealLabels[routine.mealType]}</span><span className="font-mono text-sm font-bold">{routine.time}</span></div><p className="mt-2 text-xs text-black/40">De {new Date(`${routine.startDate}T12:00:00`).toLocaleDateString("pt-BR")} até {new Date(`${routine.endDate}T12:00:00`).toLocaleDateString("pt-BR")}</p></div><div className="flex gap-2"><button type="button" onClick={() => { saveMutation.reset(); setDraft(routine); }} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold">Editar</button><button type="button" disabled={deleteMutation.isPending} onClick={() => { if (window.confirm("Excluir esta rotina? As exceções já salvas continuarão na agenda.")) deleteMutation.mutate(routine.id); }} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">Excluir</button></div></article>)}</div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
