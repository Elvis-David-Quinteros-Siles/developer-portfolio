import { type Ref, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full resize-y rounded-lg border border-line bg-raised/60 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint transition-colors focus:border-accent/60 focus:outline-none aria-[invalid=true]:border-danger/60",
        className,
      )}
      {...props}
    />
  );
}
