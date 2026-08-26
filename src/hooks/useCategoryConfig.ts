import { useState, useEffect } from 'react';
import { getCachedDoc } from '../services/cachedFirestore';

export interface CategoryConfigItem {
  name: string;
  group: string;
}

// One-time cached read (shared cache key with TnbLeader.tsx's own TNB_LEADER_DATA
// listener) instead of a permanent onSnapshot — see src/services/cachedFirestore.ts.
export const useCategoryConfig = () => {
  const [categoryConfig, setCategoryConfig] = useState<CategoryConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCachedDoc<{ categories?: CategoryConfigItem[] }>('app_settings', 'TNB_LEADER_DATA')
      .then((data) => {
        if (cancelled) return;
        if (data?.categories && Array.isArray(data.categories)) {
          setCategoryConfig(data.categories);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching category config:', error);
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { categoryConfig, isLoading };
};
