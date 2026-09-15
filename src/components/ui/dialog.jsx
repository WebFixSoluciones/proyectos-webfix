import * as React from "react";
import { createPortal } from 'react-dom';
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const DialogContext = React.createContext({
  open: false,
  onOpenChange: () => {},
});

function Dialog({ open: controlledOpen, defaultOpen = false, onOpenChange, children }) {
  const titleId = React.useId();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback((val) => {
    if (!isControlled) {
      setUncontrolledOpen(val);
    }
    if (onOpenChange) {
      onOpenChange(val);
    }
  }, [isControlled, onOpenChange]);

  const contextValue = React.useMemo(() => ({ open, titleId, onOpenChange: handleOpenChange }), [open, titleId, handleOpenChange]);

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
    </DialogContext.Provider>
  );
}

const DialogTrigger = React.forwardRef(({ children, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext);
  return (
    <span
      ref={ref}
      onClick={() => onOpenChange(true)}
      onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onOpenChange(true); } }}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      className="inline-block cursor-pointer"
      {...props}
    >
      {children}
    </span>
  );
});
DialogTrigger.displayName = "DialogTrigger";

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { open, onOpenChange, titleId } = React.useContext(DialogContext);
  const contentRef = React.useRef(null);
  React.useImperativeHandle(ref, () => contentRef.current);
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const content = contentRef.current;
    const focusables = () => [...content.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(node => node.getClientRects().length);
    (focusables()[0] || content).focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onOpenChange(false); }
      if (event.key === 'Tab') {
        const nodes = focusables();
        if (!nodes.length) { event.preventDefault(); content.focus(); return; }
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === content)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    content.addEventListener('keydown', keydown);
    return () => { content.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40  animate-in fade-in duration-150"
        onClick={() => onOpenChange(false)}
      />
      {/* Modal Card */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={props['aria-label'] ? undefined : titleId}
        tabIndex={-1}
        className={cn(
          "relative z-50 w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-card border border-border-default bg-surface-card p-6",
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm p-1 text-text-secondary opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
        >
          <X size={16} />
          <span className="sr-only">Cerrar</span>
        </button>
      </div>
    </div>, document.body
  );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left pb-4 border-b border-border-default/60", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-border-default/60 mt-4",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => {
  const { titleId } = React.useContext(DialogContext);
  return (
  <h2
    id={titleId}
    ref={ref}
    className={cn("text-base font-semibold leading-none tracking-tight text-text-heading", className)}
    {...props}
  />
); });
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-text-secondary tracking-tight", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
export default Dialog;
