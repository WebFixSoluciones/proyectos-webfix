import { forwardRef } from 'react';
import { Dialog as RadixDialog, IconButton } from '@radix-ui/themes';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
export function Dialog(props) { return <RadixDialog.Root {...props} />; }
export const DialogTrigger = forwardRef(function DialogTrigger(props, ref) { return <RadixDialog.Trigger ref={ref} {...props} />; });
export const DialogTitle = forwardRef(function DialogTitle(props, ref) { return <RadixDialog.Title ref={ref} {...props} />; });
export const DialogDescription = forwardRef(function DialogDescription(props, ref) { return <RadixDialog.Description ref={ref} {...props} />; });
export const DialogContent = forwardRef(function DialogContent({ className, children, ...props }, ref) {
  return <RadixDialog.Content ref={ref} aria-describedby={undefined} className={cn('relative w-full max-w-lg max-h-[90dvh] overflow-y-auto', className)} {...props}>
    {children}
    <RadixDialog.Close><IconButton type="button" variant="ghost" color="gray" aria-label="Cerrar" className="absolute right-4 top-4"><X size={16} /></IconButton></RadixDialog.Close>
  </RadixDialog.Content>;
});
export function DialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-2 pb-4', className)} {...props} />;
}
export function DialogFooter({ className, ...props }) {
  return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 mt-4', className)} {...props} />;
}
export default Dialog;
