export function SiteFooter() {
  return (
    <footer className="border-t border-black/8 bg-white/70 px-5 py-5 text-[var(--ink)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center text-sm text-black/55 sm:flex-row sm:text-left">
        <p>Feito por <span className="font-bold text-[var(--ink)]">João Victor Anunciação da Silva</span></p>
        <div className="flex items-center gap-2">
          <a href="https://github.com/JoaoAnunciacaoDev" target="_blank" rel="noreferrer" aria-label="GitHub de João Victor" className="grid size-10 place-items-center rounded-full transition hover:bg-black/7 hover:text-black">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.24.7-3.92-1.38-3.92-1.38-.53-1.35-1.3-1.71-1.3-1.71-1.06-.73.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.75.41-1.27.74-1.56-2.58-.3-5.3-1.29-5.3-5.69 0-1.26.45-2.28 1.2-3.09-.12-.29-.52-1.47.11-3.05 0 0 .98-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.75.81 1.2 1.83 1.2 3.09 0 4.41-2.72 5.39-5.31 5.68.42.36.79 1.07.79 2.16v3.21c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" /></svg>
          </a>
          <a href="https://www.linkedin.com/in/joao-victor-anunciacao/" target="_blank" rel="noreferrer" aria-label="LinkedIn de João Victor" className="grid size-10 place-items-center rounded-full transition hover:bg-[#0a66c2]/10 hover:text-[#0a66c2]">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.41v1.57h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.04H3.54V8.98H7.1v11.47ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z" /></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

