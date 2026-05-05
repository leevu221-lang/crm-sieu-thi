import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MarketInfo {
  name: string;
  [key: string]: any;
}

interface MarketContextType {
  marketFilter: string;
  setMarketFilter: (filter: string) => void;
  availableMarkets: MarketInfo[];
  setAvailableMarkets: (markets: MarketInfo[]) => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [marketFilter, setMarketFilter] = useState(() => localStorage.getItem('rtst_global_market_filter') || 'ALL');
  const [availableMarkets, setAvailableMarkets] = useState<MarketInfo[]>([]);

  useEffect(() => {
    localStorage.setItem('rtst_global_market_filter', marketFilter);
  }, [marketFilter]);

  return (
    <MarketContext.Provider value={{ marketFilter, setMarketFilter, availableMarkets, setAvailableMarkets }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (context === undefined) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
