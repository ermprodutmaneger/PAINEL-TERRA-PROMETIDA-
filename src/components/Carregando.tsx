import { Sprout } from 'lucide-react';

/** Tela de abertura — mostra a marca enquanto o IndexedDB é lido. */
export function Carregando() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="grid size-14 place-items-center rounded-xl bg-[var(--marca)]">
            <Sprout className="size-7 text-[var(--destaque-fundo)]" aria-hidden />
          </div>
          <span className="absolute -inset-2 -z-10 animate-ping rounded-2xl bg-[var(--marca)]/20" aria-hidden />
        </div>
        <div>
          <p className="text-[15px] font-semibold tracking-[0.16em] text-[var(--texto)]">TERRA PROMETIDA EXPRESS</p>
          <p className="mt-1 text-[13px] text-[var(--texto-suave)]">Preparando seu painel…</p>
        </div>
      </div>
    </div>
  );
}
