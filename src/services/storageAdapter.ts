// Unified IndexedDB + Supabase Persistent Storage Adapter for MyCloset
import {
  ClothingItem,
  SavedOutfit,
  CalendarEntry,
  UserProfile,
  STANDARD_CATEGORIES,
} from '../types/closet.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const DB_NAME = 'mycloset_indexeddb_v2';
const DB_VERSION = 2;
const STORES = [
  'items',
  'outfits',
  'calendar',
  'profiles',
  'images',
  'custom_categories',
  'profile_photos',
  'tryon_records',
] as const;

type StoreName = (typeof STORES)[number];

class IndexedDbClient {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        STORES.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            if (
              storeName === 'items' ||
              storeName === 'outfits' ||
              storeName === 'calendar' ||
              storeName === 'profiles' ||
              storeName === 'profile_photos' ||
              storeName === 'tryon_records'
            ) {
              db.createObjectStore(storeName, { keyPath: 'id' });
            } else if (storeName === 'images') {
              db.createObjectStore(storeName, { keyPath: 'id' });
            } else {
              db.createObjectStore(storeName, { keyPath: 'name' });
            }
          }
        });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []) as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  async get<T>(storeName: StoreName, key: IDBValidKey): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async put<T>(storeName: StoreName, value: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async delete(storeName: StoreName, key: IDBValidKey): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear(storeName: StoreName): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const idb = new IndexedDbClient();

// Detect whether Supabase tables are ready in the target database
let supabaseTablesVerified: boolean | null = null;

export async function checkSupabaseTableStatus(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    supabaseTablesVerified = false;
    return false;
  }
  if (supabaseTablesVerified !== null) {
    return supabaseTablesVerified;
  }

  try {
    const { error } = await supabase.from('clothing_items').select('id').limit(1);
    if (error && error.message.includes('relation') || error?.message.includes('schema cache')) {
      supabaseTablesVerified = false;
    } else if (!error) {
      supabaseTablesVerified = true;
    } else {
      supabaseTablesVerified = false;
    }
  } catch {
    supabaseTablesVerified = false;
  }
  return supabaseTablesVerified;
}

// Compress client-side uploaded photos to keep local storage fast and responsive
export async function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
