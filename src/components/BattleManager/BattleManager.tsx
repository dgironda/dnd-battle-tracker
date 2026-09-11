import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Hero, Monster, Combatant } from '../../types/index';
import { useCombat } from '../BattleTracker/CombatContext';
import {
  getHeroes,
  storeHeroes,
  getMonsters,
  storeMonsters,
  getCombatants,
  getRoundNumber,
  storeCombatants,
  writeKey,
  STORAGE_KEYS,
  StorageQuotaError,
} from "../../utils/LocalStorage";
import { useReloadRosters } from "../../hooks/rosterContext";
import { Popup } from '../../utils/Popup';
import { shareEncounter } from '../../utils/monsterShareURL';
import BattlePhotoThumbnail from './BattlePhotoThumbnail';
import StorageWarning from '../../utils/StorageWarning';
import { compressImageForUpload } from '../../utils/imageCompression';
import {
  putPhoto,
  getPhoto,
  deletePhoto,
  pruneOrphans,
  dataUrlToBlob,
  blobToDataUrl,
} from '../../utils/photoStore';
import { notify, confirmDialog } from '../../utils/notify';
import Icon from '../Icon';

interface SavedBattle {
  id: string;
  name: string;
  savedDate: string;
  combatants: Combatant[];
  roundNumber: number;
  currentTurnIndex: number;
  /**
   * Legacy: the photo as a base64 data URL, inline. Read on load and moved
   * into IndexedDB — see photoStore for why keeping it here was so expensive.
   * Never written any more.
   */
  photo?: string;
  /** Key into the IndexedDB photo store. */
  photoId?: string;
}

interface ExportedData {
  _header: Record<string, string>;
  heroes: Hero[];
  monsters: Monster[];
  combatants: Combatant[];
  round: number;
  currentTurnIndex: number;
  battles: SavedBattle[];
}

interface BattleManagerProps {
  onClose: () => void;
}

/**
 * Ceiling on an imported file.
 *
 * This was 5MB "to stay inside the localStorage budget", but the two are not
 * the same thing and the mismatch was a trap: photos travel in the file as
 * base64, so an export with a dozen of them came out larger than the app would
 * accept back — you could produce a backup you could not restore. Photos now
 * go to IndexedDB on the way in, so the file size no longer bears on the
 * localStorage budget at all, and this is just a guard against reading
 * something absurd into memory.
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_ENTRIES = 1000;

const BattleManager: React.FC<BattleManagerProps> = ({ onClose }) => {
  const {
    combatants,
    setCombatants,
    roundNumber,
    setRoundNumber,
    currentTurnIndex,
    setCurrentTurnIndex,
  } = useCombat();
  const reloadRosters = useReloadRosters();

  const [savedBattles, setSavedBattles] = useState<SavedBattle[]>([]);
  const [battleName, setBattleName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState<SavedBattle | null>(null);
  /* Held as bytes with a preview URL beside them, rather than as a base64
     string: it is what goes into the store, and it keeps a ~500KB string off
     the heap for the whole time the dialog is open. */
  const [selectedPhoto, setSelectedPhoto] = useState<
    { full: Blob; thumb: Blob; previewUrl: string } | null
  >(null);
  const [showImportConfirmPopup, setShowImportConfirmPopup] = useState(false);

  useEffect(() => {
    loadSavedBattles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSavedBattles = async () => {
    let stored: SavedBattle[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.savedBattles);
      if (raw) stored = JSON.parse(raw);
      if (!Array.isArray(stored)) stored = [];
    } catch (error) {
      console.error('Error loading saved battles:', error);
      await notify('Your saved battles could not be read, so none are listed.', {
        title: 'Saved battles unavailable',
        tone: 'warning',
      });
      return;
    }

    /* Move any inline photo into IndexedDB and drop it from localStorage.
       This is the migration that reclaims the space: a single 1280x720 photo
       was costing ~488KB of the ~5MB budget, so a user with three of them gets
       roughly a third of their storage back the first time they open this
       panel. */
    let migrated = 0;
    const cleaned: SavedBattle[] = [];
    for (const battle of stored) {
      if (battle.photo && !battle.photoId) {
        const blob = dataUrlToBlob(battle.photo);
        if (blob) {
          // No separate thumbnail exists for legacy photos; the full one
          // stands in until the battle is saved again.
          await putPhoto(battle.id, { full: blob, thumb: blob });
          migrated++;
        }
        const { photo: _dropped, ...rest } = battle;
        void _dropped;
        cleaned.push({ ...rest, photoId: blob ? battle.id : undefined });
      } else {
        cleaned.push(battle);
      }
    }

    setSavedBattles(cleaned);
    if (migrated > 0) {
      await persistBattles(cleaned);
    }
    // Photos whose battle is long gone are just occupying space.
    void pruneOrphans(cleaned.map((b) => b.photoId).filter((id): id is string => !!id));
  };

  /** Persist the battle list, reporting a full quota instead of throwing. */
  const persistBattles = useCallback(async (battles: SavedBattle[]): Promise<boolean> => {
    try {
      writeKey(STORAGE_KEYS.savedBattles, JSON.stringify(battles));
      return true;
    } catch (error) {
      if (error instanceof StorageQuotaError) {
        await notify(error.message, { title: 'Storage full', tone: 'danger' });
        return false;
      }
      throw error;
    }
  }, []);

  const saveBattle = async () => {
    if (!battleName.trim()) {
      await notify('Give the battle a name so you can find it later.', { title: 'Name required' });
      return;
    }

    if (combatants.length === 0) {
      await notify('There is no active battle to save.', { title: 'Nothing to save' });
      return;
    }

    const id = crypto.randomUUID(); // Date.now() collided when two saves landed in the same ms

    /* The photo goes to IndexedDB first: if that fails there is simply no
       photo, which must not stop the battle being saved. It was recorded on
       the battle either way, which left the card pointing at a picture that
       had never been written — and said nothing about it. */
    let photoId: string | undefined;
    if (selectedPhoto) {
      const stored = await putPhoto(id, {
        full: selectedPhoto.full,
        thumb: selectedPhoto.thumb,
      });
      if (stored !== null) photoId = id;
    }

    const newBattle: SavedBattle = {
      id,
      name: battleName.trim(),
      savedDate: new Date().toISOString(),
      combatants,
      roundNumber,
      currentTurnIndex,
      photoId,
    };

    const updated = [...savedBattles, newBattle];
    // Write first — if the quota is blown, don't claim success.
    if (!(await persistBattles(updated))) {
      if (photoId) await deletePhoto(photoId);
      return;
    }

    setSavedBattles(updated);
    setBattleName('');
    clearSelectedPhoto();
    setShowSaveDialog(false);
    await notify(
      selectedPhoto && !photoId
        ? `"${newBattle.name}" saved, but this browser would not store its photo.`
        : `"${newBattle.name}" saved.`,
      { title: 'Battle saved' }
    );
  };

  const deleteBattle = async (id: string) => {
    const target = savedBattles.find((b) => b.id === id);
    const ok = await confirmDialog(
      `Delete "${target?.name ?? 'this battle'}"? This can't be undone.`,
      { title: 'Delete saved battle', tone: 'danger', confirmLabel: 'Delete' }
    );
    if (!ok) return;

    const updated = savedBattles.filter((b) => b.id !== id);
    if (!(await persistBattles(updated))) return;
    // The photo is the expensive part; it goes with the battle.
    if (target?.photoId) await deletePhoto(target.photoId);
    setSavedBattles(updated);
    if (selectedBattle?.id === id) {
      setSelectedBattle(null);
    }
  };

  const loadBattle = async (battle: SavedBattle) => {
    if (combatants.length > 0) {
      const ok = await confirmDialog(
        'Loading this battle replaces the one in progress. Continue?',
        { title: 'Replace current battle', confirmLabel: 'Load battle' }
      );
      if (!ok) return;
    }

    setCombatants(battle.combatants);
    setRoundNumber(battle.roundNumber);
    // Clamp: a saved index can point past the end if the battle was edited.
    setCurrentTurnIndex(
      Math.min(Math.max(battle.currentTurnIndex ?? 0, 0), Math.max(battle.combatants.length - 1, 0))
    );

    await notify(`"${battle.name}" loaded.`, { title: 'Battle loaded' });
    onClose();
  };

  const getBattleStats = (battle: SavedBattle) => {
    const heroes = battle.combatants.filter(c => c.type === 'hero').length;
    const monsters = battle.combatants.filter(c => c.type === 'monster').length;
    return { heroes, monsters, total: battle.combatants.length };
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadFile = ({ data, fileName, fileType }: { data: string; fileName: string; fileType: string }) => {
    const blob = new Blob([data], { type: fileType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = fileName;
    a.href = url;
    a.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
    a.remove();
    // The old version never revoked this, leaking a blob per export.
    window.URL.revokeObjectURL(url);
  };

  const exportAllToJson = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const exportDate = new Date().toISOString();

    /* The file is text, so the photos have to come back out of IndexedDB as
       base64 for the trip. Only the full-size one: a thumbnail is derived, and
       doubling the file to carry something regenerable is a poor trade. */
    const battlesWithPhotos: SavedBattle[] = [];
    for (const battle of savedBattles) {
      if (!battle.photoId) {
        battlesWithPhotos.push(battle);
        continue;
      }
      const stored = await getPhoto(battle.photoId);
      if (!stored) {
        battlesWithPhotos.push(battle);
        continue;
      }
      try {
        battlesWithPhotos.push({ ...battle, photo: await blobToDataUrl(stored.full) });
      } catch {
        battlesWithPhotos.push(battle);
      }
    }

    const allData: ExportedData = {
      _header: {
        application: "Battle Tracker",
        website: "https://battletracker.simulacrumtechnologies.com/",
        exportDate,
        exportFrom: navigator.userAgent,
        disclaimer:
          "This data belongs to the user who exported it. Battle Tracker and Simulacrum Technologies make no claim to ownership of user-generated content.",
      },
      heroes: getHeroes() ?? [],
      // The monster roster used to be read here and then left out of the
      // payload, so every backup silently lost the Monster Manager.
      monsters: getMonsters() ?? [],
      combatants: getCombatants() ?? [],
      round: getRoundNumber(),
      currentTurnIndex,
      battles: battlesWithPhotos,
    };

    downloadFile({
      data: JSON.stringify(allData, null, 2),
      fileName: `BattleTracker-data-${exportDate.replace(/[:.]/g, '-')}.json`,
      fileType: 'application/json',
    });
  };

  /**
   * Share what is in the Monster Manager as a named encounter.
   *
   * The roster is what a DM preps into, so it is the natural thing to send.
   * Read at click time rather than held in state — this panel does not
   * otherwise care about the roster, and a stale copy would share the wrong
   * monsters.
   */
  const shareRoster = async () => {
    await shareEncounter(getMonsters() ?? []);
  };

  /**
   * Share the monsters out of a saved battle.
   *
   * The heroes are left behind on purpose: the recipient brings their own
   * party. The battle's name is offered as the encounter's, since that is
   * almost always what it should be called.
   */
  const shareSavedBattle = async (battle: SavedBattle) => {
    const monsters = battle.combatants
      .filter((c) => c.type === 'monster')
      .map((c) => ({
        id: c.id,
        name: c.name,
        link: c.link ?? '',
        // Full health, not whatever they were left on: an encounter is the
        // fight before anyone has rolled.
        hp: c.maxHp,
        maxHp: c.maxHp,
        currHp: c.maxHp,
        ac: c.ac,
        str: c.str, dex: c.dex, con: c.con,
        int: c.int, wis: c.wis, cha: c.cha,
        pp: c.pp, init: c.init,
        hidden: false,
        present: true,
        conditions: [],
      }));

    if (monsters.length === 0) {
      await notify(`"${battle.name}" has no monsters in it to share.`, {
        title: 'Nothing to share',
      });
      return;
    }
    await shareEncounter(monsters, { suggestedName: battle.name });
  };

  const handleImport = () => {
    setShowImportConfirmPopup(true);
  };

  const handleImportContinue = () => {
    setShowImportConfirmPopup(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) importFromJson(file);
    };
    input.click();
  };

  const isValidGameData = (data: unknown): data is Partial<ExportedData> => {
    if (data === null || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return 'heroes' in d && 'combatants' in d && 'round' in d && 'battles' in d;
  };

  const importFromJson = (file: File) => {
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      notify('Choose a .json file exported from the Battle Tracker.', { title: 'Wrong file type' });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      notify(`That file is larger than ${MAX_FILE_SIZE / 1024 / 1024}MB.`, { title: 'File too large' });
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const jsonString = event.target?.result as string;
        const importedData: unknown = JSON.parse(jsonString);

        if (!isValidGameData(importedData)) {
          await notify(
            'That file is missing heroes, combatants, battles or round data.',
            { title: 'Unrecognised file', tone: 'warning' }
          );
          return;
        }

        const incomingHeroes = Array.isArray(importedData.heroes) ? importedData.heroes : null;
        const incomingCombatants = Array.isArray(importedData.combatants) ? importedData.combatants : null;
        const incomingBattles = Array.isArray(importedData.battles) ? importedData.battles : null;
        // Monsters are optional so files exported before the fix still load.
        const incomingMonsters = Array.isArray(importedData.monsters) ? importedData.monsters : [];

        if (!incomingHeroes || !incomingCombatants || !incomingBattles) {
          await notify('The heroes, combatants and battles in that file are not lists.', {
            title: 'Invalid file', tone: 'warning',
          });
          return;
        }

        const round = importedData.round;
        if (typeof round !== 'number' || round < 0 || !Number.isFinite(round)) {
          await notify('That file has an invalid round number.', { title: 'Invalid file', tone: 'warning' });
          return;
        }

        const existingHeroes = getHeroes() ?? [];
        const existingMonsters = getMonsters() ?? [];
        const existingBattles = savedBattles ?? [];

        const existingHeroIds = new Set(existingHeroes.map(h => h.id));
        const existingMonsterIds = new Set(existingMonsters.map(m => m.id));
        const existingBattleIds = new Set(existingBattles.map(b => b.id));

        // Give anything that clashes with what's already stored a fresh id.
        const reId = <T extends { id: string }>(items: T[], taken: Set<string>): T[] =>
          items.map((item) => (taken.has(item.id) ? { ...item, id: crypto.randomUUID() } : item));

        const mergedHeroes = [...existingHeroes, ...reId(incomingHeroes, existingHeroIds)];
        const mergedMonsters = [...existingMonsters, ...reId(incomingMonsters, existingMonsterIds)];
        const mergedBattles = [...existingBattles, ...reId(incomingBattles, existingBattleIds)];

        if (
          mergedHeroes.length > MAX_ENTRIES ||
          mergedMonsters.length > MAX_ENTRIES ||
          incomingCombatants.length > MAX_ENTRIES ||
          mergedBattles.length > MAX_ENTRIES
        ) {
          await notify(`That would leave more than ${MAX_ENTRIES} entries in one list.`, {
            title: 'Too much data', tone: 'warning',
          });
          return;
        }

        /* The rosters and the saved battles MERGE — that is what the prompt
           promises and what makes importing safe to do mid-session.

           The battle in progress is the exception, and it used to be replaced
           without asking. A file exported while no battle was running carries
           `combatants: []`, so importing a friend's backup could silently
           clear the fight on the table. It is now only touched when there is
           something to put there AND the user says so. */
        const wantsBattle = incomingCombatants.length > 0;
        let replaceBattle = false;
        if (wantsBattle) {
          replaceBattle =
            combatants.length === 0 ||
            (await confirmDialog(
              `That file has a battle in it (${incomingCombatants.length} combatants). ` +
                `Loading it replaces the one you have in progress. Your heroes, monsters and saved ` +
                `battles are merged either way.`,
              {
                title: 'Replace the battle in progress?',
                tone: 'warning',
                confirmLabel: 'Replace battle',
                cancelLabel: 'Keep mine',
              }
            ));
        }

        // Every write goes through the shared key constants. The round used to
        // be written to "roundnumber" here while the app read "roundNumber",
        // so the imported round was silently discarded.
        /* A file's battles carry their photo inline, which is where they used
           to live. Move each one into IndexedDB and strip it from the record
           before any of this reaches localStorage — importing a backup with
           photos in it would otherwise blow the budget on the spot. */
        const rehomed: SavedBattle[] = [];
        for (const battle of mergedBattles) {
          if (!battle.photo) {
            rehomed.push(battle);
            continue;
          }
          const blob = dataUrlToBlob(battle.photo);
          const { photo: _inline, ...rest } = battle;
          void _inline;
          if (blob) {
            await putPhoto(battle.id, { full: blob, thumb: blob });
            rehomed.push({ ...rest, photoId: battle.id });
          } else {
            rehomed.push(rest);
          }
        }

        storeHeroes(mergedHeroes);
        storeMonsters(mergedMonsters);
        await persistBattles(rehomed);

        // Push the imported state into the live app instead of reloading.
        reloadRosters();
        setSavedBattles(rehomed);

        if (replaceBattle) {
          storeCombatants(incomingCombatants, round);
          setCombatants(incomingCombatants);
          setRoundNumber(round);
          setCurrentTurnIndex(
            Math.min(
              Math.max(typeof importedData.currentTurnIndex === 'number' ? importedData.currentTurnIndex : 0, 0),
              Math.max(incomingCombatants.length - 1, 0)
            )
          );
        }

        const battleLine = replaceBattle
          ? ' The battle in the file is now on the table.'
          : wantsBattle
            ? ' The battle in the file was left out; yours is untouched.'
            : '';

        await notify(
          `Imported ${incomingHeroes.length} heroes, ${incomingMonsters.length} monsters and ` +
            `${incomingBattles.length} saved battles.${battleLine}`,
          { title: 'Import complete' }
        );
      } catch (error) {
        console.error('Error importing data:', error);
        if (error instanceof StorageQuotaError) {
          await notify(error.message, { title: 'Storage full', tone: 'danger' });
        } else if (error instanceof SyntaxError) {
          await notify('That file is not valid JSON.', { title: 'Could not read file', tone: 'warning' });
        } else {
          await notify('Something went wrong reading that file.', { title: 'Import failed', tone: 'danger' });
        }
      }
    };

    reader.onerror = () => {
      notify('Something went wrong reading that file.', { title: 'Import failed', tone: 'danger' });
    };

    reader.readAsText(file);
  };

  /** Release the preview's object URL — one per pick, or they accumulate. */
  const clearSelectedPhoto = useCallback(() => {
    setSelectedPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  /**
   * A picked file, compressed into the two sizes a battle keeps — or null,
   * having already said why not.
   *
   * Shared by the save form and by the controls on a saved card, so a photo
   * added after the fact is stored exactly like one added while saving.
   */
  const readPhoto = async (file: File): Promise<{ full: Blob; thumb: Blob } | null> => {
    if (!file.type.startsWith('image/')) {
      await notify('Choose an image file.', { title: 'Wrong file type' });
      return null;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      await notify('Choose an image smaller than 10MB.', { title: 'Image too large' });
      return null;
    }

    try {
      const compressed = await compressImageForUpload(file, {
        thumbnailMaxWidth: 200,
        thumbnailMaxHeight: 200,
        // Reference photos are read on a laptop, not printed. 1280px at 0.7
        // keeps them legible while keeping the store small enough that a
        // campaign's worth of battles fits in it.
        fullScreenMaxWidth: 1280,
        fullScreenMaxHeight: 720,
        quality: 0.7,
      });

      /* Both sizes are kept now. The thumbnail was being generated and thrown
         away, so every card in the list was decoding the full-size image to
         draw a 200px box. */
      const full = dataUrlToBlob(compressed.fullScreen);
      const thumb = dataUrlToBlob(compressed.thumbnail) ?? full;
      if (!full || !thumb) throw new Error('Could not read the compressed image');
      return { full, thumb };
    } catch (error) {
      console.error('Image compression failed:', error);
      await notify('That image could not be processed. Try a different one.', {
        title: 'Image failed', tone: 'danger',
      });
      return null;
    }
  };

  /** The save form's picker: held until the battle itself is saved. */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    // Cleared straight away, so the same file can be picked again after a
    // removal — or after being turned down for its type or its size.
    input.value = '';
    if (!file) return;

    const photo = await readPhoto(file);
    if (!photo) return;

    clearSelectedPhoto();
    setSelectedPhoto({ ...photo, previewUrl: URL.createObjectURL(photo.thumb) });
  };

  const removePhoto = () => {
    clearSelectedPhoto();
  };

  /* ------------------------------------------------- photos on a saved card
     A photo could only ever be attached in the save form above, and that form
     is only on screen while a fight is running — so a battle already saved
     could not be given one, and one attached by mistake could not be taken off
     again without deleting the battle.

     One hidden picker serves every card. Which battle asked for it is noted on
     the way in and read back when the file arrives: a ref rather than state,
     because nothing renders from it. */
  const battlePhotoInput = useRef<HTMLInputElement>(null);
  const photoTarget = useRef<string | null>(null);

  const pickPhotoFor = (battleId: string) => {
    photoTarget.current = battleId;
    battlePhotoInput.current?.click();
  };

  /**
   * Put a photo on a saved battle, or swap the one it has.
   *
   * The key is fresh every time rather than the battle's own id, because the
   * thumbnail caches by key: reusing it would leave the old picture on the
   * card until the panel was next opened. And nothing is deleted until the
   * battle is safely pointing at the new photo, so a write that fails leaves
   * the old one exactly where it was.
   */
  const attachPhoto = async (battleId: string, photo: { full: Blob; thumb: Blob }) => {
    const target = savedBattles.find((b) => b.id === battleId);
    if (!target) return;

    const photoId = crypto.randomUUID();
    if ((await putPhoto(photoId, photo)) === null) {
      await notify(
        'This browser would not store the photo. Private browsing usually blocks it.',
        { title: 'Photo not saved', tone: 'warning' }
      );
      return;
    }

    const updated = savedBattles.map((b) => (b.id === battleId ? { ...b, photoId } : b));
    if (!(await persistBattles(updated))) {
      await deletePhoto(photoId);
      return;
    }

    if (target.photoId) await deletePhoto(target.photoId);
    setSavedBattles(updated);
  };

  const handleBattlePhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = '';
    const battleId = photoTarget.current;
    photoTarget.current = null;
    if (!file || !battleId) return;

    const photo = await readPhoto(file);
    if (photo) await attachPhoto(battleId, photo);
  };

  const removeBattlePhoto = async (battle: SavedBattle) => {
    if (!battle.photoId) return;

    const ok = await confirmDialog(
      `Remove the photo from "${battle.name}"? The saved battle itself is kept.`,
      { title: 'Remove photo', tone: 'danger', confirmLabel: 'Remove photo' }
    );
    if (!ok) return;

    const updated = savedBattles.map((b) => {
      if (b.id !== battle.id) return b;
      const { photoId: _gone, ...rest } = b;
      void _gone;
      return rest;
    });
    if (!(await persistBattles(updated))) return;

    await deletePhoto(battle.photoId);
    setSavedBattles(updated);
  };

  return (
    <div id="battleAddManage">
      <button className="saveClose" id="bmSaveCloseButton" onClick={onClose} aria-label="Close Battle Manager">X</button>
      <div className='battle-content'>
        <h2>Battle Manager</h2>

        {/* Save Current Battle Section */}
        <div id="saveBattleOuter">
          <h3>Save Current Battle</h3>
          {combatants.length > 0 ? (
            <div>
              {/* What is on the table right now, as figures rather than a
                  sentence - it is the thing being saved. */}
              <p className="battle-info">
                {([
                  ['hero', combatants.filter(c => c.type === 'hero').length, 'Hero'],
                  ['monster', combatants.filter(c => c.type === 'monster').length, 'Monster'],
                ] as const).map(([key, count, noun]) => (
                  <span className="battleFact" key={key}>
                    <span className="battleFactValue">{count}</span>
                    <span className="battleFactLabel">{count === 1 ? noun : `${noun}s`}</span>
                  </span>
                ))}
                <span className="battleFact">
                  <span className="battleFactValue">{roundNumber}</span>
                  <span className="battleFactLabel">Round</span>
                </span>
              </p>

              {!showSaveDialog ? (
                <button
                  className="btn-save-battle"
                  onClick={() => setShowSaveDialog(true)}
                >
                  Save Current Battle
                </button>
              ) : (
                <div className="save-dialog">
                  <input
                    type="text"
                    placeholder="Enter battle name (e.g., 'Dragon Cave - Session 5')"
                    value={battleName}
                    onChange={(e) => setBattleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveBattle();
                    }}
                    aria-label="Battle name"
                    autoFocus
                  />
                  <div className="photo-upload-section">
                    <label htmlFor="photo-upload" className="photo-upload-label">
                      Reference photo <span className="optionalNote">(optional)</span>
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      className="btn-upload-photo"
                    >
                      {selectedPhoto ? 'Photo attached' : 'Choose photo'}
                    </button>

                    {selectedPhoto && (
                      <div className="photo-preview">
                        <img src={selectedPhoto.previewUrl} alt="Reference photo preview" />
                        {/* The mark, not the word: this is a 1.6em disc sitting
                            on the corner of the preview, and "Remove" was
                            spilling out of it across the photo. */}
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="btn-remove-photo"
                          title="Remove this photo"
                          aria-label="Remove the photo"
                        >
                          X
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="save-dialog-buttons">
                    <button onClick={saveBattle}>Save</button>
                    <button onClick={() => {
                      setShowSaveDialog(false);
                      setBattleName('');
                      clearSelectedPhoto();
                    }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="no-battle-warning">No active battle to save. Start a battle first!</p>
          )}
        </div>

        {/* Export/Import */}
        <div id="exportImportBattles">
          <h3>Your Data</h3>
          <div className="dataRow">
            <button id="buttonDownloadData" onClick={exportAllToJson}>
              Download everything
            </button>
            <span className="dataNote">
              Heroes, monsters, saved battles and the current fight, as one file.
            </span>
          </div>
          <div className="dataRow">
            <button id="inputImportData" onClick={handleImport}>Upload a file</button>
            <span className="dataNote">
              Merges that file into what you already have - it does not replace it.
            </span>
          </div>
          <div className="dataRow">
            <button id="buttonMonsterShareURL" onClick={shareRoster}>
              Share encounter
            </button>
            <span className="dataNote">
              Names your Monster Manager roster and copies a link to it. Whoever opens it gets the
              monsters — they bring their own heroes.
            </span>
          </div>
        </div>

        {/* Saved Battles List */}
        <div id="savedBattlesOuter">
          <StorageWarning threshold={3 * 1024 * 1024} />
          <h3>Saved Battles ({savedBattles.length})</h3>

          {savedBattles.length === 0 ? (
            <p className="empty-state">No saved battles yet. Save your current battle above!</p>
          ) : (
            <div className="battles-list">
              {[...savedBattles]
                .sort((a, b) => new Date(b.savedDate).getTime() - new Date(a.savedDate).getTime())
                .map(battle => {
                  const stats = getBattleStats(battle);
                  const isSelected = selectedBattle?.id === battle.id;

                  return (
                    <div
                      key={battle.id}
                      className={`battle-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedBattle(isSelected ? null : battle)}
                    >
                      {battle.photoId && (
                        <BattlePhotoThumbnail
                          photoId={battle.photoId}
                          name={battle.name}
                          onChange={() => pickPhotoFor(battle.id)}
                          onRemove={() => removeBattlePhoto(battle)}
                        />
                      )}

                      <div className="battle-card-header">
                        <h4>{battle.name}</h4>
                        <div className="battle-card-actions">
                          <button
                            className="btn-load"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadBattle(battle);
                            }}
                            title="Load this battle"
                          >
                            Load
                          </button>
                          <button
                            className="btn-share"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareSavedBattle(battle);
                            }}
                            title="Copy a link to this battle's monsters"
                            aria-label={`Share the monsters from ${battle.name}`}
                          >
                            Share
                          </button>
                          <button
                            className="btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBattle(battle.id);
                            }}
                            title="Delete this battle"
                            aria-label={`Delete ${battle.name}`}
                          >
                            <Icon name="delete" color="currentColor" size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="battle-card-info">
                        <div className="battle-card-facts">
                          <p className="battle-stats">
                            <span><b>{stats.heroes}</b> {stats.heroes === 1 ? 'hero' : 'heroes'}</span>
                            <span><b>{stats.monsters}</b> {stats.monsters === 1 ? 'monster' : 'monsters'}</span>
                            <span>round <b>{battle.roundNumber}</b></span>
                          </p>
                          <p className="battle-date">{formatDate(battle.savedDate)}</p>
                        </div>

                        {/* A photo that is already there carries its own
                            controls in the viewer, so this is only ever the
                            way in for a battle without one. */}
                        {!battle.photoId && (
                          <button
                            type="button"
                            className="drawnBtn btn-battle-photo"
                            onClick={(e) => {
                              e.stopPropagation();
                              pickPhotoFor(battle.id);
                            }}
                            title="Add a reference photo to this battle"
                            aria-label={`Add a photo to ${battle.name}`}
                          >
                            Add photo
                          </button>
                        )}
                      </div>

                      {isSelected && (
                        <div className="battle-card-details">
                          <h5>Combatants</h5>
                          <ul>
                            {[...battle.combatants]
                              .sort((a, b) => b.initiative - a.initiative)
                              .map(c => (
                                <li key={c.id} className={`rosterLine is-${c.type}`}>
                                  <span className="rosterInit">{c.initiative}</span>
                                  <span className="rosterName">{c.name}</span>
                                  <span className="rosterHp">
                                    {c.currHp}/{c.maxHp}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* The one picker behind every card's photo button — see pickPhotoFor. */}
          <input
            ref={battlePhotoInput}
            type="file"
            accept="image/*"
            onChange={handleBattlePhotoPicked}
            aria-label="Choose a photo for a saved battle"
            style={{ display: 'none' }}
          />
        </div>

        <Popup
          message="Your heroes, monsters and saved battles are merged with what the file holds — nothing is overwritten. If the file also contains a battle in progress, you will be asked before it replaces yours."
          isOpen={showImportConfirmPopup}
          onCancel={() => setShowImportConfirmPopup(false)}
          onContinue={handleImportContinue}
          title="Import new data"
        />
      </div>
    </div>
  );
};

export default BattleManager;
