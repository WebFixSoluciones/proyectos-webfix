import { forwardRef } from 'react';
import { UiButton } from './controls';

const VARIANT_MAP = {
  default: 'primary',
  primary: 'primary',
  accent: 'brand',
  brand: 'brand',
  secondary: 'secondary',
  outline: 'secondary',
  soft: 'soft',
  ghost: 'ghost',
  destructive: 'danger',
  danger: 'danger',
  link: 'ghost',
};

const SIZE_MAP = {
  default: 'md',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  icon: 'sm',
};

export const Button = forwardRef(function Button(
  { className, variant = 'default', size = 'default', type = 'button', ...props },
  ref
) {
  return (
    <UiButton
      ref={ref}
      type={type}
      iconOnly={size === 'icon'}
      variant={VARIANT_MAP[variant] || variant}
      size={SIZE_MAP[size] || size}
      className={className}
      {...props}
    />
  );
});

export default Button;
