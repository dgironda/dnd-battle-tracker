import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { DEVMODE } from "../utils/devmode";
import { STORAGE_KEYS, writeKey } from "../utils/LocalStorage";
import {
  DEFAULT_PAPER_STYLE,
  DEFAULT_WALLPAPER,
  isPaperStyleId,
  isWallpaperId,
  tileUrl,
  type PaperStyleId,
  type WallpaperId,
} from "../constants/Wallpapers";

interface Settings {
  version: 'twentyFourteen' | 'twentyTwentyFour';
  theme: 'light' | 'dark';
  /** True shows the reminder when a combatant's turn starts. */
  conditionReminderOn: boolean;
  currentTurnTime: boolean;
  tourReady: boolean;
  /** Which tile the page is papered with. See constants/Wallpapers.ts. */
  wallpaper: WallpaperId;
  /** Which motifs are on it. The colour and the style are independent. */
  paperStyle: PaperStyleId;
}

interface GlobalContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggleVersion: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  version: "twentyFourteen",
  theme: "light",
  conditionReminderOn: true,
  currentTurnTime: true,
  tourReady: true,
  wallpaper: DEFAULT_WALLPAPER,
  paperStyle: DEFAULT_PAPER_STYLE,
};

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

/**
 * Read stored settings, layered over the defaults.
 *
 * The old version returned JSON.parse(stored) as-is, so any key added after a
 * user last saved came back undefined — which is why `settings.tourReady &&`
 * hid the Start Tour button for everyone with older settings.
 */
function getSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.settings);
    if (!stored) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(stored);
    if (parsed === null || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    const merged: Settings = { ...DEFAULT_SETTINGS, ...parsed };

    // Settings saved before the wallpaper grid existed only recorded a theme.
    // Someone who had chosen dark mode should land on the dark paper rather
    // than being quietly put back on parchment, and an id we no longer ship
    // falls back to the default instead of leaving the page unpapered.
    if (!isWallpaperId(merged.wallpaper)) {
      merged.wallpaper = merged.theme === "dark" ? "midnight" : DEFAULT_WALLPAPER;
    }
    // Settings saved before the style existed carry no paperStyle at all —
    // the merge above hands those the default. This catches the other case:
    // a style we no longer ship, which would leave the page unpapered.
    if (!isPaperStyleId(merged.paperStyle)) {
      merged.paperStyle = DEFAULT_PAPER_STYLE;
    }
    return merged;
  } catch (error) {
    console.error("Error loading settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(getSettings);

  useEffect(() => {
    // Both the attribute and color-scheme are set: the attribute is what CSS
    // keys off (a stable hook, rather than the old selector that string-matched
    // the inline style attribute), and color-scheme makes light-dark() resolve.
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.colorScheme = settings.theme;
  }, [settings.theme]);

  /* The paper is two attributes and one image. The attributes are separate
     from the theme so the two stay independent in CSS — the theme drives the
     app's colours, these drive only the paper — and CSS still keys off them:
     the colour decides how strongly the tile is painted, the style decides
     the size it tiles at.

     The image itself arrives as a custom property rather than as a rule per
     pairing. Two styles across seven colours is fourteen tiles, and fourteen
     blocks of CSS would have to be kept in step with the list in
     constants/Wallpapers.ts by hand; one property, read from the same
     function the picker's previews use, cannot drift from them. */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.wallpaper = settings.wallpaper;
    root.dataset.paperStyle = settings.paperStyle;
    root.style.setProperty(
      "--paper-tile",
      `url(${tileUrl(settings.paperStyle, settings.wallpaper)})`
    );
  }, [settings.wallpaper, settings.paperStyle]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prevSettings: Settings) => {
      const newSettings = { ...prevSettings, [key]: value };
      // Persist outside the updater — see the note in Utils.tsx; StrictMode
      // runs updaters twice, so side effects don't belong in one.
      queueMicrotask(() => writeKey(STORAGE_KEYS.settings, JSON.stringify(newSettings)));
      if (DEVMODE) console.log(`Setting ${String(key)} updated:`, value);
      return newSettings;
    });
  }, []);

  const toggleVersion = useCallback(() => {
    setSettings((prev) => {
      const newSettings: Settings = {
        ...prev,
        version: prev.version === 'twentyFourteen' ? 'twentyTwentyFour' : 'twentyFourteen',
      };
      queueMicrotask(() => writeKey(STORAGE_KEYS.settings, JSON.stringify(newSettings)));
      return newSettings;
    });
  }, []);

  const contextValue = useMemo(
    () => ({ settings, updateSetting, toggleVersion }),
    [settings, updateSetting, toggleVersion]
  );

  return (
    <GlobalContext.Provider value={contextValue}>
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
