import type { MealStatus, MealType } from "@/features/agenda/model/meals";
import { buildTimeOptions, isTimeWithinWindow, type MealWindow } from "@/features/groups/model/meal-windows";

export type MealDraft = { mealType: MealType; status: MealStatus; time: string };

const mealLabels: Record<MealType, string> = { BREAKFAST: "Desjejum", LUNCH: "Almoço", DINNER: "Jantar" };
const statusOptions: Array<{ value: MealStatus; label: string; description: string }> = [
  { value: "CONFIRMED", label: "Confirmado", description: "Vou neste horário" },
  { value: "PLANNED", label: "Planejado", description: "Ainda posso mudar" },
  { value: "NOT_GOING", label: "Não vou", description: "Não participarei" },
];

type MealEntryDialogProps = {
  draft: MealDraft;
  mealWindow: MealWindow;
  onChange: (draft: MealDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

export function MealEntryDialog({ draft, mealWindow, onChange, onClose, onSave }: MealEntryDialogProps) {
  const hasValidTime = draft.status === "NOT_GOING" || isTimeWithinWindow(draft.time, mealWindow);
  const timeOptions = buildTimeOptions(mealWindow);
  const selectedTimeIndex = Math.max(0, timeOptions.indexOf(draft.time));

  function moveTime(direction: -1 | 1) {
    const nextIndex = Math.min(timeOptions.length - 1, Math.max(0, selectedTimeIndex + direction));
    onChange({ ...draft, time: timeOptions[nextIndex] });
  }

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
            <p className="block text-sm font-bold">Horário</p>
            <div className="mt-2 grid grid-cols-[52px_1fr_52px] items-center gap-2">
              <button type="button" onClick={() => moveTime(-1)} disabled={selectedTimeIndex === 0} aria-label={`Diminuir ${mealWindow.intervalMinutes} minutos`} className="grid size-13 place-items-center rounded-2xl border border-black/10 text-2xl font-bold disabled:cursor-not-allowed disabled:opacity-25">−</button>
              <output aria-live="polite" className="rounded-2xl border border-black/10 bg-[var(--cream)] px-4 py-3 text-center font-mono text-xl font-extrabold">{timeOptions[selectedTimeIndex]}</output>
              <button type="button" onClick={() => moveTime(1)} disabled={selectedTimeIndex === timeOptions.length - 1} aria-label={`Aumentar ${mealWindow.intervalMinutes} minutos`} className="grid size-13 place-items-center rounded-2xl border border-black/10 text-2xl font-bold disabled:cursor-not-allowed disabled:opacity-25">+</button>
            </div>
            <p className={`mt-2 text-xs ${hasValidTime ? "text-black/45" : "font-semibold text-red-600"}`}>
              Permitido pelo grupo: {mealWindow.openTime}–{mealWindow.closeTime}, a cada {mealWindow.intervalMinutes} minutos.
            </p>
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-bold">Cancelar</button>
          <button type="button" onClick={onSave} disabled={!hasValidTime} className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Salvar</button>
        </div>
      </section>
    </div>
  );
}
