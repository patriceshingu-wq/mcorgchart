import React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  viewportClassName?: string;
}

export function Select({ value, onValueChange, placeholder, children, disabled, className, viewportClassName }: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white',
          'px-3 py-2 text-sm text-slate-900 gap-2',
          'focus:outline-none focus:ring-2 focus:ring-slate-900',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'data-[placeholder]:text-slate-400',
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-[100] min-w-[8rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport className={cn('p-1', viewportClassName)}>
            {children}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function SelectItem({ value, children, className }: SelectItemProps) {
  return (
    <RadixSelect.Item
      value={value}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm text-slate-900',
        'data-[highlighted]:bg-slate-50 data-[highlighted]:outline-none',
        'data-[state=checked]:font-medium',
        className,
      )}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute right-2">
        <Check className="h-3.5 w-3.5 text-slate-700" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}
