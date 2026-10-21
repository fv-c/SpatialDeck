import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
export function Dialog({
  title,
  children,
  onCancel,
  onConfirm,
  confirm = "Continua",
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirm?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current!.showModal();
    return () => {
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="dialog-title">{title}</h2>
      {children}
      <div className="dialog-actions">
        <button tabIndex={0} autoFocus onClick={onCancel}>
          Annulla
        </button>
        <button tabIndex={0} className="primary" onClick={onConfirm}>
          {confirm}
        </button>
      </div>
    </dialog>
  );
}
