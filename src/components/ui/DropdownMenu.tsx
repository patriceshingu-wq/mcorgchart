import React from 'react';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils';

export const DropdownMenuRoot = RadixDropdown.Root;
export const DropdownMenuTrigger = RadixDropdown.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDropdown.Content>) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        sideOffset={sideOffset}
        className={cn(
          'z-[100] min-w-[140px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl p-1',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      />
    </RadixDropdown.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDropdown.Item>) {
  return (
    <RadixDropdown.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm text-slate-900 gap-2',
        'data-[highlighted]:bg-slate-50 data-[highlighted]:outline-none',
        'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDropdown.Separator>) {
  return <RadixDropdown.Separator className={cn('my-1 h-px bg-slate-100', className)} {...props} />;
}
