import { useEffect, useId } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  tone?: "default" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel, pending = false, tone = "default", onCancel, onConfirm }: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-md rounded-[28px] border border-white/20 bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.3)] sm:p-7">
        <div className={`grid size-12 place-items-center rounded-2xl text-xl ${tone === "danger" ? "bg-red-50 text-red-700" : "bg-[var(--cream)] text-[var(--tomato)]"}`} aria-hidden="true">{tone === "danger" ? "!" : "?"}</div>
        <h2 id={titleId} className="mt-5 font-serif text-2xl font-bold">{title}</h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-black/55">{description}</p>
        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={pending} onClick={onCancel} className="rounded-2xl border border-black/10 px-5 py-3 text-sm font-bold disabled:opacity-40">Cancelar</button>
          <button type="button" autoFocus disabled={pending} onClick={onConfirm} className={`rounded-2xl px-5 py-3 text-sm font-bold text-white disabled:opacity-40 ${tone === "danger" ? "bg-red-700 hover:bg-red-800" : "bg-[var(--ink)] hover:bg-black"}`}>{pending ? "Aguarde…" : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

