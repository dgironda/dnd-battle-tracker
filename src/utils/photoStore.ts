/**
 * Battle reference photos, kept out of localStorage.
 *
 * A photo of the table used to be stashed inside the saved-battle JSON as a
 * base64 data URL, which is the most expensive way to keep an image a browser
 * offers. Measured on a 1280x720 JPEG at quality 0.7:
 *
 *   183 KB as a JPEG
 *   244 KB once base64 has added its third
 *   488 KB once localStorage stores those characters as UTF-16
 *
 * 2.67x the image, 9.3% of the ~5MB budget for ONE photo, and about ten photos
 * before the whole origin is full — heroes, monsters and battles included.
 * That is why it filled up so fast.
 *
 * IndexedDB takes Blobs as bytes: no base64, no UTF-16, and a quota measured in
 * hundreds of megabytes rather than five. So the photos live here and the
 * saved battle keeps only an id.
 *
 * Everything degrades rather than throws: a browser with IndexedDB blocked
 * (private mode in some versions) simply has no photos, which is a battle
 * without a picture rather than a battle that will not save.
 */

const DB_NAME = "battletracker-photos";
const DB_VERSION = 1;
const STORE = "photos";

export interface StoredPhoto {
  /** Full-size, for the lightbox. */
  full: Blob;
  /** Small, for the card — so a list of battles is not decoding megapixels. */
  thumb: Blob;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });

  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        let request: IDBRequest<T>;
        try {
          request = run(db.transaction(STORE, mode).objectStore(STORE));
        } catch {
          resolve(null);
          return;
        }
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => resolve(null);
      }),
  );
}

export function putPhoto(id: string, photo: StoredPhoto): Promise<unknown> {
  return tx("readwrite", (store) => store.put(photo, id));
}

export function getPhoto(id: string): Promise<StoredPhoto | null> {
  return tx<StoredPhoto>("readonly", (store) => store.get(id));
}

export function deletePhoto(id: string): Promise<unknown> {
  return tx("readwrite", (store) => store.delete(id));
}

export async function listPhotoIds(): Promise<string[]> {
  const keys = await tx<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
  return (keys ?? []).map(String);
}

/**
 * Drop photos nothing points at any more.
 *
 * Deleting a battle deletes its photo directly; this is the sweep for what
 * that missed — an import that never brought its photos, a battle removed by a
 * build that predates this store.
 */
export async function pruneOrphans(liveIds: Iterable<string>): Promise<number> {
  const keep = new Set(liveIds);
  const all = await listPhotoIds();
  let removed = 0;
  for (const id of all) {
    if (!keep.has(id)) {
      await deletePhoto(id);
      removed++;
    }
  }
  return removed;
}

/* ------------------------------------------------------------ conversions */

/** A data URL back into bytes, for moving legacy photos across. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma === -1) return null;
  const meta = dataUrl.slice(5, comma);
  const isBase64 = meta.endsWith(";base64");
  const type = (isBase64 ? meta.slice(0, -7) : meta) || "image/jpeg";
  try {
    const body = dataUrl.slice(comma + 1);
    if (!isBase64) return new Blob([decodeURIComponent(body)], { type });
    const binary = atob(body);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new Blob([bytes], { type });
  } catch {
    return null;
  }
}

/** Bytes back to a data URL, for the export file — which is text. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * A blob URL for display, and the function to release it.
 *
 * Object URLs live until revoked or the document goes away, so a list that
 * mints one per card and never lets go leaks the whole set.
 */
export function objectUrl(blob: Blob): { url: string; release: () => void } {
  const url = URL.createObjectURL(blob);
  return { url, release: () => URL.revokeObjectURL(url) };
}
