import * as React from 'react';
import { cn } from '@/lib/format';

export const Tabela = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
  ),
);
Tabela.displayName = 'Tabela';

export const CorpoTabela = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn('trilho-zebra', className)} {...props} />,
);
CorpoTabela.displayName = 'CorpoTabela';

export const CabecalhoTabela = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('sticky top-0 z-10 bg-[var(--marca)] text-white', className)}
    {...props}
  />
));
CabecalhoTabela.displayName = 'CabecalhoTabela';

export const LinhaTabela = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-[var(--borda)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--marca)_6%,transparent)]',
        className,
      )}
      {...props}
    />
  ),
);
LinhaTabela.displayName = 'LinhaTabela';

export const CabecalhoCelula = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-9 whitespace-nowrap px-3 text-left align-middle text-[11.5px] font-semibold uppercase tracking-wide text-white/90',
        className,
      )}
      {...props}
    />
  ),
);
CabecalhoCelula.displayName = 'CabecalhoCelula';

export const Celula = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('px-3 py-2.5 align-middle text-[13px]', className)} {...props} />
  ),
);
Celula.displayName = 'Celula';
