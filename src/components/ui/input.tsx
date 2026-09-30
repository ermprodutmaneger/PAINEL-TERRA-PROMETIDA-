import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '@/lib/format';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-[13px] font-medium leading-none text-[var(--texto)] peer-disabled:opacity-60',
      className,
    )}
    {...props}
  />
));
Label.displayName = 'Label';

export const CampoTexto = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border border-[var(--borda-forte)] bg-[var(--superficie)] px-3 py-1 text-sm text-[var(--texto)]',
        'placeholder:text-[var(--texto-tenue)] transition-colors duration-150',
        'focus-visible:outline-none focus-visible:border-[var(--anel)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--anel)_25%,transparent)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-[var(--alerta)] aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-[var(--alerta)]',
        className,
      )}
      {...props}
    />
  ),
);
CampoTexto.displayName = 'CampoTexto';

export const AreaTexto = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[72px] w-full rounded-lg border border-[var(--borda-forte)] bg-[var(--superficie)] px-3 py-2 text-sm text-[var(--texto)]',
      'placeholder:text-[var(--texto-tenue)] transition-colors duration-150',
      'focus-visible:outline-none focus-visible:border-[var(--anel)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--anel)_25%,transparent)]',
      'aria-[invalid=true]:border-[var(--alerta)]',
      className,
    )}
    {...props}
  />
));
AreaTexto.displayName = 'AreaTexto';

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer size-4 shrink-0 rounded border border-[var(--borda-forte)] bg-[var(--superficie)] shadow-sm transition-colors',
      'data-[state=checked]:border-[var(--marca)] data-[state=checked]:bg-[var(--marca)] data-[state=checked]:text-white',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--anel)_35%,transparent)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5 4.6 9 10 3.2" />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

/* -------------------------- Bloco de campo padrão ----------------------- */

export function Campo({
  rotulo,
  erro,
  dica,
  obrigatorio,
  className,
  children,
  htmlFor,
}: {
  rotulo?: string;
  erro?: string;
  dica?: string;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {rotulo && (
        <Label htmlFor={htmlFor}>
          {rotulo}
          {obrigatorio && <span className="ml-0.5 text-[var(--alerta)]">*</span>}
        </Label>
      )}
      {children}
      {erro ? (
        <p className="text-[12px] font-medium text-[var(--alerta)]">{erro}</p>
      ) : dica ? (
        <p className="text-[12px] text-[var(--texto-tenue)]">{dica}</p>
      ) : null}
    </div>
  );
}
