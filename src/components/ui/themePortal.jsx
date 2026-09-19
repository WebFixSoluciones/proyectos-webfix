import { createPortal } from 'react-dom';
import WebFixTheme from './WebFixTheme';

// Full-screen POS, modals and document previews live outside the application root.
export function createThemedPortal(children, container = (typeof document !== 'undefined' ? document.body : null), key) {
  const target = container || (typeof document !== 'undefined' ? document.body : null);
  if (!target) return null;
  return createPortal(<WebFixTheme>{children}</WebFixTheme>, target, key);
}
