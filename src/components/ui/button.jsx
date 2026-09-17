import { forwardRef } from 'react';
import { Button as RadixButton } from '@radix-ui/themes';
import { cn } from '../../lib/utils';
const variants = { default: 'solid', accent: 'solid', secondary: 'soft', outline: 'outline', ghost: 'ghost', destructive: 'soft', link: 'ghost' };
const sizes = { default: '2', sm: '1', lg: '3', icon: '1' };
export const Button = forwardRef(function Button({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) {
  return <RadixButton ref={ref} type={type} variant={variants[variant] || variant} size={sizes[size] || size} color={variant === 'destructive' ? 'red' : undefined} className={cn(size === 'icon' && 'h-8 w-8 p-0', className)} {...props} />;
});
export default Button;
