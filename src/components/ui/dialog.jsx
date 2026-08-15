import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const DialogContext = React.createContext({
  open: false,
  onOpenChange: () => {},
});

function Dialog({ open: controlledOpen, defaultOpen = false, onOpenChange, children }) {
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

  const contextValue = React.useMemo(() => ({ open, onOpenChange: handleOpenChange }), [open, handleOpenChange]);

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
    </DialogContext.Provider>
  );
}

const DialogTrigger = React.forwardRef(({ children, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext);
  return (
    <div
      ref={ref}
      onClick={() => onOpenChange(true)}
      className="inline-block cursor-pointer"
      {...props}
    >
      {children}
    </div>
  );
});
DialogTrigger.displayName = "DialogTrigger";

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(DialogContext);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={() => onOpenChange(false)}
      />
      {/* Modal Card */}
      <div
        ref={ref}
        className={cn(
          "relative z-50 w-full max-w-lg rounded-md border border-border-default bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150",
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
    </div>
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

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-base font-semibold leading-none tracking-tight text-text-heading", className)}
    {...props}
  />
));
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
