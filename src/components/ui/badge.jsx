import { Badge as RadixBadge } from '@radix-ui/themes';
const colors = { default: 'blue', secondary: 'gray', success: 'green', warning: 'amber', destructive: 'red', info: 'blue', outline: 'gray' };
export function Badge({ variant = 'default', radius = 'full', size = '1', className, ...props }) {
  return <RadixBadge color={colors[variant] || 'blue'} variant={variant === 'outline' ? 'outline' : 'soft'} radius={radius} size={size} className={className} {...props} />;
}
export default Badge;
