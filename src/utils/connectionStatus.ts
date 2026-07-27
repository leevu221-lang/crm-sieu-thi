import { useState, useEffect } from 'react';

// Global state for connection status
let isOfflineGlobal = false;
const listeners: ((status: boolean) => void)[] = [];

export const setConnectionOffline = (status: boolean) => {
  isOfflineGlobal = status;
  listeners.forEach(l => l(status));
};

export const useConnectionStatus = () => {
  const [isOffline, setIsOffline] = useState(isOfflineGlobal);

  useEffect(() => {
    const listener = (status: boolean) => setIsOffline(status);
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return isOffline;
};
