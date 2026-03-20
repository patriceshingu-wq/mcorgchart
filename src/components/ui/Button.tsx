import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-700',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300',
  outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 active:bg-slate-100',
  destructive: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200',
};

const sizes = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-7 px-3 py-1 text-xs',
  lg: 'h-11 px-6 py-2 text-base',
  icon: 'h-8 w-8 p-0',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
