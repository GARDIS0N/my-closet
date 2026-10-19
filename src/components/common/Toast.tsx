import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

let toastListeners: ((toast: ToastMessage) => void)[] = [];

export function showToast(type: 'success' | 'error' | 'info', title: string, message?: string) {
  const toast: ToastMessage = {
    id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    title,
    message,
  };
  toastListeners.forEach((fn) => fn(toast));
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (newToast: ToastMessage) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    toastListeners.push(handleToast);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== handleToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none md:bottom-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-[#1E392A] text-[#FAF7F2] border-[#2D5A43]'
              : toast.type === 'error'
              ? 'bg-[#451A03] text-[#FEE2E2] border-[#991B1B]'
              : 'bg-[#1C1917] text-[#FAF7F2] border-stone-700'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#86EFAC] shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[#FCA5A5] shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-[#93C5FD] shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold leading-tight">{toast.title}</h4>
            {toast.message && <p className="text-xs opacity-90 mt-1 leading-relaxed">{toast.message}</p>}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
