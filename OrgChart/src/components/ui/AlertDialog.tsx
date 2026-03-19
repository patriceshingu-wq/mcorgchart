import React from 'react';
import * as RadixAlertDialog from '@radix-ui/react-alert-dialog';
import { cn } from '../../lib/utils';

export const AlertDialogRoot = RadixAlertDialog.Root;
export const AlertDialogTrigger = RadixAlertDialog.Trigger;

export function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixAlertDialog.Content>) {
  return (
    <RadixAlertDialog.Portal>
      <RadixAlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <RadixAlertDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      >
        {children}
      </RadixAlertDialog.Content>
    </RadixAlertDialog.Portal>
  );
}

export function AlertDialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixAlertDialog.Title>) {
  return <RadixAlertDialog.Title className={cn('text-lg font-semibold text-slate-900 mb-2', className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixAlertDialog.Description>) {
  return <RadixAlertDialog.Description className={cn('text-sm text-slate-600 mb-4', className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-end gap-2 mt-4', className)} {...props} />;
}

export const AlertDialogCancel = RadixAlertDialog.Cancel;
export const AlertDialogAction = RadixAlertDialog.Action;
