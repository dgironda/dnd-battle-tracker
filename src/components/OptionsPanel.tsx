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
              Condition Reminder Pop-up: {settings.conditionReminderOn ? "On" : "Off"}
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
              <button onClick={handleThemeChange} id="buttonThemeToggle">
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
