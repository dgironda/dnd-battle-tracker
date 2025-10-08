import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlobalContextType {
  status: string;
  toggleStatus: () => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<string>('twentyFourteen');

  const toggleStatus = () => {
    setStatus((prevStatus) => (prevStatus === 'twentyFourteen' ? 'twentyTwentyFour' : 'twentyFourteen'));
  };

  return (
    <GlobalContext.Provider value={{ status, toggleStatus }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};
