"use client";

import { cn } from "@/lib/utils";

export function Dialog({ open, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {children}
    </div>
  );
}

export function DialogTrigger({ children, asChild = false, ...props }) {
  if (asChild) {
    return <div {...props}>{children}</div>;
  }

  return <button type="button" {...props}>{children}</button>;
}

export function DialogContent({ className, children, ...props }) {
  return (
    <div className={cn("w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-xl", className)} {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}
