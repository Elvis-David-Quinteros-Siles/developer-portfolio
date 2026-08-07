import { type InputHTMLAttributes, type Ref } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-raised/60 px-3.5 text-sm text-ink placeholder:text-faint transition-colors focus:border-accent/60 focus:outline-none aria-[invalid=true]:border-danger/60",
        className,
      )}
      {...props}
    />
  );
}
