import React, { createContext, useContext, useState, ReactNode } from 'react';


interface GlobalContextType {
  status: string;
  toggleStatus: () => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  const VERSION_STATUS = "storedVersion";

  const getVersion = () => {
    try {
      const stored = localStorage.getItem(VERSION_STATUS);
      return stored ? JSON.parse(stored) : "twentyFourteen";
    } catch (error) {
      console.error("Error loading version status:", error);
      return "twentyFourteen"; // Default value
    }
  };
  const [status, setStatus] = useState<string>(getVersion);

  const toggleStatus = () => {
    setStatus((prevStatus) => {
      const newStatus = (prevStatus === 'twentyFourteen' ? 'twentyTwentyFour' : 'twentyFourteen');
      // Store the new status in local storage
      localStorage.setItem(VERSION_STATUS, JSON.stringify(newStatus));
      console.log("D&D 5e Version", newStatus)
      return newStatus;
    });
    
  const versionButton = document.getElementById("buttonVersion")
    if (versionButton?.classList.contains("fourteen")) {
            versionButton?.classList.remove("fourteen");
            versionButton?.classList.add("twentyFour");
        } else {
            versionButton?.classList.remove("twentyFour");
            versionButton?.classList.add("fourteen");
        }
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
