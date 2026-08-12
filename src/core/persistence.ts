import type { ReadingListItem } from "./types";

const STORAGE_KEY = "tbradar.session.v1";

export interface SavedSession {
  readingList: ReadingListItem[];
  ocrText: string;
  threshold: number;
}

function isSavedSession(value: unknown): value is SavedSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedSession>;
  return (
    Array.isArray(candidate.readingList) &&
    typeof candidate.ocrText === "string" &&
    typeof candidate.threshold === "number"
  );
}

export function loadSession(storage: Storage = window.localStorage): SavedSession | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSavedSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(
  session: SavedSession,
  storage: Storage = window.localStorage,
): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(storage: Storage = window.localStorage): void {
  storage.removeItem(STORAGE_KEY);
}
