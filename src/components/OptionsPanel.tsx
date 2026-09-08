import { useGlobalContext } from "../hooks/optionsContext";
import { TOUR_ENABLED } from "../utils/devmode";
import ToggleComponent from "./ToggleContext";
import { WALLPAPERS, type Wallpaper } from "../constants/Wallpapers";
import Icon from "./Icon";

interface OptionsPanelProps {
  onClose: () => void;
  isSupporter: boolean;
  /** Raised when a locked paper is picked, so App can put the prompt up. */
  onLockedPick: () => void;
}

export default function OptionsPanel({ onClose, isSupporter, onLockedPick }: OptionsPanelProps) {
  const { settings, updateSetting } = useGlobalContext();

  /* Picking a paper also sets the theme, because only one of them is dark.
     Keeping these as two controls let them disagree — dark mode with the
     cream paper, or the other way round — and neither combination was one
     anybody chose on purpose. */
  const choosePaper = (paper: Wallpaper) => {
    updateSetting("wallpaper", paper.id);
    updateSetting("theme", paper.dark ? "dark" : "light");
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
          {/* The tour is off (see TOUR_ENABLED in App.tsx); its control would
              only offer to reset something nobody can reach. The setting and
              this markup stay for when it comes back. */}
          {TOUR_ENABLED && (
            <li>
              <button onClick={() => updateSetting("tourReady", !settings.tourReady)} id="buttonTourReady">
                {settings.tourReady ? "Tour Available" : "Reset Tour"}
              </button>
            </li>
          )}
          <li id="colorMode">
            {/* The grid is shown to everyone. A locked paper still reads as a
                colour you could have — a row of two would not tell anybody
                what they are missing — and picking one raises the prompt
                rather than doing nothing. */}
            <h2 id="wallpaperHeading">Paper</h2>
            <div className="wallpaperGrid" role="radiogroup" aria-labelledby="wallpaperHeading">
              {WALLPAPERS.map((paper) => {
                const chosen = settings.wallpaper === paper.id;
                const locked = paper.supporterOnly && !isSupporter;
                return (
                  <button
                    key={paper.id}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    className={
                      `wallpaperSwatch is-${paper.id}` +
                      (chosen ? " isChosen" : "") +
                      (locked ? " isLocked" : "")
                    }
                    title={locked ? `${paper.label} — supporters only` : paper.label}
                    onClick={() => {
                      if (locked) {
                        onLockedPick();
                        return;
                      }
                      if (!chosen) choosePaper(paper);
                    }}
                  >
                    <span className="visuallyHidden">
                      {locked ? `${paper.label}, supporters only` : paper.label}
                    </span>
                    {locked && (
                      <span className="wallpaperLock" aria-hidden="true">
                        <Icon name="lock" size={16} color="currentColor" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </li>
          <li></li>
        </ul>
      </div>
    </div>
  );
}
