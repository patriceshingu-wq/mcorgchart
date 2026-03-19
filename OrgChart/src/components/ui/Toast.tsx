import React, { createContext, useContext, useState, useCallback } from 'react';
import * as RadixToast from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error';
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <RadixToast.Provider swipeDirection="right" duration={3000}>
        {children}
        {toasts.map(toast => (
          <RadixToast.Root
            key={toast.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border bg-white shadow-lg px-4 py-3',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
              'data-[state=open]:slide-in-from-bottom-full',
              toast.type === 'error' ? 'border-rose-200' : 'border-slate-200',
            )}
            onOpenChange={open => { if (!open) removeToast(toast.id); }}
          >
            {toast.type === 'error'
              ? <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
              : <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            }
            <RadixToast.Description className="text-sm text-slate-800 flex-1">
              {toast.message}
            </RadixToast.Description>
            <RadixToast.Close asChild>
              <button className="text-slate-400 hover:text-slate-700 rounded p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-80 max-w-full" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
