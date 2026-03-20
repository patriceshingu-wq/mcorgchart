import React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
}

export function Switch({ checked, onCheckedChange, id, className }: SwitchProps) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900',
        checked ? 'bg-slate-900' : 'bg-slate-200',
        className,
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          'block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </RadixSwitch.Root>
  );
}
