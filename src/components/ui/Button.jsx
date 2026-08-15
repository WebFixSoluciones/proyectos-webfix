import * as React from "react";
import { buttonVariants } from "./buttonVariants";
import { cn } from "../../lib/utils";

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button };
export default Button;
