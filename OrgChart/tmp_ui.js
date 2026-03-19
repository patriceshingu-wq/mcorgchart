import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import * as Tabs from "@radix-ui/react-tabs";
import * as Toast from "@radix-ui/react-toast";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "./utils";

export const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: "bg-slate-900 text-white hover:bg-slate-800",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
      outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
      destructive: "bg-rose-600 text-white hover:bg-rose-500",
      ghost: "text-slate-700 hover:bg-slate-100",
    };
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3 text-sm",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-base font-semibold text-slate-900", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export function Badge({ className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700",
        className,
      )}
      {...props}
    />
  );
}

export function DialogRoot(props) {
  return <Dialog.Root {...props} />;
}

export function DialogContent({ className, children, ...props }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl focus:outline-none",
          className,
        )}
        {...props}
      >
        <Dialog.Close className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
          <X className="h-4 w-4" />
        </Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-5 space-y-1", className)} {...props} />;
}

export function DialogTitle(props) {
  return <Dialog.Title className="text-xl font-semibold text-slate-900" {...props} />;
}

export function DialogDescription({ className, ...props }) {
  return <Dialog.Description className={cn("text-sm text-slate-500", className)} {...props} />;
}

export function SelectField({ value, onValueChange, placeholder, options }) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20">
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <Select.Viewport className="p-1">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm text-slate-700 outline-none data-[highlighted]:bg-amber-50 data-[highlighted]:text-slate-900"
              >
                <Select.ItemIndicator className="absolute left-2">
                  <Check className="h-4 w-4 text-amber-600" />
                </Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function SwitchField(props) {
  return (
    <Switch.Root
      className="relative h-6 w-11 rounded-full bg-slate-200 outline-none transition data-[state=checked]:bg-amber-500"
      {...props}
    >
      <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[1.35rem]" />
    </Switch.Root>
  );
}

export function TabsRoot(props) {
  return <Tabs.Root {...props} />;
}

export function TabsList({ className, ...props }) {
  return (
    <Tabs.List
      className={cn("inline-flex rounded-2xl bg-slate-100 p-1 text-slate-600", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }) {
  return (
    <Tabs.Trigger
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }) {
  return <Tabs.Content className={cn("outline-none", className)} {...props} />;
}

export function ToastProvider({ children }) {
  return (
    <Toast.Provider swipeDirection="right">
      {children}
      <Toast.Viewport className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2 outline-none" />
    </Toast.Provider>
  );
}

export function ToastMessage({ open, onOpenChange, title, description }) {
  return (
    <Toast.Root
      open={open}
      onOpenChange={onOpenChange}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
      duration={2800}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Toast.Title className="text-sm font-semibold text-slate-900">{title}</Toast.Title>
          <Toast.Description className="text-sm text-slate-500">{description}</Toast.Description>
        </div>
        <Toast.Close className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </Toast.Close>
      </div>
    </Toast.Root>
  );
}

export function ScrollAreaBox({ className = "", children }) {
  return (
    <ScrollArea.Root className={className}>
      <ScrollArea.Viewport className="h-full w-full rounded-[inherit]">{children}</ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="horizontal" className="flex h-2.5 touch-none select-none bg-transparent p-0.5">
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-300" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar orientation="vertical" className="flex w-2.5 touch-none select-none bg-transparent p-0.5">
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-300" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner className="bg-transparent" />
    </ScrollArea.Root>
  );
}
