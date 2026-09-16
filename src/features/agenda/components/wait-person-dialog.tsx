import { Users } from "lucide-react";

import type { MealOccurrence } from "@/features/agenda/model/meals";

type WaitPersonDialogProps = {
  person: MealOccurrence;
  currentTime: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function WaitPersonDialog({ person, currentTime, onCancel, onConfirm }: WaitPersonDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-6" onMouseDown={onCancel}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="wait-dialog-title" className="w-full rounded-t-[28px] bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-[28px]" onMouseDown={(event) => event.stopPropagation()}>
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--blush)] text-[var(--tomato-dark)]"><Users aria-hidden="true" className="size-6" /></span>
        <h2 id="wait-dialog-title" className="mt-5 font-serif text-2xl font-bold">Esperar por {person.name}?</h2>
        <p className="mt-3 text-sm leading-6 text-black/55">
          {currentTime ? `Seu horário de ${currentTime} será removido. ` : ""}
          Na agenda aparecerá apenas que você está aguardando {person.name}.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-bold">Cancelar</button>
          <button type="button" onClick={onConfirm} className="rounded-2xl bg-[var(--tomato)] px-4 py-3 text-sm font-bold text-white">Sim, vou esperar</button>
        </div>
      </section>
    </div>
  );
}
