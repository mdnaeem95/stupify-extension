// Chrome Storage API Wrapper

import { STORAGE_KEYS } from '../shared/constants';
import type { ExtensionSettings, CachedExplanation, User } from '../shared/types';

/**
 * Generic get function for chrome.storage.sync
 */
async function getFromSync<T>(key: string): Promise<T | null> {
  try {
    const result = await chrome.storage.sync.get(key);
    return result[key] || null;
  } catch (error) {
    console.error(`Error getting ${key} from storage:`, error);
    return null;
  }
}

/**
 * Generic set function for chrome.storage.sync
 */
async function setToSync<T>(key: string, value: T): Promise<boolean> {
  try {
    await chrome.storage.sync.set({ [key]: value });
    return true;
  } catch (error) {
    console.error(`Error setting ${key} to storage:`, error);
    return false;
  }
}

/**
 * Generic get function for chrome.storage.local
 */
async function getFromLocal<T>(key: string): Promise<T | null> {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  } catch (error) {
    console.error(`Error getting ${key} from local storage:`, error);
    return null;
  }
}

/**
 * Generic set function for chrome.storage.local
 */
async function setToLocal<T>(key: string, value: T): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [key]: value });
    return true;
  } catch (error) {
    console.error(`Error setting ${key} to local storage:`, error);
    return false;
  }
}

/**
 * Remove from storage
 */
async function removeFromStorage(key: string, useLocal = false): Promise<boolean> {
  try {
    if (useLocal) {
      await chrome.storage.local.remove(key);
    } else {
      await chrome.storage.sync.remove(key);
    }
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from storage:`, error);
    return false;
  }
}

// Auth Token
export const authStorage = {
  get: () => getFromSync<string>(STORAGE_KEYS.AUTH_TOKEN),
  set: (token: string) => setToSync(STORAGE_KEYS.AUTH_TOKEN, token),
  remove: () => removeFromStorage(STORAGE_KEYS.AUTH_TOKEN),
};

// User Data
export const userStorage = {
  get: () => getFromSync<User>(STORAGE_KEYS.USER_DATA),
  set: (user: User) => setToSync(STORAGE_KEYS.USER_DATA, user),
  remove: () => removeFromStorage(STORAGE_KEYS.USER_DATA),
};

// Settings
export const settingsStorage = {
  get: () => getFromSync<ExtensionSettings>(STORAGE_KEYS.SETTINGS),
  set: (settings: ExtensionSettings) => setToSync(STORAGE_KEYS.SETTINGS, settings),
  remove: () => removeFromStorage(STORAGE_KEYS.SETTINGS),
};

// Cached Explanations (local storage for larger data)
export const cacheStorage = {
  get: () => getFromLocal<CachedExplanation[]>(STORAGE_KEYS.CACHED_EXPLANATIONS),
  set: (cache: CachedExplanation[]) => setToLocal(STORAGE_KEYS.CACHED_EXPLANATIONS, cache),
  remove: () => removeFromStorage(STORAGE_KEYS.CACHED_EXPLANATIONS, true),
};

// Onboarding Status
export const onboardingStorage = {
  get: () => getFromSync<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED),
  set: (completed: boolean) => setToSync(STORAGE_KEYS.ONBOARDING_COMPLETED, completed),
};

// Analytics Queue (local storage)
export const analyticsStorage = {
  get: () => getFromLocal<any[]>(STORAGE_KEYS.ANALYTICS_QUEUE),
  set: (queue: any[]) => setToLocal(STORAGE_KEYS.ANALYTICS_QUEUE, queue),
  remove: () => removeFromStorage(STORAGE_KEYS.ANALYTICS_QUEUE, true),
};

// Last Sync Timestamp
export const syncStorage = {
  get: () => getFromLocal<number>(STORAGE_KEYS.LAST_SYNC),
  set: (timestamp: number) => setToLocal(STORAGE_KEYS.LAST_SYNC, timestamp),
};

/**
 * Clear all storage data (useful for logout)
 */
export async function clearAllStorage(): Promise<boolean> {
  try {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    return false;
  }
}

/**
 * Get storage usage info
 */
export async function getStorageInfo(): Promise<{
  bytesInUse: number;
  quota: number;
}> {
  try {
    const syncBytes = await chrome.storage.sync.getBytesInUse();
    const localBytes = await chrome.storage.local.getBytesInUse();
    
    return {
      bytesInUse: syncBytes + localBytes,
      quota: chrome.storage.sync.QUOTA_BYTES,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { bytesInUse: 0, quota: 0 };
  }
}