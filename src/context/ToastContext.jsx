import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, variant) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((currentToasts) => [...currentToasts, { id, message, variant }]);
      return id;
    },
    []
  );

  const showSuccess = useCallback(
    (message) => showToast(message, 'success'),
    [showToast]
  );
  const showError = useCallback((message) => showToast(message, 'danger'), [showToast]);
  const value = useMemo(() => ({ showSuccess, showError }), [showSuccess, showError]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer position="top-end" className="p-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            bg={toast.variant}
            autohide
            delay={3000}
            onClose={() => dismiss(toast.id)}
          >
            <Toast.Body className="text-white">{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast phải được sử dụng bên trong ToastProvider');
  }
  return context;
}
