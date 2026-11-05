import { useEffect } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  hideDefaultClose?: boolean;
}

export function Dialog({
  open,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
  className,
  hideDefaultClose = false,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 p-3 sm:p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={
          className
            ? `relative w-full ${maxWidth} ${className} animate-dialog-in my-auto`
            : `relative w-full ${maxWidth} animate-dialog-in rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl my-auto`
        }
        onClick={(e) => e.stopPropagation()}
      >
        {!hideDefaultClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
