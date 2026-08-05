import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface CategoryConfigItem {
  name: string;
  group: string;
}

export const useCategoryConfig = () => {
  const [categoryConfig, setCategoryConfig] = useState<CategoryConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'TNB_LEADER_DATA'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.categories && Array.isArray(data.categories)) {
          setCategoryConfig(data.categories);
        }
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching category config:', error);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  return { categoryConfig, isLoading };
};
