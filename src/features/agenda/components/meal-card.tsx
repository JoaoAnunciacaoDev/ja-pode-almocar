import type { DailyMeal, MealStatus } from "@/features/agenda/model/meals";

const statusLabel: Record<MealStatus, string> = { CONFIRMED: "Confirmado", PLANNED: "Planejado", NOT_GOING: "Não vai" };

export function MealCard({ meal, onEdit }: { meal: DailyMeal; onEdit: () => void }) {
  return (
    <article className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_18px_60px_rgba(42,35,28,.07)] sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--cream)] text-2xl">{meal.emoji}</span>
          <div><h2 className="text-xl font-extrabold">{meal.label}</h2><p className="text-xs text-black/45">{meal.people.length} pessoas</p></div>
        </div>
        <button type="button" onClick={onEdit} aria-label={`Editar meu horário de ${meal.label}`} className="grid size-9 place-items-center rounded-full text-xl text-black/35 hover:bg-black/5">•••</button>
      </div>
      <ul className="space-y-2">
        {meal.people.map((person) => (
          <li key={person.id} className="flex items-center justify-between rounded-2xl px-3 py-2.5 transition hover:bg-[var(--cream)]">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--peach)] text-xs font-extrabold text-[var(--tomato-dark)]">{person.name.slice(0, 2).toUpperCase()}</span>
              <div><p className="text-sm font-bold">{person.name}</p><p className="text-[11px] text-black/40">{statusLabel[person.status]}</p></div>
            </div>
            <time className="font-mono text-sm font-bold">{person.time ?? "—"}</time>
          </li>
        ))}
      </ul>
      {meal.mine ? (
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-[var(--tomato)]/15 bg-[var(--blush)] px-4 py-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--tomato-dark)]/60">Meu horário</p><p className="mt-0.5 font-mono font-extrabold text-[var(--tomato-dark)]">{meal.mine.time ?? "—"}</p></div>
          <button type="button" onClick={onEdit} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--tomato-dark)] shadow-sm transition hover:-translate-y-0.5 hover:shadow">
            {meal.mine.status === "CONFIRMED" ? "✓ " : ""}{statusLabel[meal.mine.status]} · Editar
          </button>
        </div>
      ) : (
        <button type="button" onClick={onEdit} className="mt-5 w-full rounded-2xl border border-dashed border-black/15 py-3 text-sm font-bold text-black/50 hover:border-[var(--tomato)] hover:text-[var(--tomato)]">+ Informar se vou</button>
      )}
    </article>
  );
}
