import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const SheetRoot = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;

export function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Content> & { side?: 'right' | 'left' }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/20" />
      <RadixDialog.Content
        className={cn(
          'fixed z-50 bg-white shadow-2xl transition ease-in-out',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          side === 'right' && [
            'right-0 top-0 h-full w-[360px] border-l border-slate-200',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          ],
          side === 'left' && [
            'left-0 top-0 h-full w-[360px] border-r border-slate-200',
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          ],
          className,
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900">
          <X className="h-4 w-4" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pt-6 pb-4', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Title>) {
  return <RadixDialog.Title className={cn('text-lg font-semibold text-slate-900', className)} {...props} />;
}
