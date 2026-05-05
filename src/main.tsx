import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './contexts/NotificationContext';
import { MarketProvider } from './contexts/MarketContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <AuthProvider>
          <NotificationProvider>
            <MarketProvider>
              <App />
            </MarketProvider>
          </NotificationProvider>
        </AuthProvider>
      </SettingsProvider>
    </ErrorBoundary>
  </StrictMode>,
);
