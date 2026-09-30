import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/format';

/* ================================ Abas =================================== */

export const Abas = TabsPrimitive.Root;

type PropsListaAbas = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  value?: string;
  onValueChange?: (valor: string) => void;
};

export const ListaAbas = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  PropsListaAbas
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('sem-barra flex w-full gap-1 overflow-x-auto border-b border-[var(--borda)]', className)}
    {...props}
  />
));
ListaAbas.displayName = 'ListaAbas';

export const Aba = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative shrink-0 whitespace-nowrap px-3 py-2.5 text-[13px] font-medium text-[var(--texto-suave)] transition-colors duration-150',
      'hover:text-[var(--texto)] data-[state=active]:text-[var(--marca)] dark:data-[state=active]:text-[var(--destaque)]',
      'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent after:transition-colors',
      'data-[state=active]:after:bg-[var(--marca)] dark:data-[state=active]:after:bg-[var(--destaque)]',
      className,
    )}
    {...props}
  />
));
Aba.displayName = 'Aba';

export const PainelAba = TabsPrimitive.Content;

/* ============================== Dica (tooltip) ============================ */

export const ProvedorDica = TooltipPrimitive.Provider;

export const Dica = TooltipPrimitive.Root;
export const GatilhoDica = TooltipPrimitive.Trigger;

export const ConteudoDica = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 max-w-[16rem] rounded-md border border-[var(--borda)] bg-[var(--superficie-inversa)] px-2.5 py-1.5 text-[12px] leading-snug text-[var(--fundo)] shadow-[var(--shadow-pop)]',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
ConteudoDica.displayName = 'ConteudoDica';

/* ============================== Menu suspenso ============================ */

export const Menu = DropdownPrimitive.Root;
export const GatilhoMenu = DropdownPrimitive.Trigger;

export const ConteudoMenu = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, sideOffset = 6, align = 'end', ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        'z-50 min-w-[11rem] overflow-hidden rounded-lg border border-[var(--borda)] bg-[var(--superficie)] p-1 text-[var(--texto)] shadow-[var(--shadow-pop)]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </DropdownPrimitive.Portal>
));
ConteudoMenu.displayName = 'ConteudoMenu';

export const ItemMenu = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { destrutivo?: boolean }
>(({ className, destrutivo, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={cn(
      'flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none transition-colors',
      'focus:bg-[var(--acento)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0',
      destrutivo ? 'text-[var(--alerta)] focus:bg-[var(--alerta-suave)]' : '',
      className,
    )}
    {...props}
  />
));
ItemMenu.displayName = 'ItemMenu';

export const SeparadorMenu = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-[var(--borda)]', className)} {...props} />
));
SeparadorMenu.displayName = 'SeparadorMenu';

export const RotuloMenu = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]', className)}
    {...props}
  />
));
RotuloMenu.displayName = 'RotuloMenu';

export const AtalhoMenu = ({ children }: { children: React.ReactNode }) => (
  <span className="ml-auto text-[11px] tracking-widest text-[var(--texto-tenue)]">{children}</span>
);

/* ================================ Popover ================================= */

export const Popover = PopoverPrimitive.Root;
export const GatilhoPopover = PopoverPrimitive.Trigger;
export const FecharPopover = PopoverPrimitive.Close;

export const ConteudoPopover = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-lg border border-[var(--borda)] bg-[var(--superficie)] p-3 text-[var(--texto)] shadow-[var(--shadow-pop)] outline-none',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
ConteudoPopover.displayName = 'ConteudoPopover';

/* ================================ Interruptor ============================= */

export const Interruptor = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--anel)_35%,transparent)]',
      'data-[state=checked]:bg-[var(--marca)] data-[state=unchecked]:bg-[var(--borda-forte)]',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
));
Interruptor.displayName = 'Interruptor';

/* ================================ Progresso ============================== */

export const Progresso = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { cor?: string }
>(({ className, value, cor, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-[var(--acento)]', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 rounded-full transition-transform duration-500 ease-out"
      style={{
        transform: `translateX(-${100 - Math.min(100, Math.max(0, value ?? 0))}%)`,
        background: cor ?? 'var(--marca)',
      }}
    />
  </ProgressPrimitive.Root>
));
Progresso.displayName = 'Progresso';

/* ================================ Deslizante ============================= */

export const Deslizante = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[var(--acento)]">
      <SliderPrimitive.Range className="absolute h-full bg-[var(--marca)]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block size-4 rounded-full border-2 border-[var(--marca)] bg-[var(--superficie)] shadow transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--anel)_35%,transparent)]" />
  </SliderPrimitive.Root>
));
Deslizante.displayName = 'Deslizante';

/* ================================ Separador =============================== */

export const Separador = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn('shrink-0 bg-[var(--borda)]', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
    {...props}
  />
));
Separador.displayName = 'Separador';
