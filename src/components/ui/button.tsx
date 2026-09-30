import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/format';

const variantes = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,color,box-shadow,transform] duration-150 select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[.98] [&_svg]:shrink-0',
  {
    variants: {
      variante: {
        principal:
          'bg-[var(--marca)] text-white shadow-sm hover:brightness-110 dark:bg-[var(--marca)]',
        destaque:
          'bg-[var(--destaque-fundo)] text-[#2a2109] shadow-sm hover:brightness-105',
        contorno:
          'border border-[var(--borda-forte)] bg-[var(--superficie)] text-[var(--texto)] hover:bg-[var(--acento)]',
        fantasma: 'text-[var(--texto-suave)] hover:bg-[var(--acento)] hover:text-[var(--texto)]',
        perigo: 'bg-[var(--alerta)] text-white shadow-sm hover:brightness-110',
        perigoSuave: 'bg-[var(--alerta-suave)] text-[var(--alerta)] hover:brightness-95 dark:hover:brightness-125',
        link: 'text-[var(--marca)] underline-offset-4 hover:underline dark:text-[var(--destaque)]',
        sucesso: 'bg-[var(--sucesso)] text-white shadow-sm hover:brightness-110',
      },
      tamanho: {
        sm: 'h-8 px-3 text-[13px] [&_svg]:size-3.5',
        md: 'h-9 px-4 text-sm [&_svg]:size-4',
        lg: 'h-11 px-5 text-[15px] [&_svg]:size-[18px]',
        icone: 'size-9 [&_svg]:size-4',
        iconeSm: 'size-8 [&_svg]:size-3.5',
        iconeXs: 'size-7 rounded-md [&_svg]:size-3.5',
      },
    },
    defaultVariants: { variante: 'principal', tamanho: 'md' },
  },
);

export interface BotaoProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variantes> {
  asChild?: boolean;
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(
  ({ className, variante, tamanho, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    // `data-tamanho` permite aumentar a área de toque em iPad/iPhone por CSS
    return (
      <Comp
        ref={ref}
        data-tamanho={tamanho}
        className={cn(variantes({ variante, tamanho }), className)}
        {...props}
      />
    );
  },
);
Botao.displayName = 'Botao';
