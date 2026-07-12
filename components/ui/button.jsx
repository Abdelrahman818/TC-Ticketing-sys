import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", size = "default", ...props }) {
  const base = "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none shadow-sm";
  const variants = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "shadow-none hover:bg-slate-100 hover:text-slate-900",
    destructive: "bg-rose-600 text-white hover:bg-rose-700",
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    icon: "h-9 w-9",
  };

  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
