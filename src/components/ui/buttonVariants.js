import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border text-[13px] font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-[#0b996f] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#1b1b1b] text-white border-[#1b1b1b] hover:bg-black",
        primary: "bg-[#1b1b1b] text-white border-[#1b1b1b] hover:bg-black",
        accent: "bg-[#0b996f] text-white border-[#0b996f] hover:bg-[#004227]",
        brand: "bg-[#0b996f] text-white border-[#0b996f] hover:bg-[#004227]",
        secondary: "bg-white text-[#1b1b1b] border-[#e3e3e3] hover:bg-[#fafafa] hover:border-[#cccccc]",
        outline: "bg-white text-[#1b1b1b] border-[#e3e3e3] hover:bg-[#fafafa] hover:border-[#cccccc]",
        soft: "bg-[#e8fedf] text-[#004227] border-[#b3f4cb] hover:bg-[#d8fae4]",
        ghost: "bg-transparent text-[#474747] border-transparent hover:bg-[#f4f4f5] hover:text-[#1b1b1b]",
        destructive: "bg-[#fff0f5] text-[#851b40] border-[#fbc6d9] hover:bg-[#ffe4ed]",
        danger: "bg-[#fff0f5] text-[#851b40] border-[#fbc6d9] hover:bg-[#ffe4ed]",
        link: "bg-transparent border-transparent text-[#0b996f] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-3.5 text-[13px]",
        sm: "h-[30px] px-2.5 text-xs",
        md: "h-9 px-3.5 text-[13px]",
        lg: "h-[42px] px-[18px] text-sm font-bold",
        icon: "h-[30px] w-[30px] p-0 rounded-[8px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
