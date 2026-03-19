import React from 'react';
import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import { cn } from '../../lib/utils';

interface ScrollAreaProps {
  className?: string;
  children: React.ReactNode;
}

export function ScrollArea({ className, children }: ScrollAreaProps) {
  return (
    <RadixScrollArea.Root className={cn('relative overflow-hidden', className)}>
      <RadixScrollArea.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </RadixScrollArea.Viewport>
      <RadixScrollArea.Scrollbar
        className="flex touch-none select-none transition-colors w-2 p-px"
        orientation="vertical"
      >
        <RadixScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-200 hover:bg-slate-300" />
      </RadixScrollArea.Scrollbar>
      <RadixScrollArea.Scrollbar
        className="flex touch-none select-none transition-colors h-2 p-px flex-col"
        orientation="horizontal"
      >
        <RadixScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-200 hover:bg-slate-300" />
      </RadixScrollArea.Scrollbar>
    </RadixScrollArea.Root>
  );
}
