import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast.jsx';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Expose addToast globally
  if (typeof window !== 'undefined') {
    window.showToast = addToast;
  }

  // An open modal <dialog> makes everything outside it inert and covers it, so toasts raised
  // while one is open (e.g. a failed delete in the board view) render inside the topmost dialog.
  const host = (toasts.length && [...document.querySelectorAll('dialog[open]')].pop()) || document.body;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>,
    host,
  );
}
