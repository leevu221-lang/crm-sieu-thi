import { useContext } from 'react';
import { LuykeDataContext } from '../../../contexts/LuykeDataContext';

export const useLuykeData = (maKho?: string) => {
  const context = useContext(LuykeDataContext);
  if (!context) {
    throw new Error('useLuykeData must be used within LuykeDataProvider');
  }
  return context;
};

