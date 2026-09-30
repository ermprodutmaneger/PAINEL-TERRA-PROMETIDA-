import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/format';

export const Selecao = SelectPrimitive.Root;
export const GrupoSelecao = SelectPrimitive.Group;
export const ValorSelecao = SelectPrimitive.Value;

export const GatilhoSelecao = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { tamanho?: 'sm' | 'md' }
>(({ className, children, tamanho = 'md', ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--borda-forte)] bg-[var(--superficie)] px-3 text-sm text-[var(--texto)]',
      'transition-colors duration-150 hover:bg-[var(--acento)]',
      'focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--anel)_30%,transparent)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      '[&>span]:truncate [&>span]:text-left',
      tamanho === 'sm' ? 'h-8 text-[13px]' : 'h-9',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 shrink-0 opacity-60" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
GatilhoSelecao.displayName = 'GatilhoSelecao';

export const ConteudoSelecao = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-50 max-h-[--radix-select-content-available-height] min-w-[9rem] overflow-hidden rounded-lg border border-[var(--borda)] bg-[var(--superficie)] text-[var(--texto)] shadow-[var(--shadow-pop)]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center">
        <ChevronUp className="size-4" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center">
        <ChevronDown className="size-4" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
ConteudoSelecao.displayName = 'ConteudoSelecao';

export const ItemSelecao = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-8 pr-2 text-sm outline-none',
      'focus:bg-[var(--acento)] focus:text-[var(--texto)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-3.5 text-[var(--marca)] dark:text-[var(--destaque)]" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
ItemSelecao.displayName = 'ItemSelecao';

export const SeparadorSelecao = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-[var(--borda)]', className)} {...props} />
));
SeparadorSelecao.displayName = 'SeparadorSelecao';

export const RotuloSelecao = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]', className)}
    {...props}
  />
));
RotuloSelecao.displayName = 'RotuloSelecao';
