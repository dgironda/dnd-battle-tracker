import { useGlobalContext } from "../hooks/optionsContext";
import { TOUR_ENABLED } from "../utils/devmode";
import ToggleComponent from "./ToggleContext";
import {
  PAPER_STYLES,
  WALLPAPERS,
  tileUrl,
  wallpaperById,
  type PaperStyleId,
  type Wallpaper,
  type WallpaperId,
} from "../constants/Wallpapers";
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

  /* Every preview is painted in the OTHER half of the choice: the styles are
     shown in the colour you are on, the colours in the style you are on. Each
     button then shows what it would actually give you, rather than a fixed
     catalogue of art you have to imagine recoloured. */
  const chosen = wallpaperById(settings.wallpaper);
  /* Quoted for the same reason ConditionMark quotes its mask: an asset Vite
     chose to inline arrives as a data: URI full of raw parens, and an unquoted
     url() ends at the first of them. These tiles are far too big to be inlined
     today, which is not a thing to rely on. */
  const tile = (style: PaperStyleId, colour: WallpaperId) => ({
    backgroundImage: `url(${JSON.stringify(tileUrl(style, colour))})`,
  });

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
            <h2 id="wallpaperHeading">Paper</h2>

            {/* Named, unlike the colours: nobody can tell what "Armoury" means
                from a 2.7em square, and the pair is small enough to say. */}
            <h3 className="paperSubheading" id="paperStyleHeading">
              Style
            </h3>
            <div className="paperStyleGrid" role="radiogroup" aria-labelledby="paperStyleHeading">
              {PAPER_STYLES.map((style) => {
                const isChosen = settings.paperStyle === style.id;
                /* Neither style is locked today. The gate is here because the
                   next one probably will be, and a lock bolted on later is how
                   a picker ends up with two ways of saying the same thing. */
                const locked = style.supporterOnly && !isSupporter;
                return (
                  <button
                    key={style.id}
                    type="button"
                    role="radio"
                    aria-checked={isChosen}
                    className={"paperStyleChoice" + (isChosen ? " isChosen" : "")}
                    title={locked ? `${style.label} — supporters only` : style.blurb}
                    onClick={() => {
                      if (locked) {
                        onLockedPick();
                        return;
                      }
                      if (!isChosen) updateSetting("paperStyle", style.id);
                    }}
                  >
                    <span
                      className={
                        `wallpaperSwatch paperStyleTile is-${chosen.id}` +
                        (locked ? " isLocked" : "")
                      }
                      style={tile(style.id, chosen.id)}
                      data-tile={`${style.id}-${chosen.id}`}
                      aria-hidden="true"
                    >
                      {locked && (
                        <span className="wallpaperLock">
                          <Icon name="lock" size={16} color="currentColor" />
                        </span>
                      )}
                    </span>
                    <span className="paperStyleName">
                      {style.label}
                      {locked && <span className="visuallyHidden">, supporters only</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* The grid is shown to everyone. A locked paper still reads as a
                colour you could have — a row of two would not tell anybody
                what they are missing — and picking one raises the prompt
                rather than doing nothing. */}
            <h3 className="paperSubheading" id="paperColourHeading">
              Colour
            </h3>
            <div className="wallpaperGrid" role="radiogroup" aria-labelledby="paperColourHeading">
              {WALLPAPERS.map((paper) => {
                const isChosen = settings.wallpaper === paper.id;
                const locked = paper.supporterOnly && !isSupporter;
                return (
                  <button
                    key={paper.id}
                    type="button"
                    role="radio"
                    aria-checked={isChosen}
                    className={
                      `wallpaperSwatch is-${paper.id}` +
                      (isChosen ? " isChosen" : "") +
                      (locked ? " isLocked" : "")
                    }
                    style={tile(settings.paperStyle, paper.id)}
                    data-tile={`${settings.paperStyle}-${paper.id}`}
                    title={locked ? `${paper.label} — supporters only` : paper.label}
                    onClick={() => {
                      if (locked) {
                        onLockedPick();
                        return;
                      }
                      if (!isChosen) choosePaper(paper);
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
