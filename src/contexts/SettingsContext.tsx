import React, { createContext, useContext, useState, useEffect } from 'react';

type FontFamily = 'Inter' | 'Oswald' | 'UTM Avo';

interface SettingsContextType {
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('app-font-size');
    return saved ? parseInt(saved, 10) : 14;
  });

  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    const saved = localStorage.getItem('app-font-family');
    return (saved as FontFamily) || 'Inter';
  });

  useEffect(() => {
    localStorage.setItem('app-font-size', fontSize.toString());
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('app-font-family', fontFamily);
    document.documentElement.classList.remove('font-sans', 'font-oswald', 'font-utm-avo');
    
    if (fontFamily === 'Oswald') {
      document.documentElement.classList.add('font-oswald');
    } else if (fontFamily === 'UTM Avo') {
      document.documentElement.classList.add('font-utm-avo');
    } else {
      document.documentElement.classList.add('font-sans');
    }
  }, [fontFamily]);

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize, fontFamily, setFontFamily }}>
      {children}
    </SettingsContext.Provider>
  );
}
