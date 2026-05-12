import React from "react";
import { useGlobalContext } from "../hooks/optionsContext";
import ToggleComponent from "./ToggleContext";

interface OptionsPanelProps {
  onClose: () => void;
  isSupporter: boolean;
}

export default function OptionsPanel({ onClose, isSupporter }: OptionsPanelProps) {
  const { settings, updateSetting } = useGlobalContext();

  const handleThemeChange = () => {
    updateSetting("theme", settings.theme === "dark" ? "light" : "dark");
  };

  return (
    <div id="options">
      <button id="optionsCloseButton" onClick={onClose}>
        X
      </button>
      <div>
        <ul>
          <li>
            <ToggleComponent />
          </li>
          <li>
            <button
              onClick={() => updateSetting("conditionReminderOn", !settings.conditionReminderOn)}
              id="buttonConditionReminder"
            >
              Condition Reminder Pop-up: {settings.conditionReminderOn ? "Off" : "On"}
            </button>
          </li>
          <li>
            <button
              onClick={() => updateSetting("currentTurnTime", !settings.currentTurnTime)}
              id="buttonCurrentTurnTime"
            >
              Current Turn Time Display: {settings.currentTurnTime ? "On" : "Off"}
            </button>
          </li>
          <li>
            <button onClick={() => updateSetting("tourReady", !settings.tourReady)} id="buttonTourReady">
              {settings.tourReady ? "Tour Available" : "Reset Tour"}
            </button>
          </li>
          <li id="colorMode">
            {isSupporter && (
              <button
                onClick={handleThemeChange}
                style={{
                  backgroundColor: settings.theme === "dark" ? "var(--color-fg)" : "var(--color-hero-bg1)",
                  color: settings.theme === "dark" ? "var(--color-bg1)" : "var(--color-roweven)",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                {settings.theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </button>
            )}
          </li>
          <li></li>
        </ul>
      </div>
    </div>
  );
}
