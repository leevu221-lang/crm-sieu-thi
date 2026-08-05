import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationContextType {
  showNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2000);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          >
            <div className={`${notification.type === 'success' ? 'bg-emerald-600' : notification.type === 'info' ? 'bg-blue-600' : 'bg-red-600'} text-white rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-2`}>
              {notification.type === 'success' ? <CheckCircle2 size={40} /> : notification.type === 'info' ? <AlertCircle size={40} /> : <AlertCircle size={40} />}
              <p className="font-bold text-lg">
                {notification.type === 'success' ? 'THÀNH CÔNG' : notification.type === 'info' ? 'THÔNG BÁO' : 'LỖI'}
              </p>
              <p>{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
