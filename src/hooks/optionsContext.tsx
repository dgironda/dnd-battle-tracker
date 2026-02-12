import { DEVMODE } from "../utils/devmode";
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface Settings {
  // Add settings here
  version: 'twentyFourteen' | 'twentyTwentyFour';
  theme?: 'light' | 'dark';
  conditionReminderOn?: boolean;
  currentTurnTime?: boolean;
  tourReady: boolean;
}

interface GlobalContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggleVersion: () => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  const SETTINGS_KEY = "appSettings";

  const getSettings = (): Settings => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? JSON.parse(stored) : {
        version: "twentyFourteen",
        theme: "light",
        conditionReminderOn: true,
        currentTurnTime: true,
        tourReady: true,
      };
    } catch (error) {
      console.error("Error loading settings:", error);
      return {
        version: "twentyFourteen",
        theme: "light",
        conditionReminderOn: true,
        currentTurnTime: true,
        tourReady: true,
      };
    }
    
  };

  const [settings, setSettings] = useState<Settings>(getSettings);

  useEffect(() => {
    document.documentElement.style.colorScheme = settings.theme || 'light';
    }, [settings.theme]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prevSettings:Settings) => {
      const newSettings = { ...prevSettings, [key]: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      DEVMODE && console.log(`Setting ${String(key)} updated:`, value);
      return newSettings;
    });
  };

  const toggleVersion = () => {
    const newVersion = settings.version === 'twentyFourteen' ? 'twentyTwentyFour' : 'twentyFourteen';
    updateSetting('version', newVersion);
    DEVMODE && console.log("D&D 5e Version", newVersion);
  };

  return (
    <GlobalContext.Provider value={{ settings, updateSetting, toggleVersion }}>
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