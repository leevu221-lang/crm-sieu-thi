import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getCachedDoc, setCachedDoc } from '../services/cachedFirestore';

export type FontFamily = 'Inter' | 'Oswald' | 'UTM Avo';

interface SettingsContextType {
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily, currentUser?: any) => Promise<boolean>;
  isSynced: boolean;
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

  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    const saved = localStorage.getItem('app-font-family');
    return (saved as FontFamily) || 'UTM Avo';
  });

  const [isSynced, setIsSynced] = useState<boolean>(false);

  // 1. Sync global font setting (admin-only, changes extremely rarely) from Firestore.
  // One-time cached read instead of a permanent onSnapshot — a live listener here was
  // billed on every app load for data that's already served instantly from localStorage.
  // 60-minute TTL: acceptable staleness for a cosmetic, admin-only setting.
  useEffect(() => {
    let cancelled = false;
    getCachedDoc<{ fontFamily?: string; fontSize?: number }>(
      'system_settings',
      'global_font_config',
      60 * 60 * 1000
    ).then((data) => {
      if (cancelled || !data) { setIsSynced(true); return; }
      if (data.fontFamily && ['Inter', 'Oswald', 'UTM Avo'].includes(data.fontFamily)) {
        setFontFamilyState(data.fontFamily as FontFamily);
        localStorage.setItem('app-font-family', data.fontFamily);
      }
      if (data.fontSize && typeof data.fontSize === 'number') {
        setFontSize(data.fontSize);
        localStorage.setItem('app-font-size', data.fontSize.toString());
      }
      setIsSynced(true);
    }).catch((err) => {
      console.warn('Firestore font sync error:', err);
      setIsSynced(true);
    });
    return () => { cancelled = true; };
  }, []);

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

  // Only User 43751 is allowed to change font settings globally
  const setFontFamily = async (font: FontFamily, currentUser?: any): Promise<boolean> => {
    const is43751 = String(currentUser?.username || '').trim() === '43751' ||
                    String(currentUser?.ma_nhan_vien || '').trim() === '43751' ||
                    String(currentUser?.user_id || '').trim() === '43751';

    if (!is43751) {
      return false;
    }

    setFontFamilyState(font);
    localStorage.setItem('app-font-family', font);

    try {
      await setDoc(doc(db, 'system_settings', 'global_font_config'), {
        fontFamily: font,
        fontSize: fontSize,
        updatedBy: '43751',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setCachedDoc('system_settings', 'global_font_config', { fontFamily: font, fontSize });
    } catch (e) {
      console.error('Failed to save global font config to Firestore:', e);
    }
    return true;
  };

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize, fontFamily, setFontFamily, isSynced }}>
      {children}
    </SettingsContext.Provider>
  );
}
