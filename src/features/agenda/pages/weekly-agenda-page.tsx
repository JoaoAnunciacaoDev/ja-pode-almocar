import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/shared/components/app-shell";

const initialRows = [
  { meal: "☕ Desjejum", values: ["—", "08:00", "—", "08:10", "—"] },
  { meal: "🍛 Almoço", values: ["12:00", "11:30", "12:30", "—", "12:00"] },
  { meal: "🌙 Jantar", values: ["—", "18:00", "17:30", "18:00", "—"] },
];

const timeOptions = ["—", "08:00", "08:10", "11:30", "12:00", "12:30", "17:30", "18:00"];

export function WeeklyAgendaPage() {
  const [rows, setRows] = useState(() => {
    try {
      const stored = localStorage.getItem("weekly-agenda-demo");
      return stored ? (JSON.parse(stored) as typeof initialRows) : initialRows;
    } catch {
      return initialRows;
    }
  });
  const [saved, setSaved] = useState(false);

  function cycleTime(rowIndex: number, columnIndex: number) {
    setSaved(false);
    setRows((currentRows) => currentRows.map((row, currentRowIndex) => {
      if (currentRowIndex !== rowIndex) return row;
      const currentValue = row.values[columnIndex];
      const nextValue = timeOptions[(timeOptions.indexOf(currentValue) + 1) % timeOptions.length];
      return { ...row, values: row.values.map((value, currentColumnIndex) => currentColumnIndex === columnIndex ? nextValue : value) };
    }));
  }

  function saveWeek() {
    localStorage.setItem("weekly-agenda-demo", JSON.stringify(rows));
    setSaved(true);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/" className="text-sm font-bold text-[var(--tomato)]">← Voltar para hoje</Link>
        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Planejamento</p><h1 className="mt-2 font-serif text-4xl font-bold">Minha semana</h1></div>
          <button type="button" onClick={saveWeek} className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white">Salvar alterações</button>
        </div>
        {saved && <p role="status" className="mt-5 rounded-2xl bg-[var(--sage)] px-4 py-3 text-sm font-semibold text-white">✓ Alterações salvas localmente neste protótipo.</p>}
        <p className="mt-5 text-sm text-black/50">Clique em um horário para alterá-lo. As opções percorrem os horários mais comuns e “—” indica que você não irá.</p>
        <div className="mt-8 overflow-x-auto rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_18px_60px_rgba(42,35,28,.07)]">
          <div className="grid min-w-[680px] grid-cols-[160px_repeat(5,1fr)] gap-2">
            <div />
            {['SEG 14', 'TER 15', 'QUA 16', 'QUI 17', 'SEX 18'].map((day) => <div key={day} className="rounded-xl bg-[var(--cream)] px-3 py-3 text-center text-xs font-extrabold">{day}</div>)}
            {rows.flatMap((row, rowIndex) => [
              <div key={`${row.meal}-label`} className="flex items-center font-bold">{row.meal}</div>,
              ...row.values.map((value, index) => <button type="button" onClick={() => cycleTime(rowIndex, index)} key={`${row.meal}-${index}`} aria-label={`${row.meal}, alterar horário de ${value}`} className="rounded-xl border border-black/8 px-3 py-4 font-mono text-sm font-bold hover:border-[var(--tomato)] hover:bg-[var(--blush)]">{value}</button>),
            ])}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
