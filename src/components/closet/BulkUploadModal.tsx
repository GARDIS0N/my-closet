import React, { useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Check,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Plus,
  Shirt,
  Info,
} from 'lucide-react';
import {
  ClothingItem,
  BulkUploadDraft,
  STANDARD_CATEGORIES,
  ALL_SEASONS,
  POPULAR_OCCASIONS,
  COLOR_PALETTE,
  ItemStatus,
  Season,
} from '../../types/closet.js';
import { compressImage } from '../../services/storageAdapter.js';
import { closetService } from '../../services/closetService.js';
import { ProductImageProcessor } from '../../services/productImageProcessor.js';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  existingWardrobe: ClothingItem[];
  onUploadSuccess: (newItems: ClothingItem[]) => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  userId,
  existingWardrobe,
  onUploadSuccess,
  showToast,
}) => {
  const [drafts, setDrafts] = useState<BulkUploadDraft[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Check for duplicate candidates against existing wardrobe and current drafts
  const checkForDuplicates = (category: string, color: string, currentDraftId: string) => {
    // Check existing wardrobe
    const existingMatch = existingWardrobe.find(
      (item) =>
        item.category.toLowerCase() === category.toLowerCase() &&
        item.color.toLowerCase() === color.toLowerCase()
    );
    if (existingMatch) {
      return {
        isDuplicate: true,
        reason: `Similar to existing "${existingMatch.name}" (${existingMatch.color} ${existingMatch.category})`,
      };
    }

    // Check drafts
    const draftMatch = drafts.find(
      (d) =>
        d.tempId !== currentDraftId &&
        d.category.toLowerCase() === category.toLowerCase() &&
        d.color.toLowerCase() === color.toLowerCase()
    );
    if (draftMatch) {
      return {
        isDuplicate: true,
        reason: `Duplicate detected in current upload batch (${color} ${category})`,
      };
    }

    return { isDuplicate: false, reason: '' };
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      showToast('error', 'Invalid Files', 'Please select valid image files (JPG, PNG, WebP).');
      return;
    }

    setIsProcessing(true);
    const newDrafts: BulkUploadDraft[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const compressedBase64 = await compressImage(file, 1200, 0.88);
        const tempId = `draft_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;

        const draft: BulkUploadDraft = {
          tempId,
          file,
          image_url: compressedBase64,
          original_image_url: compressedBase64,
          processed_image_url: undefined,
          enhancing: true,
          enhanced: false,
          enhancement_error: null,
          name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          category: 'T-shirts and shirts',
          subcategory: '',
          color: 'Black',
          season: ['All-Season'],
          occasion: ['Casual Outings'],
          status: 'clean',
          notes: '',
          analyzing: true,
          analyzed: false,
        };

        newDrafts.push(draft);
      } catch (err) {
        console.warn('Failed to process image file:', file.name, err);
      }
    }

    setDrafts((prev) => [...prev, ...newDrafts]);
    setIsProcessing(false);

    // Run enhancement and AI vision analysis in parallel for each item
    for (const draft of newDrafts) {
      enhanceSingleDraft(draft.tempId, draft.original_image_url);
      analyzeSingleDraft(draft.tempId, draft.original_image_url);
    }
  };

  const enhanceSingleDraft = async (tempId: string, sourceImage: string) => {
    updateDraft(tempId, { enhancing: true, enhancement_error: null });
    try {
      const result = await ProductImageProcessor.process(sourceImage, {
        backgroundMode: 'studio_white',
        addGroundingShadow: true,
        targetDimension: 1000,
        paddingRatio: 0.10,
        enhanceQuality: true,
      });

      if (result.success) {
        updateDraft(tempId, {
          image_url: result.enhanced_image_url,
          processed_image_url: result.enhanced_image_url,
          enhancing: false,
          enhanced: true,
          enhancement_error: null,
        });
      } else {
        updateDraft(tempId, {
          enhancing: false,
          enhanced: false,
          enhancement_error: result.processing_error || 'Could not isolate item.',
        });
      }
    } catch (err: any) {
      updateDraft(tempId, {
        enhancing: false,
        enhanced: false,
        enhancement_error: err?.message || 'Enhancement error.',
      });
    }
  };

  const analyzeSingleDraft = async (tempId: string, imageBase64: string) => {
    try {
      const analysis = await closetService.analyzeGarmentImage(imageBase64);

      setDrafts((current) =>
        current.map((d) => {
          if (d.tempId !== tempId) return d;

          const category = analysis.category || d.category;
          const color = analysis.color || d.color;
          const dupCheck = checkForDuplicates(category, color, tempId);

          return {
            ...d,
            name: analysis.name || d.name,
            category,
            subcategory: analysis.subcategory || d.subcategory,
            color,
            secondary_color: analysis.secondary_color || d.secondary_color,
            brand: analysis.brand || d.brand,
            season: (analysis.season as Season[]) || d.season,
            occasion: analysis.occasion || d.occasion,
            notes: analysis.notes || d.notes,
            pattern: analysis.detected_attributes?.pattern,
            material: analysis.detected_attributes?.material,
            tags: analysis.detected_attributes?.tags,
            analyzing: false,
            analyzed: true,
            isDuplicateCandidate: dupCheck.isDuplicate,
            duplicateReason: dupCheck.reason,
          };
        })
      );
    } catch {
      setDrafts((current) =>
        current.map((d) =>
          d.tempId === tempId ? { ...d, analyzing: false, analyzed: false } : d
        )
      );
    }
  };

  const updateDraft = (tempId: string, updates: Partial<BulkUploadDraft>) => {
    setDrafts((current) =>
      current.map((d) => {
        if (d.tempId !== tempId) return d;
        const updated = { ...d, ...updates };

        // Recheck duplicates if category or color changed
        if (updates.category || updates.color) {
          const dupCheck = checkForDuplicates(updated.category, updated.color, tempId);
          updated.isDuplicateCandidate = dupCheck.isDuplicate;
          updated.duplicateReason = dupCheck.reason;
        }

        return updated;
      })
    );
  };

  const removeDraft = (tempId: string) => {
    setDrafts((current) => current.filter((d) => d.tempId !== tempId));
  };

  const handleSaveAll = async () => {
    if (drafts.length === 0) return;

    setIsSaving(true);
    try {
      const itemsToCreate = drafts.map((d) => ({
        user_id: userId,
        name: d.name.trim() || 'Wardrobe Piece',
        category: d.category,
        subcategory: d.subcategory?.trim() || undefined,
        color: d.color,
        secondary_color: d.secondary_color,
        brand: d.brand,
        size: d.size,
        season: d.season.length > 0 ? d.season : (['All-Season'] as Season[]),
        occasion: d.occasion.length > 0 ? d.occasion : ['Casual Outings'],
        status: d.status,
        image_url: d.image_url,
        original_image_url: d.original_image_url,
        processed_image_url: d.processed_image_url,
        processing_status: (d.enhanced ? 'completed' : 'original') as any,
        processing_error: d.enhancement_error,
        detected_attributes: {
          category: d.category,
          subcategory: d.subcategory,
          primary_color: d.color,
          secondary_color: d.secondary_color,
          pattern: d.pattern,
          material: d.material,
          brand: d.brand,
          tags: d.tags,
        },
        notes: d.notes,
        is_favorite: false,
        times_worn: 0,
        last_worn: null,
      }));

      const created = await closetService.bulkCreateClothingItems(userId, itemsToCreate);
      showToast('success', 'Wardrobe Updated', `Successfully digitized and cataloged ${created.length} pieces with studio clean imagery!`);
      onUploadSuccess(created);
      onClose();
    } catch (err: any) {
      showToast('error', 'Upload Failed', err?.message || 'Could not save items.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#E7E2D9] max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E2D9] bg-white/70 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-full bg-[#1E392A]/10 text-[#1E392A]">
                <Shirt className="w-5 h-5" />
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#1C1917]">
                Bulk Wardrobe Digitizer
              </h2>
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">
              Select multiple clothing photos at once. AI automatically inspects and catalogs categories, colors, and styles.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#78716C] hover:text-[#1C1917] rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-[#1E392A] bg-[#1E392A]/5 scale-[0.99]'
                : 'border-[#D6CEBF] hover:border-[#1E392A] hover:bg-white/60 bg-white/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1E392A]/10 text-[#1E392A] flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <p className="font-serif text-lg font-medium text-[#1C1917]">
              Drop your clothing photos here or click to browse
            </p>
            <p className="text-xs text-[#78716C] mt-1 max-w-md mx-auto">
              Select shirts, trousers, jackets, shoes, bags, and accessories in batch. Photos are compressed on-device for speed.
            </p>
          </div>

          {/* Draft Items Grid */}
          {drafts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1C1917] flex items-center gap-2">
                  <span>Queued Garments</span>
                  <span className="px-2 py-0.5 text-xs bg-[#1E392A] text-white rounded-full font-mono">
                    {drafts.length}
                  </span>
                </span>
                <span className="text-xs text-[#78716C]">
                  Review auto-detected information before saving
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drafts.map((draft) => (
                  <div
                    key={draft.tempId}
                    className={`bg-white rounded-2xl p-4 border transition-all shadow-sm flex flex-col justify-between ${
                      draft.isDuplicateCandidate
                        ? 'border-amber-400 bg-amber-50/20'
                        : 'border-[#E7E2D9] hover:border-[#1E392A]/40'
                    }`}
                  >
                    {/* Duplicate Warning Banner */}
                    {draft.isDuplicateCandidate && (
                      <div className="mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="flex-1 truncate">{draft.duplicateReason}</span>
                      </div>
                    )}

                    <div className="flex gap-4">
                      {/* Image Thumbnail */}
                      <div className="relative w-28 h-32 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 flex items-center justify-center">
                        <img
                          src={draft.image_url}
                          alt={draft.name}
                          className="w-full h-full object-contain p-1"
                        />

                        {/* Status overlays */}
                        {draft.enhancing && (
                          <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                            <Sparkles className="w-4 h-4 animate-spin text-[#C2A674]" />
                            <span className="text-[9px] mt-1 font-semibold tracking-tight">Studio Cleaning...</span>
                          </div>
                        )}

                        {draft.enhanced && !draft.enhancing && (
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(draft.tempId, {
                                image_url:
                                  draft.image_url === draft.processed_image_url
                                    ? draft.original_image_url
                                    : draft.processed_image_url,
                              })
                            }
                            className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-stone-900/85 hover:bg-stone-900 text-white text-[9px] font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Click to toggle between Studio Clean and Original Raw photo"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-[#C2A674]" />
                            <span>{draft.image_url === draft.processed_image_url ? 'Studio' : 'Raw'}</span>
                          </button>
                        )}

                        {draft.enhancement_error && !draft.enhancing && (
                          <button
                            type="button"
                            onClick={() => enhanceSingleDraft(draft.tempId, draft.original_image_url)}
                            className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-amber-700 hover:bg-amber-800 text-white text-[9px] font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                            title={`Enhancement notice: ${draft.enhancement_error}. Click to retry.`}
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Retry</span>
                          </button>
                        )}

                        {draft.analyzed && !draft.analyzing && (
                          <div className="absolute top-1 right-1 p-1 bg-[#1E392A] text-white rounded-full shadow-xs">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Fields */}
                      <div className="flex-1 space-y-2 min-w-0">
                        {/* Name Input */}
                        <div>
                          <input
                            type="text"
                            value={draft.name}
                            onChange={(e) => updateDraft(draft.tempId, { name: e.target.value })}
                            placeholder="Piece name..."
                            className="w-full text-sm font-medium text-[#1C1917] bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#1E392A]"
                          />
                        </div>

                        {/* Category & Subcategory Selectors */}
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={draft.category}
                            onChange={(e) => updateDraft(draft.tempId, { category: e.target.value })}
                            className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-[#1C1917] focus:outline-none focus:border-[#1E392A]"
                          >
                            {STANDARD_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={draft.subcategory || ''}
                            onChange={(e) => updateDraft(draft.tempId, { subcategory: e.target.value })}
                            placeholder="Subcategory (e.g. Oxford)"
                            className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-[#1C1917] focus:outline-none focus:border-[#1E392A]"
                          />
                        </div>

                        {/* Color & Status */}
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={draft.color}
                            onChange={(e) => updateDraft(draft.tempId, { color: e.target.value })}
                            className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-[#1C1917] focus:outline-none focus:border-[#1E392A]"
                          >
                            {COLOR_PALETTE.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={draft.brand || ''}
                            onChange={(e) => updateDraft(draft.tempId, { brand: e.target.value })}
                            placeholder="Brand (optional)"
                            className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-[#1C1917] focus:outline-none focus:border-[#1E392A]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions & Attributes */}
                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-[#78716C]">
                      <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                        {draft.pattern && draft.pattern !== 'None' && (
                          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-[10px] text-stone-600 font-medium">
                            {draft.pattern}
                          </span>
                        )}
                        {draft.material && (
                          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-[10px] text-stone-600 font-medium">
                            {draft.material}
                          </span>
                        )}
                        <span className="truncate text-[11px] italic">
                          {draft.notes || 'Ready to catalog'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDraft(draft.tempId)}
                        className="text-stone-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E7E2D9] bg-white/70 backdrop-blur-sm flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-[#78716C] hover:text-[#1C1917] transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {drafts.length > 0 && (
              <span className="text-xs text-[#78716C] hidden sm:inline">
                {drafts.length} {drafts.length === 1 ? 'garment' : 'garments'} ready to catalog
              </span>
            )}
            <button
              type="button"
              disabled={drafts.length === 0 || isSaving}
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1E392A] text-white hover:bg-[#162A1F] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium shadow-md shadow-[#1E392A]/10"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Wardrobe...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Finalize & Save All ({drafts.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
