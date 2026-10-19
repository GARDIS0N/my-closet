import {
  ClothingItem,
  SavedOutfit,
  CalendarEntry,
  ItemStatus,
  UserProfile,
  STANDARD_CATEGORIES,
  UserProfilePhoto,
  VirtualTryonRecord,
  VirtualTryonGarmentRef,
  TryonProviderStatus,
  ProductEnhancementOptions,
  ProductEnhancementResult,
  EnhancerProviderStatus,
} from '../types/closet.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { idb, checkSupabaseTableStatus, compressImage } from './storageAdapter.js';
import { ProductImageProcessor } from './productImageProcessor.js';

class ClosetService {
  /**
   * Uploads an image. If Supabase storage is accessible, uploads to 'closet-photos'.
   * Otherwise compresses and stores in IndexedDB with full offline/local persistence.
   */
  async uploadPhoto(userId: string, file: File): Promise<string> {
    const isCloudReady = await checkSupabaseTableStatus();

    if (isCloudReady) {
      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('closet-photos')
          .upload(fileName, file, { cacheControl: '3600', upsert: true });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from('closet-photos')
            .getPublicUrl(fileName);
          return publicUrlData.publicUrl;
        }
      } catch (err) {
        console.warn('Supabase storage upload failed, falling back to IndexedDB image store:', err);
      }
    }

    // High quality local compressed storage
    const compressedDataUrl = await compressImage(file, 1200, 0.88);
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await idb.put('images', { id: imageId, dataUrl: compressedDataUrl, created_at: new Date().toISOString() });
    return compressedDataUrl;
  }

  // --------------------------------------------------------------------------
  // CLOTHING ITEMS
  // --------------------------------------------------------------------------
  async getItems(userId: string): Promise<ClothingItem[]> {
    const isCloudReady = await checkSupabaseTableStatus();

    if (isCloudReady) {
      try {
        const { data, error } = await supabase
          .from('clothing_items')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Sync into local IndexedDB cache for offline access
          for (const item of data) {
            await idb.put('items', item);
          }
          return data as ClothingItem[];
        }
      } catch (err) {
        console.warn('Could not fetch from Supabase, loading from IndexedDB:', err);
      }
    }

    // Load from IndexedDB
    const allItems = await idb.getAll<ClothingItem>('items');
    const userItems = allItems.filter((i) => i.user_id === userId);
    return userItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getItemById(id: string): Promise<ClothingItem | null> {
    return idb.get<ClothingItem>('items', id);
  }

  async createItem(itemData: Omit<ClothingItem, 'id' | 'created_at' | 'updated_at'>): Promise<ClothingItem> {
    const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const newItem: ClothingItem = {
      ...itemData,
      id,
      times_worn: itemData.times_worn || 0,
      is_favorite: Boolean(itemData.is_favorite),
      created_at: now,
      updated_at: now,
    };

    // Save locally
    await idb.put('items', newItem);

    // Save to Supabase if available
    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('clothing_items').insert([newItem]);
      } catch (err) {
        console.warn('Supabase insert failed, item stored locally:', err);
      }
    }

    return newItem;
  }

  async updateItem(id: string, updates: Partial<ClothingItem>): Promise<ClothingItem | null> {
    const existing = await idb.get<ClothingItem>('items', id);
    if (!existing) return null;

    const updated: ClothingItem = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await idb.put('items', updated);

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('clothing_items').update(updates).eq('id', id);
      } catch (err) {
        console.warn('Supabase update failed:', err);
      }
    }

    return updated;
  }

  async deleteItem(id: string, userId: string): Promise<boolean> {
    await idb.delete('items', id);

    // Remove from saved outfits that referenced this item
    const outfits = await this.getOutfits(userId);
    for (const outfit of outfits) {
      if (outfit.items.some((ref) => ref.clothing_item_id === id)) {
        const remainingItems = outfit.items.filter((ref) => ref.clothing_item_id !== id);
        await this.updateOutfit(outfit.id, { items: remainingItems });
      }
    }

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('clothing_items').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete failed:', err);
      }
    }

    return true;
  }

  async toggleFavoriteItem(id: string): Promise<boolean> {
    const item = await idb.get<ClothingItem>('items', id);
    if (!item) return false;
    const nextState = !item.is_favorite;
    await this.updateItem(id, { is_favorite: nextState });
    return nextState;
  }

  async updateItemStatus(id: string, status: ItemStatus): Promise<void> {
    await this.updateItem(id, { status });
  }

  async recordItemWorn(id: string): Promise<void> {
    const item = await idb.get<ClothingItem>('items', id);
    if (!item) return;
    await this.updateItem(id, {
      times_worn: (item.times_worn || 0) + 1,
      last_worn: new Date().toISOString().split('T')[0],
    });
  }

  // --------------------------------------------------------------------------
  // OUTFITS
  // --------------------------------------------------------------------------
  async getOutfits(userId: string): Promise<SavedOutfit[]> {
    const isCloudReady = await checkSupabaseTableStatus();
    let outfits: SavedOutfit[] = [];

    if (isCloudReady) {
      try {
        const { data, error } = await supabase
          .from('saved_outfits')
          .select('*, outfit_items(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          outfits = data.map((o: any) => ({
            ...o,
            items: (o.outfit_items || []).map((oi: any) => ({
              slot: oi.slot,
              clothing_item_id: oi.clothing_item_id,
            })),
          }));
          for (const outfit of outfits) {
            await idb.put('outfits', outfit);
          }
        }
      } catch (err) {
        console.warn('Could not load outfits from Supabase, loading from IndexedDB:', err);
      }
    }

    if (outfits.length === 0) {
      const allOutfits = await idb.getAll<SavedOutfit>('outfits');
      outfits = allOutfits.filter((o) => o.user_id === userId);
    }

    // Populate item instances
    const allItems = await this.getItems(userId);
    const itemMap = new Map<string, ClothingItem>();
    allItems.forEach((i) => itemMap.set(i.id, i));

    return outfits.map((o) => ({
      ...o,
      items: o.items.map((ref) => ({
        ...ref,
        item: itemMap.get(ref.clothing_item_id),
      })),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getOutfitById(id: string, userId: string): Promise<SavedOutfit | null> {
    const outfits = await this.getOutfits(userId);
    return outfits.find((o) => o.id === id) || null;
  }

  async createOutfit(outfitData: Omit<SavedOutfit, 'id' | 'created_at' | 'updated_at'>): Promise<SavedOutfit> {
    const id = `outfit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const newOutfit: SavedOutfit = {
      ...outfitData,
      id,
      is_favorite: Boolean(outfitData.is_favorite),
      created_at: now,
      updated_at: now,
    };

    await idb.put('outfits', newOutfit);

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('saved_outfits').insert([{
          id: newOutfit.id,
          user_id: newOutfit.user_id,
          name: newOutfit.name,
          description: newOutfit.description,
          occasion: newOutfit.occasion,
          style: newOutfit.style,
          season: newOutfit.season,
          is_favorite: newOutfit.is_favorite,
        }]);

        const junctionItems = newOutfit.items.map((ref, idx) => ({
          outfit_id: newOutfit.id,
          clothing_item_id: ref.clothing_item_id,
          slot: ref.slot,
          position_order: idx,
        }));
        if (junctionItems.length > 0) {
          await supabase.from('outfit_items').insert(junctionItems);
        }
      } catch (err) {
        console.warn('Supabase create outfit failed:', err);
      }
    }

    return newOutfit;
  }

  async updateOutfit(id: string, updates: Partial<SavedOutfit>): Promise<SavedOutfit | null> {
    const existing = await idb.get<SavedOutfit>('outfits', id);
    if (!existing) return null;

    const updated: SavedOutfit = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await idb.put('outfits', updated);

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('saved_outfits').update({
          name: updated.name,
          description: updated.description,
          occasion: updated.occasion,
          style: updated.style,
          season: updated.season,
          is_favorite: updated.is_favorite,
        }).eq('id', id);

        if (updates.items) {
          await supabase.from('outfit_items').delete().eq('outfit_id', id);
          const junctionItems = updates.items.map((ref, idx) => ({
            outfit_id: id,
            clothing_item_id: ref.clothing_item_id,
            slot: ref.slot,
            position_order: idx,
          }));
          if (junctionItems.length > 0) {
            await supabase.from('outfit_items').insert(junctionItems);
          }
        }
      } catch (err) {
        console.warn('Supabase outfit update failed:', err);
      }
    }

    return updated;
  }

  async deleteOutfit(id: string): Promise<boolean> {
    await idb.delete('outfits', id);

    // Delete associated calendar entries
    const calendarEntries = await idb.getAll<CalendarEntry>('calendar');
    for (const entry of calendarEntries) {
      if (entry.outfit_id === id) {
        await idb.delete('calendar', entry.id);
      }
    }

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('saved_outfits').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase outfit delete failed:', err);
      }
    }

    return true;
  }

  async toggleFavoriteOutfit(id: string): Promise<boolean> {
    const outfit = await idb.get<SavedOutfit>('outfits', id);
    if (!outfit) return false;
    const nextState = !outfit.is_favorite;
    await this.updateOutfit(id, { is_favorite: nextState });
    return nextState;
  }

  // --------------------------------------------------------------------------
  // CALENDAR
  // --------------------------------------------------------------------------
  async getCalendarEntries(userId: string): Promise<CalendarEntry[]> {
    const isCloudReady = await checkSupabaseTableStatus();
    let entries: CalendarEntry[] = [];

    if (isCloudReady) {
      try {
        const { data, error } = await supabase
          .from('calendar_entries')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: true });

        if (!error && data) {
          entries = data as CalendarEntry[];
          for (const entry of entries) {
            await idb.put('calendar', entry);
          }
        }
      } catch (err) {
        console.warn('Could not load calendar from Supabase:', err);
      }
    }

    if (entries.length === 0) {
      const allEntries = await idb.getAll<CalendarEntry>('calendar');
      entries = allEntries.filter((e) => e.user_id === userId);
    }

    // Attach outfit objects
    const outfits = await this.getOutfits(userId);
    const outfitMap = new Map<string, SavedOutfit>();
    outfits.forEach((o) => outfitMap.set(o.id, o));

    return entries.map((entry) => ({
      ...entry,
      outfit: outfitMap.get(entry.outfit_id),
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  async scheduleOutfit(
    userId: string,
    date: string,
    outfitId: string,
    notes?: string
  ): Promise<CalendarEntry> {
    // Check if an outfit is already assigned to this date
    const existingEntries = await this.getCalendarEntries(userId);
    const existing = existingEntries.find((e) => e.date === date && e.outfit_id === outfitId);
    if (existing) {
      return existing;
    }

    const id = `cal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newEntry: CalendarEntry = {
      id,
      user_id: userId,
      date,
      outfit_id: outfitId,
      notes,
      is_worn: false,
      created_at: new Date().toISOString(),
    };

    await idb.put('calendar', newEntry);

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('calendar_entries').insert([newEntry]);
      } catch (err) {
        console.warn('Supabase calendar insert failed:', err);
      }
    }

    const outfits = await this.getOutfits(userId);
    newEntry.outfit = outfits.find((o) => o.id === outfitId);
    return newEntry;
  }

  async deleteCalendarEntry(id: string): Promise<boolean> {
    await idb.delete('calendar', id);

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('calendar_entries').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase calendar delete failed:', err);
      }
    }

    return true;
  }

  async markOutfitWorn(id: string, isWorn: boolean): Promise<void> {
    const entry = await idb.get<CalendarEntry>('calendar', id);
    if (!entry) return;

    entry.is_worn = isWorn;
    await idb.put('calendar', entry);

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('calendar_entries').update({ is_worn: isWorn }).eq('id', id);
      } catch (err) {
        console.warn('Supabase calendar update failed:', err);
      }
    }

    // Also update times_worn for all clothing items in the outfit if newly worn
    if (isWorn && entry.outfit_id) {
      const outfit = await this.getOutfitById(entry.outfit_id, entry.user_id);
      if (outfit) {
        for (const itemRef of outfit.items) {
          await this.recordItemWorn(itemRef.clothing_item_id);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // CUSTOM CATEGORIES
  // --------------------------------------------------------------------------
  async getCategories(userId: string): Promise<string[]> {
    const custom = await idb.getAll<{ name: string; user_id: string }>('custom_categories');
    const userCustom = custom.filter((c) => c.user_id === userId).map((c) => c.name);
    return [...STANDARD_CATEGORIES, ...userCustom];
  }

  async addCustomCategory(userId: string, name: string): Promise<string[]> {
    const trimmed = name.trim();
    if (!trimmed) return this.getCategories(userId);

    await idb.put('custom_categories', { name: trimmed, user_id: userId, created_at: new Date().toISOString() });

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('custom_categories').insert([{ user_id: userId, name: trimmed }]);
      } catch (err) {
        console.warn('Supabase custom category insert failed:', err);
      }
    }

    return this.getCategories(userId);
  }

  // --------------------------------------------------------------------------
  // USER PROFILES
  // --------------------------------------------------------------------------
  async getProfile(userId: string): Promise<UserProfile | null> {
    const localProfile = await idb.get<UserProfile>('profiles', userId);
    if (localProfile) return localProfile;

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (!error && data) {
          await idb.put('profiles', data);
          return data as UserProfile;
        }
      } catch {}
    }

    return null;
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const updated = { ...profile, updated_at: new Date().toISOString() };
    await idb.put('profiles', updated);

    const isCloudReady = await checkSupabaseTableStatus();
    if (isCloudReady) {
      try {
        await supabase.from('profiles').upsert([updated]);
      } catch (err) {
        console.warn('Supabase profile upsert failed:', err);
      }
    }

    return updated;
  }

  // --------------------------------------------------------------------------
  // BULK UPLOAD WARDROBE
  // --------------------------------------------------------------------------
  async bulkCreateClothingItems(
    userId: string,
    itemsData: Omit<ClothingItem, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<ClothingItem[]> {
    const createdItems: ClothingItem[] = [];
    const isCloudReady = await checkSupabaseTableStatus();

    for (const itemData of itemsData) {
      const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date().toISOString();
      const newItem: ClothingItem = {
        ...itemData,
        id,
        user_id: userId,
        times_worn: itemData.times_worn || 0,
        last_worn: itemData.last_worn || null,
        is_favorite: Boolean(itemData.is_favorite),
        created_at: now,
        updated_at: now,
      };

      await idb.put('items', newItem);
      createdItems.push(newItem);

      if (isCloudReady) {
        try {
          await supabase.from('clothing_items').insert([newItem]);
        } catch (err) {
          console.warn('Could not insert item to Supabase in bulk:', err);
        }
      }
    }

    return createdItems;
  }

  // --------------------------------------------------------------------------
  // AI GARMENT VISION ANALYSIS
  // --------------------------------------------------------------------------
  async analyzeGarmentImage(imageBase64: string): Promise<Partial<ClothingItem>> {
    try {
      const response = await fetch('/api/closet/analyze-garment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && !data.useFallback && data.analysis) {
          const a = data.analysis;
          return {
            name: a.name,
            category: a.category,
            subcategory: a.subcategory,
            color: a.color,
            secondary_color: a.secondary_color,
            brand: a.brand || undefined,
            season: a.season,
            occasion: a.occasion,
            notes: a.notes,
            detected_attributes: {
              category: a.category,
              subcategory: a.subcategory,
              primary_color: a.color,
              secondary_color: a.secondary_color,
              pattern: a.pattern,
              material: a.material,
              brand: a.brand,
              style: a.style,
              season: a.season,
              occasion: a.occasion,
              tags: a.tags,
              notes: a.notes,
              confidence: 96,
            },
          };
        }
      }
    } catch {
      // Fallback
    }

    return {};
  }

  // --------------------------------------------------------------------------
  // AUTOMATIC PRODUCT PHOTO ENHANCEMENT
  // --------------------------------------------------------------------------
  async getEnhancerStatus(): Promise<EnhancerProviderStatus> {
    return ProductImageProcessor.getStatus();
  }

  async enhanceItemPhoto(
    itemId: string,
    options: ProductEnhancementOptions = {}
  ): Promise<ClothingItem | null> {
    const item = await this.getItemById(itemId);
    if (!item) return null;

    const sourceImage = item.original_image_url || item.image_url;

    await this.updateItem(itemId, {
      processing_status: 'processing',
    });

    try {
      const result = await ProductImageProcessor.process(sourceImage, options);

      if (result.success) {
        return await this.updateItem(itemId, {
          image_url: result.enhanced_image_url,
          processed_image_url: result.enhanced_image_url,
          original_image_url: item.original_image_url || sourceImage,
          processing_status: 'completed',
          processing_error: null,
        });
      } else {
        return await this.updateItem(itemId, {
          processing_status: 'failed',
          processing_error: result.processing_error || 'Enhancement failed.',
        });
      }
    } catch (err: any) {
      return await this.updateItem(itemId, {
        processing_status: 'failed',
        processing_error: err?.message || 'Enhancement exception.',
      });
    }
  }

  async restoreOriginalPhoto(itemId: string): Promise<ClothingItem | null> {
    const item = await this.getItemById(itemId);
    if (!item || !item.original_image_url) return null;

    return await this.updateItem(itemId, {
      image_url: item.original_image_url,
      processing_status: 'original',
    });
  }

  // --------------------------------------------------------------------------
  // PERSONAL STYLE PROFILE PHOTOS (FOR VIRTUAL TRY-ON)
  // --------------------------------------------------------------------------
  async getProfilePhotos(userId: string): Promise<UserProfilePhoto[]> {
    const all = await idb.getAll<UserProfilePhoto>('profile_photos');
    return all
      .filter((p) => p.user_id === userId)
      .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  }

  async saveProfilePhoto(
    userId: string,
    imageUrl: string,
    isPrimary = true,
    label = 'Full-Body Persona'
  ): Promise<UserProfilePhoto> {
    const id = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    // If marked primary, unset other primaries
    if (isPrimary) {
      const existing = await this.getProfilePhotos(userId);
      for (const photo of existing) {
        if (photo.is_primary) {
          photo.is_primary = false;
          await idb.put('profile_photos', photo);
        }
      }
    }

    const photo: UserProfilePhoto = {
      id,
      user_id: userId,
      image_url: imageUrl,
      is_primary: isPrimary,
      confirmed_consent: true,
      label,
      created_at: now,
    };

    await idb.put('profile_photos', photo);
    return photo;
  }

  async deleteProfilePhoto(id: string): Promise<void> {
    await idb.delete('profile_photos', id);
  }

  async setPrimaryProfilePhoto(userId: string, id: string): Promise<void> {
    const existing = await this.getProfilePhotos(userId);
    for (const photo of existing) {
      photo.is_primary = photo.id === id;
      await idb.put('profile_photos', photo);
    }
  }

  // --------------------------------------------------------------------------
  // VIRTUAL TRY-ON & LOOKBOOK
  // --------------------------------------------------------------------------
  async getTryonProviderStatus(): Promise<TryonProviderStatus> {
    try {
      const res = await fetch('/api/closet/tryon-status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return {
      configured: false,
      providerName: 'Local Persona Outfit Studio',
      supportedGarmentRoles: ['upper_body', 'lower_body', 'one_piece', 'outerwear'],
      message: 'Running in offline / local persona mode. Real garments are curated and placed on your Personal Outfit Stage.',
      requiresBilling: false,
    };
  }

  async requestVirtualTryon(
    personImage: string,
    garments: VirtualTryonGarmentRef[],
    outfitName: string
  ): Promise<any> {
    try {
      const response = await fetch('/api/closet/virtual-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_image: personImage,
          garments,
          outfit_name: outfitName,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err: any) {
      console.warn('VTO request error:', err?.message);
    }

    return {
      success: false,
      providerConfigured: false,
      message: 'VTO service unavailable; using Persona Outfit Stage layout.',
      on_body_garments: garments.filter((g) => ['upper_body', 'lower_body', 'one_piece', 'outerwear'].includes(g.role)),
      separate_garments: garments.filter((g) => ['footwear', 'accessory'].includes(g.role)),
      outfit_name: outfitName,
    };
  }

  async getTryonRecords(userId: string): Promise<VirtualTryonRecord[]> {
    const all = await idb.getAll<VirtualTryonRecord>('tryon_records');
    return all
      .filter((r) => r.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async saveTryonRecord(
    recordData: Omit<VirtualTryonRecord, 'id' | 'created_at'>
  ): Promise<VirtualTryonRecord> {
    const id = `tryon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const newRecord: VirtualTryonRecord = {
      ...recordData,
      id,
      is_favorite: Boolean(recordData.is_favorite),
      created_at: now,
    };

    await idb.put('tryon_records', newRecord);
    return newRecord;
  }

  async deleteTryonRecord(id: string): Promise<void> {
    await idb.delete('tryon_records', id);
  }

  async toggleTryonFavorite(id: string): Promise<boolean> {
    const record = await idb.get<VirtualTryonRecord>('tryon_records', id);
    if (!record) return false;

    record.is_favorite = !record.is_favorite;
    await idb.put('tryon_records', record);
    return record.is_favorite;
  }

  async clearUserWardrobe(userId: string): Promise<void> {
    const items = await this.getItems(userId);
    for (const item of items) {
      await idb.delete('items', item.id);
    }
    const outfits = await this.getOutfits(userId);
    for (const outfit of outfits) {
      await idb.delete('outfits', outfit.id);
    }
    const calendar = await this.getCalendarEntries(userId);
    for (const entry of calendar) {
      await idb.delete('calendar', entry.id);
    }
  }
}

export const closetService = new ClosetService();
