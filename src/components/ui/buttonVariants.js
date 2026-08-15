import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium tracking-tight transition-all duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-text-heading text-white border border-text-heading hover:bg-black/90 active:scale-[0.99]",
        accent:
          "bg-primary text-white border border-primary hover:bg-primary-hover active:scale-[0.99]",
        secondary:
          "bg-white text-text-primary border border-border-default hover:bg-surface-sidebar hover:border-border-strong",
        outline:
          "bg-transparent border border-border-default text-text-primary hover:bg-surface-sidebar hover:text-text-heading",
        ghost:
          "bg-transparent text-text-secondary hover:bg-black/5 hover:text-text-heading",
        destructive:
          "bg-white text-error border border-border-default hover:bg-error-light hover:border-error-border",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-3.5 py-1.5",
        sm: "h-8 px-2.5 py-1 text-[11px]",
        lg: "h-10 px-5 text-sm",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
