/**
 * Generic String Storage Interface (matches reference project)
 */

export interface GenericStringStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}

export class LocalStorageAdapter implements GenericStringStorage {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
  }
}

