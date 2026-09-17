import { createPortal } from 'react-dom';
import WebFixTheme from './WebFixTheme';

// Full-screen POS and document previews live outside the application root.
export function createThemedPortal(children, container, key) {
  return createPortal(<WebFixTheme>{children}</WebFixTheme>, container, key);
}
