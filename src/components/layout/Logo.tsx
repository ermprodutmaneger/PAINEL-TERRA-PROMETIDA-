import { cn } from '@/lib/format';

export function Logo({
  tamanho = 'md',
  comNome = true,
  className,
}: {
  tamanho?: 'sm' | 'md' | 'lg';
  comNome?: boolean;
  className?: string;
}) {
  const caixa = tamanho === 'sm' ? 'size-7' : tamanho === 'lg' ? 'size-11' : 'size-9';
  const fonte = tamanho === 'sm' ? 'text-[12px]' : tamanho === 'lg' ? 'text-[17px]' : 'text-[14px]';
  const sub = tamanho === 'sm' ? 'text-[8px]' : 'text-[9px]';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn('grid shrink-0 place-items-center rounded-lg', caixa)}
        style={{ background: 'var(--marca)' }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="size-[58%]" fill="none" stroke="#F5C65B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21v-8" />
          <path d="M12 13c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6Z" fill="rgba(245,198,91,0.25)" />
          <path d="M12 13c0-3.9 3.1-7 7-7 0 3.9-3.1 7-7 7Z" fill="rgba(245,198,91,0.18)" />
        </svg>
      </span>
      {comNome && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className={cn('font-semibold tracking-[0.14em] text-[var(--texto)]', fonte)}>
            TERRA PROMETIDA
          </span>
          <span className={cn('mt-1 font-medium tracking-[0.34em] text-[var(--destaque)]', sub)}>EXPRESS</span>
        </span>
      )}
    </div>
  );
}
