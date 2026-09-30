import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/format';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border border-[var(--borda)] bg-[var(--superficie)] shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardCabecalho({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5', className)} {...props} />;
}

export function CardTitulo({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[15px] font-semibold leading-tight tracking-tight text-[var(--texto)]', className)} {...props} />;
}

export function CardDescricao({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[13px] leading-snug text-[var(--texto-suave)]', className)} {...props} />;
}

export function CardConteudo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-0 sm:p-5 sm:pt-0', className)} {...props} />;
}

export function CardRodape({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 border-t border-[var(--borda)] p-4 sm:p-5', className)} {...props} />;
}

/** Faixa de cabeçalho com a cor da marca. */
export function CardFaixa({ cor = 'var(--marca)' }: { cor?: string }) {
  return <div className="h-1 w-full rounded-t-xl" style={{ background: cor }} />;
}
