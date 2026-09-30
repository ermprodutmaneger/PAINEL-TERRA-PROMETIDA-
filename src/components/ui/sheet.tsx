import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/format';

export const Drawer = DialogPrimitive.Root;
export const DrawerGatilho = DialogPrimitive.Trigger;
export const DrawerFechar = DialogPrimitive.Close;

export const ConteudoDrawer = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { lado?: 'direita' | 'esquerda' | 'baixo' }
>(({ className, children, lado = 'direita', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#22201C]/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col border-[var(--borda)] bg-[var(--superficie)] shadow-[var(--shadow-pop)] transition ease-in-out data-[state=open]:animate-in data-[state=open]:duration-200',
        lado === 'direita' &&
          'inset-y-0 right-0 w-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-lg',
        lado === 'esquerda' &&
          'inset-y-0 left-0 w-[86%] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        lado === 'baixo' &&
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-[var(--texto-tenue)] transition-colors hover:bg-[var(--acento)] hover:text-[var(--texto)]"
        aria-label="Fechar painel"
      >
        <X className="size-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
ConteudoDrawer.displayName = 'ConteudoDrawer';

export function DrawerCabecalho({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shrink-0 border-b border-[var(--borda)] p-4 pr-12', className)} {...props} />;
}

export function DrawerCorpo({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto p-4', className)} {...props} />;
}

export function DrawerRodape({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('shrink-0 border-t border-[var(--borda)] bg-[var(--superficie-2)] p-4', className)} {...props} />
  );
}

export function DrawerTitulo({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-base font-semibold tracking-tight', className)} {...props} />;
}

export function DrawerDescricao({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('mt-1 text-[13px] text-[var(--texto-suave)]', className)} {...props} />;
}
