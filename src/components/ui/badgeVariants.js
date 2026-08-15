import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase transition-colors focus:outline-none focus:ring-1 focus:ring-primary select-none",
  {
    variants: {
      variant: {
        default:
          "border-text-heading bg-text-heading text-white",
        secondary:
          "border-border-default bg-surface-sidebar text-text-primary",
        outline:
          "border-border-default text-text-primary bg-transparent",
        success:
          "border-success-border bg-success-light text-success-text",
        warning:
          "border-warning-border bg-warning-light text-warning-text",
        destructive:
          "border-error-border bg-error-light text-error-text",
        info:
          "border-info-border bg-info-light text-info-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
