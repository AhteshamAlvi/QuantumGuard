import { useEffect, type ReactNode } from "react";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Panel({ title, open, onClose, children }: Props) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel__header">
          <h3 className="panel__title">{title}</h3>
          <button className="panel__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="panel__body">
          {children}
        </div>
      </div>
    </div>
  );
}
