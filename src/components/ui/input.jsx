import * as React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-1.5 text-base text-text-primary shadow-none transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
export default Input;
