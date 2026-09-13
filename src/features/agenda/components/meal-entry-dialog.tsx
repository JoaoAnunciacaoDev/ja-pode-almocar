import type { MealStatus, MealType } from "@/features/agenda/model/meals";

export type MealDraft = { mealType: MealType; status: MealStatus; time: string };

const mealLabels: Record<MealType, string> = { BREAKFAST: "Desjejum", LUNCH: "Almoço", DINNER: "Jantar" };
const statusOptions: Array<{ value: MealStatus; label: string; description: string }> = [
  { value: "CONFIRMED", label: "Confirmado", description: "Vou neste horário" },
  { value: "PLANNED", label: "Planejado", description: "Ainda posso mudar" },
  { value: "NOT_GOING", label: "Não vou", description: "Não participarei" },
];

type MealEntryDialogProps = {
  draft: MealDraft;
  onChange: (draft: MealDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

export function MealEntryDialog({ draft, onChange, onClose, onSave }: MealEntryDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-6" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="meal-dialog-title" className="w-full rounded-t-[28px] bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-[28px]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tomato)]">Meu horário</p><h2 id="meal-dialog-title" className="mt-1 font-serif text-2xl font-bold">Informar refeição</h2></div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-full bg-black/5 text-xl">×</button>
        </div>

        <label className="mt-6 block text-sm font-bold" htmlFor="meal-type">Refeição</label>
        <select id="meal-type" value={draft.mealType} onChange={(event) => onChange({ ...draft, mealType: event.target.value as MealType })} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[var(--tomato)]">
          {Object.entries(mealLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold">Participação</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {statusOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => onChange({ ...draft, status: option.value })} className={`rounded-2xl border px-2 py-3 text-left transition ${draft.status === option.value ? "border-[var(--tomato)] bg-[var(--blush)] text-[var(--tomato-dark)]" : "border-black/10 hover:border-black/25"}`}>
                <span className="block text-xs font-bold">{option.label}</span><span className="mt-1 block text-[10px] opacity-60">{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {draft.status !== "NOT_GOING" && (
          <div className="mt-5">
            <label className="block text-sm font-bold" htmlFor="meal-time">Horário</label>
            <input id="meal-time" type="time" required value={draft.time} onChange={(event) => onChange({ ...draft, time: event.target.value })} className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 font-mono outline-none focus:border-[var(--tomato)]" />
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-bold">Cancelar</button>
          <button type="button" onClick={onSave} disabled={draft.status !== "NOT_GOING" && !draft.time} className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Salvar</button>
        </div>
      </section>
    </div>
  );
}
