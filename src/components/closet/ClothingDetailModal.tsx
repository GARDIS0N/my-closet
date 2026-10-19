import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  Sparkles,
  Tag,
  Clock,
  Layers,
  RotateCcw,
  Image as ImageIcon,
  Loader2,
  Wand2,
} from 'lucide-react';
import { ClothingItem, ItemStatus } from '../../types/closet.js';
import { ConfirmationModal } from '../common/ConfirmationModal.js';
import { closetService } from '../../services/closetService.js';
import { showToast } from '../common/Toast.js';

interface ClothingDetailModalProps {
  item: ClothingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: ClothingItem) => void;
  onDelete: (item: ClothingItem) => void;
  onToggleFavorite: (item: ClothingItem) => void;
  onUpdateStatus: (item: ClothingItem, status: ItemStatus) => void;
  onRecordWorn: (item: ClothingItem) => void;
  onItemUpdated?: (updated: ClothingItem) => void;
}

export const ClothingDetailModal: React.FC<ClothingDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onUpdateStatus,
  onRecordWorn,
  onItemUpdated,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentItem, setCurrentItem] = useState<ClothingItem | null>(item);
  const [viewMode, setViewMode] = useState<'clean' | 'original'>('clean');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    setCurrentItem(item);
    setViewMode('clean');
  }, [item]);

  if (!isOpen || !currentItem) return null;

  const hasOriginal = Boolean(
    currentItem.original_image_url &&
    currentItem.original_image_url !== (currentItem.processed_image_url || currentItem.image_url)
  );

  const displayImageUrl =
    viewMode === 'original' && currentItem.original_image_url
      ? currentItem.original_image_url
      : currentItem.processed_image_url || currentItem.image_url;

  const isStudioClean = viewMode === 'clean' && currentItem.processing_status === 'completed';

  const handleReEnhance = async () => {
    if (!currentItem) return;
    setIsEnhancing(true);
    try {
      const updated = await closetService.enhanceItemPhoto(currentItem.id);
      if (updated) {
        setCurrentItem(updated);
        setViewMode('clean');
        onItemUpdated?.(updated);
        showToast('success', 'Photo Enhanced', 'Photo enhanced with studio cleanup!');
      } else {
        showToast('error', 'Enhancement Failed', 'Enhancement could not complete.');
      }
    } catch (err: any) {
      showToast('error', 'Enhancement Error', err?.message || 'Enhancement failed.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleRestoreOriginal = async () => {
    if (!currentItem) return;
    setIsRestoring(true);
    try {
      const updated = await closetService.restoreOriginalPhoto(currentItem.id);
      if (updated) {
        setCurrentItem(updated);
        setViewMode('original');
        onItemUpdated?.(updated);
        showToast('success', 'Photo Restored', 'Original photo restored.');
      }
    } catch (err: any) {
      showToast('error', 'Restore Failed', err?.message || 'Could not restore original photo.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95">
          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close details"
            className="absolute top-4 right-4 z-20 p-2 text-stone-700 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Column: Image preview with comparison controls */}
          <div className="w-full md:w-1/2 bg-stone-100 relative min-h-[320px] md:min-h-full flex flex-col justify-between overflow-hidden">
            <div className={`relative w-full h-full min-h-[300px] flex items-center justify-center ${
              isStudioClean ? 'bg-gradient-to-b from-stone-50 via-white to-stone-100 p-4' : 'bg-stone-900/5'
            }`}>
              <img
                src={displayImageUrl}
                alt={currentItem.name}
                className={`w-full h-full max-h-[420px] md:max-h-none transition-all duration-300 ${
                  isStudioClean
                    ? 'object-contain drop-shadow-md'
                    : 'object-cover object-center'
                }`}
              />

              {/* Enhancement Status Badge */}
              {currentItem.processing_status === 'completed' && (
                <div className="absolute top-4 right-14 z-10">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#1E392A] text-[10px] font-bold rounded-full shadow-xs border border-stone-200">
                    <Sparkles className="w-3 h-3 text-[#C2A674]" />
                    Studio Ready
                  </span>
                </div>
              )}

              {/* Favorite Button */}
              <button
                onClick={() => onToggleFavorite(currentItem)}
                aria-label="Toggle favorite"
                className={`absolute top-4 left-4 z-10 p-2.5 rounded-full shadow-md backdrop-blur-sm transition-all cursor-pointer ${
                  currentItem.is_favorite
                    ? 'bg-[#1E392A] text-[#C2A674]'
                    : 'bg-white/80 text-stone-500 hover:text-amber-500'
                }`}
              >
                <Star className={`w-5 h-5 ${currentItem.is_favorite ? 'fill-[#C2A674]' : ''}`} />
              </button>

              {/* Before / After View Mode Pill */}
              {hasOriginal && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center bg-stone-900/85 backdrop-blur-md rounded-full p-1 shadow-lg text-[11px] font-semibold text-white">
                  <button
                    type="button"
                    onClick={() => setViewMode('clean')}
                    className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'clean'
                        ? 'bg-[#1E392A] text-[#FAF7F2] shadow-xs'
                        : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-[#C2A674]" />
                    Studio Clean
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('original')}
                    className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'original'
                        ? 'bg-stone-700 text-white shadow-xs'
                        : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3 text-stone-300" />
                    Original Raw
                  </button>
                </div>
              )}
            </div>

            {/* Quick Photo Re-processing Toolbar */}
            <div className="p-3 bg-stone-200/50 border-t border-stone-200/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-stone-500 font-medium">
                {viewMode === 'clean' ? '✨ Viewing cleaned product' : '📷 Viewing original photo'}
              </span>
              <div className="flex items-center gap-1.5">
                {hasOriginal && (
                  <button
                    type="button"
                    onClick={handleRestoreOriginal}
                    disabled={isRestoring || isEnhancing}
                    title="Revert closet view to original photo"
                    className="p-1.5 px-2 text-[11px] font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {isRestoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Restore
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReEnhance}
                  disabled={isEnhancing || isRestoring}
                  title="Re-run studio isolation & lighting enhancement"
                  className="p-1.5 px-2.5 text-[11px] font-semibold bg-[#1E392A] hover:bg-[#15291E] text-white rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  {isEnhancing ? (
                    <Loader2 className="w-3 h-3 animate-spin text-[#C2A674]" />
                  ) : (
                    <Wand2 className="w-3 h-3 text-[#C2A674]" />
                  )}
                  {currentItem.processing_status === 'completed' ? 'Re-enhance' : 'Enhance Photo'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed info & actions */}
          <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  {currentItem.brand || 'Unbranded'} • {currentItem.category}
                  {currentItem.subcategory ? ` › ${currentItem.subcategory}` : ''}
                </span>
                <h2 className="font-editorial text-2xl font-bold text-[#1C1917] mt-1 leading-snug">
                  {currentItem.name}
                </h2>
              </div>

              {/* Status Switcher Bar */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Availability Status
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-200/60 rounded-2xl text-xs font-semibold">
                  {(['clean', 'in_laundry', 'unavailable'] as ItemStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onUpdateStatus(currentItem, st)}
                      className={`py-1.5 px-2 rounded-xl transition-all capitalize cursor-pointer text-center ${
                        currentItem.status === st
                          ? 'bg-[#1E392A] text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-white rounded-2xl border border-[#E8E2D8] text-xs">
                <div>
                  <span className="text-stone-400 font-medium block">Color</span>
                  <span className="font-semibold text-stone-800">{currentItem.color}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-medium block">Size</span>
                  <span className="font-semibold text-stone-800">{currentItem.size || 'Not specified'}</span>
                </div>
                {currentItem.detected_attributes?.pattern && (
                  <div>
                    <span className="text-stone-400 font-medium block">Pattern</span>
                    <span className="font-semibold text-stone-800">{currentItem.detected_attributes.pattern}</span>
                  </div>
                )}
                {currentItem.detected_attributes?.material && (
                  <div>
                    <span className="text-stone-400 font-medium block">Material</span>
                    <span className="font-semibold text-stone-800">{currentItem.detected_attributes.material}</span>
                  </div>
                )}
                <div>
                  <span className="text-stone-400 font-medium block">Times Worn</span>
                  <span className="font-semibold text-[#1E392A]">{currentItem.times_worn || 0} times</span>
                </div>
                <div>
                  <span className="text-stone-400 font-medium block">Last Worn</span>
                  <span className="font-semibold text-stone-800">{currentItem.last_worn || 'Never recorded'}</span>
                </div>
              </div>

              {/* AI Detected Tags */}
              {currentItem.detected_attributes?.tags && currentItem.detected_attributes.tags.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-stone-600 block mb-1">
                    Visual Attributes
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentItem.detected_attributes.tags.map((tg, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 bg-[#FAF7F2] border border-[#E8E2D8] text-stone-700 text-[11px] font-medium rounded-lg"
                      >
                        #{tg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Seasons and Occasions tags */}
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-semibold text-stone-600 block mb-1">
                    Suitable Seasons
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentItem.season?.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 bg-[#EBF3EE] text-[#1E392A] text-[11px] font-medium rounded-lg"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {currentItem.occasion?.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-stone-600 block mb-1">
                      Occasions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentItem.occasion.map((occ) => (
                        <span
                          key={occ}
                          className="px-2.5 py-1 bg-stone-100 text-stone-700 text-[11px] font-medium rounded-lg"
                        >
                          {occ}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {currentItem.notes && (
                <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
                  <span className="text-[11px] font-semibold text-stone-500 block mb-0.5">Notes</span>
                  <p className="text-xs text-stone-700 leading-relaxed italic">{currentItem.notes}</p>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="space-y-2 pt-2 border-t border-[#E8E2D8]">
              <button
                type="button"
                onClick={() => onRecordWorn(currentItem)}
                className="w-full py-2.5 px-4 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-[#C2A674]" />
                <span>Mark as Worn Today</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(currentItem);
                  }}
                  className="flex-1 py-2 px-3 border border-stone-300 hover:border-stone-400 bg-white text-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Item</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-2 px-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Clothing Item"
        message={`Are you sure you want to permanently delete "${currentItem.name}" from your wardrobe? It will also be removed from any outfits containing it.`}
        confirmLabel="Delete Item"
        isDestructive={true}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete(currentItem);
          onClose();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};
