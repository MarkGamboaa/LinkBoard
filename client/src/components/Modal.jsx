import { useLayoutEffect, useRef } from 'react';

const supportsClosedBy = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

const isOutside = (event, dialog) => {
  const rect = dialog.getBoundingClientRect();
  return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
};

/**
 * Native modal <dialog>, mounted while open (render it conditionally, like the old overlays).
 * The browser supplies focus containment, an inert page, Esc/back-gesture dismissal and focus return.
 * Pass `dismissible={false}` while a save or delete is in flight so it cannot be closed mid-request.
 */
export default function Modal({ onClose, labelledBy, describedBy, alert = false, dismissible = true, className = 'max-w-md', children }) {
  const ref = useRef(null);
  const pressedOutside = useRef(false);
  const latest = useRef({ onClose, dismissible });
  latest.current = { onClose, dismissible };

  // Layout effect: close() must run before React removes the node, or the browser skips returning focus.
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  // Every close request (Esc, back gesture, backdrop) goes through React state, so the parent stays the source of truth.
  const requestClose = () => {
    if (latest.current.dismissible) latest.current.onClose?.();
  };

  return (
    <dialog
      ref={ref}
      closedby={dismissible ? 'any' : 'none'}
      role={alert ? 'alertdialog' : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // StrictMode's mount/unmount/mount queues a close event that lands after the dialog reopened.
        if (!ref.current || ref.current.open) return;
        // Otherwise the browser closed it without a cancel we could prevent (e.g. a repeated Esc).
        if (latest.current.dismissible) latest.current.onClose?.();
        else ref.current?.showModal();
      }}
      onPointerDown={supportsClosedBy ? undefined : (event) => { pressedOutside.current = isOutside(event, ref.current); }}
      onPointerUp={supportsClosedBy ? undefined : (event) => {
        if (pressedOutside.current && isOutside(event, ref.current)) requestClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] rounded-2xl border border-hairline bg-base-100 p-6 text-base-content shadow-xl backdrop:bg-black/40 ${className}`}
    >
      {children}
    </dialog>
  );
}
