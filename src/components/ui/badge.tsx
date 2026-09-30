import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/format';

const variantes = cva(
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] font-medium leading-4 transition-colors [&_svg]:size-3',
  {
    variants: {
      tom: {
        neutro: 'border-[var(--borda)] bg-[var(--acento)] text-[var(--texto-suave)]',
        terra: 'border-[color-mix(in_srgb,#2F5D3A_35%,transparent)] bg-[color-mix(in_srgb,#2F5D3A_12%,transparent)] text-[var(--marca)] dark:text-[#8FC098]',
        mostarda: 'border-[color-mix(in_srgb,#E3A21C_40%,transparent)] bg-[color-mix(in_srgb,#E3A21C_16%,transparent)] text-[#8A6108] dark:text-[#F5C65B]',
        terracota: 'border-[color-mix(in_srgb,#B5553A_35%,transparent)] bg-[color-mix(in_srgb,#B5553A_12%,transparent)] text-[var(--alerta)]',
        positivo: 'border-[color-mix(in_srgb,#6E9B78_40%,transparent)] bg-[color-mix(in_srgb,#6E9B78_16%,transparent)] text-[var(--sucesso)]',
        destaque: 'border-transparent bg-[var(--marca)] text-white',
        cinza: 'border-transparent bg-[var(--superficie-inversa)] text-[var(--fundo)]',
        solido: 'border-transparent bg-[var(--destaque-fundo)] text-[#2a2109]',
      },
      tamanho: {
        sm: 'text-[10.5px] px-1.5 py-0',
        md: '',
      },
    },
    defaultVariants: { tom: 'neutro', tamanho: 'md' },
  },
);

export interface SeloProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof variantes> {}

export function Selo({ className, tom, tamanho, ...props }: SeloProps) {
  return <span className={cn(variantes({ tom, tamanho }), className)} {...props} />;
}

export function Ponto({ cor = 'currentColor', className }: { cor?: string; className?: string }) {
  return <span className={cn('inline-block size-1.5 shrink-0 rounded-full', className)} style={{ background: cor }} />;
}

/* --------------------------- Esqueleto (skeleton) ------------------------ */

export function Esqueleto({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[color-mix(in_srgb,var(--texto-tenue)_22%,transparent)]', className)}
      {...props}
    />
  );
}

export function EsqueletoTabela({ linhas = 6, colunas = 5 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: colunas }).map((__, j) => (
            <Esqueleto key={j} className={cn('h-8', j === 0 ? 'w-1/3' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}
