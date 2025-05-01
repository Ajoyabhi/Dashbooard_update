import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToasterContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToasterContext = React.createContext<ToasterContextType | undefined>(undefined);

export const useToaster = () => {
  const context = React.useContext(ToasterContext);
  if (!context) {
    throw new Error('useToaster must be used within a ToasterProvider');
  }
  return context;
};

// This is the actual component that will be used in the app
export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  // Expose the showToast method
  useEffect(() => {
    // Create a global function to show toasts
    window.showToast = addToast;
    
    return () => {
      delete window.showToast;
    };
  }, []);

  return (
    <>
      <ToasterContext.Provider value={{ showToast: addToast }}>
        {/* Nothing to render here, just providing context */}
      </ToasterContext.Provider>
      
      <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
};

// Toast component
interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-success-500',
          icon: <CheckCircle className="h-5 w-5 text-white" />,
        };
      case 'error':
        return {
          bg: 'bg-error-500',
          icon: <AlertCircle className="h-5 w-5 text-white" />,
        };
      case 'info':
        return {
          bg: 'bg-primary-500',
          icon: <Info className="h-5 w-5 text-white" />,
        };
      default:
        return {
          bg: 'bg-primary-500',
          icon: <Info className="h-5 w-5 text-white" />,
        };
    }
  };

  const { bg, icon } = getToastStyles();

  return (
    <div
      className={`${bg} rounded-lg shadow-lg min-w-[300px] max-w-md animate-fade-in`}
      role="alert"
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          {icon}
          <div className="ml-3 text-white">{message}</div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 focus:outline-none"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    showToast: (type: ToastType, message: string) => void;
  }
}

export default Toaster;