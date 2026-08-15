import * as React from "react";
import { cn } from "../../lib/utils";

const TabsContext = React.createContext({
  value: "",
  onValueChange: () => {},
});

function Tabs({ value: controlledValue, defaultValue = "", onValueChange, className, children, ...props }) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback((val) => {
    if (!isControlled) {
      setUncontrolledValue(val);
    }
    if (onValueChange) {
      onValueChange(val);
    }
  }, [isControlled, onValueChange]);

  const contextValue = React.useMemo(() => ({ value, onValueChange: handleValueChange }), [value, handleValueChange]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-start rounded-md bg-surface-sidebar p-1 text-text-secondary border border-border-default gap-1",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const { value: activeValue, onValueChange } = React.useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[4px] px-3 py-1 text-xs font-medium tracking-tight transition-all duration-120 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-white text-text-heading border border-border-default shadow-none font-semibold"
          : "text-text-secondary hover:text-text-heading hover:bg-black/5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const { value: activeValue } = React.useContext(TabsContext);
  if (activeValue !== value) return null;

  return (
    <div
      ref={ref}
      role="tabpanel"
      className={cn(
        "mt-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary animate-in fade-in duration-150",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
export default Tabs;
