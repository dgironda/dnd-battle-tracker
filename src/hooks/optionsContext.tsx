import { DEVMODE } from "../utils/devmode";

import React, { createContext, useContext, useState, ReactNode } from 'react';


interface OptionsContextType {
  conditionReminderOn: boolean;
  toggleStatus: () => void;
}

const optionsContext = createContext<OptionsContextType | undefined>(undefined);

export const optionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  const CONDITIONREMINDERON = "conditionReminderOn";

  const getOptions = () => {
    try {
      const stored = localStorage.getItem(CONDITIONREMINDERON);
      return stored ? JSON.parse(stored) : true;
    } catch (error) {
      console.error("Error loading options:", error);
      return true; // Default value
    }
  };
  const [conditionReminderOn, setConditionReminderOn] = useState<true>(getOptions);

  const toggleStatus = () => {
    setConditionReminderOn((prevStatus) => {
      const newStatus = (prevStatus === true ? false : true);
      // Store the new status in local storage
      localStorage.setItem(CONDITIONREMINDERON, JSON.stringify(newStatus));
      DEVMODE && console.log("Condition Reminder On?", newStatus)
      return newStatus;
    });
    
  const conditionReminderButton = document.getElementById("buttonConditionReminder")
    if (conditionReminderButton?.classList.contains("On")) {
            conditionReminderButton?.classList.remove("On");
            conditionReminderButton?.classList.add("Off");
        } else {
            conditionReminderButton?.classList.remove("Off");
            conditionReminderButton?.classList.add("On");
        }
  };

  return (
    <GlobalContext.Provider value={{ status, toggleStatus }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalOptionsContext = () => {
  const context = useContext(optionsContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};
