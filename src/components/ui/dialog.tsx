import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/format';
import { Botao } from './button';

export const Dialog = DialogPrimitive.Root;
export const DialogAberto = DialogPrimitive.Root;
export const DialogGatilho = DialogPrimitive.Trigger;
export const DialogFechar = DialogPrimitive.Close;

export const ConteudoDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { largura?: 'sm' | 'md' | 'lg' | 'xl' | 'auto' }
>(({ className, children, largura = 'md', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#22201C]/55 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[var(--borda)] bg-[var(--superficie)] shadow-[var(--shadow-pop)]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        largura === 'sm' && 'sm:max-w-md',
        largura === 'md' && 'sm:max-w-2xl',
        largura === 'lg' && 'sm:max-w-4xl',
        largura === 'xl' && 'sm:max-w-6xl',
        largura === 'auto' && 'sm:max-w-[min(96vw,1100px)]',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-[var(--texto-tenue)] transition-colors hover:bg-[var(--acento)] hover:text-[var(--texto)]"
        aria-label="Fechar"
      >
        <X className="size-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
ConteudoDialog.displayName = 'ConteudoDialog';

export function DialogCabecalho({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shrink-0 border-b border-[var(--borda)] p-4 pr-12 sm:p-5', className)} {...props} />;
}

export function DialogCorpo({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto p-4 sm:p-5', className)} {...props} />;
}

export function DialogRodape({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--borda)] bg-[var(--superficie-2)] p-4 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export function DialogTitulo({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-base font-semibold tracking-tight', className)} {...props} />;
}

export function DialogDescricao({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('mt-1 text-[13px] leading-snug text-[var(--texto-suave)]', className)}
      {...props}
    />
  );
}

/* ========================= Confirmação destrutiva ======================== */

export const Confirmacao = AlertDialogPrimitive.Root;
export const ConfirmacaoAcao = AlertDialogPrimitive.Action;
export const ConfirmacaoCancelar = AlertDialogPrimitive.Cancel;
export const ConfirmacaoGatilho = AlertDialogPrimitive.Trigger;

export const ConteudoConfirmacao = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#22201C]/55 backdrop-blur-[2px]" />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-5 shadow-[var(--shadow-pop)]',
        className,
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
ConteudoConfirmacao.displayName = 'ConteudoConfirmacao';

export function ConfirmacaoTitulo({ className, ...props }: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={cn('text-base font-semibold tracking-tight', className)} {...props} />;
}

export function ConfirmacaoDescricao({ className, ...props }: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description className={cn('mt-1.5 text-[13px] text-[var(--texto-suave)]', className)} {...props} />;
}

export function ConfirmacaoAcoes({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

/** Atalho: botão de confirmação para ações destrutivas (§11.8). */
export function BotaoExcluir({
  aoConfirmar,
  children,
  descricao,
  rotulo = 'Tem certeza?',
}: {
  aoConfirmar: () => void;
  children: React.ReactNode;
  descricao?: string;
  rotulo?: string;
} & Omit<React.ComponentProps<typeof Botao>, 'onClick'>) {
  return (
    <Confirmacao>
      <ConfirmacaoGatilho asChild>{children}</ConfirmacaoGatilho>
      <ConteudoConfirmacao>
        <ConfirmacaoTitulo>{rotulo}</ConfirmacaoTitulo>
        <ConfirmacaoDescricao>
          {descricao ?? 'Esta ação não pode ser desfeita. Para manter o histórico, prefira arquivar.'}
        </ConfirmacaoDescricao>
        <ConfirmacaoAcoes>
          <ConfirmacaoCancelar asChild>
            <Botao variante="contorno">Cancelar</Botao>
          </ConfirmacaoCancelar>
          <ConfirmacaoAcao asChild>
            <Botao variante="perigo" onClick={aoConfirmar}>
              Sim, confirmar
            </Botao>
          </ConfirmacaoAcao>
        </ConfirmacaoAcoes>
      </ConteudoConfirmacao>
    </Confirmacao>
  );
}
