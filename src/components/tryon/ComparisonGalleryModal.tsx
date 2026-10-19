import React, { useState } from 'react';
import {
  X,
  Heart,
  Trash2,
  Columns,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { VirtualTryonRecord, ClothingItem } from '../../types/closet.js';
import { closetService } from '../../services/closetService.js';

interface ComparisonGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  tryonRecords: VirtualTryonRecord[];
  onRecordsUpdated: () => void;
  onSelectLookForStage?: (record: VirtualTryonRecord) => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ComparisonGalleryModal: React.FC<ComparisonGalleryModalProps> = ({
  isOpen,
  onClose,
  userId,
  tryonRecords,
  onRecordsUpdated,
  onSelectLookForStage,
  showToast,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleSelectForComparison = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id]; // keep max 2 for side-by-side
      return [...prev, id];
    });
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const fav = await closetService.toggleTryonFavorite(id);
      showToast('success', fav ? 'Favorited' : 'Unfavorited', 'Look updated in lookbook.');
      onRecordsUpdated();
    } catch (err: any) {
      showToast('error', 'Error', err?.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await closetService.deleteTryonRecord(id);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      showToast('info', 'Deleted', 'Simulation preview removed.');
      onRecordsUpdated();
    } catch (err: any) {
      showToast('error', 'Error', err?.message);
    }
  };

  const comparedRecords = tryonRecords.filter((r) => selectedIds.includes(r.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#E7E2D9] max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E2D9] bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-full bg-[#1E392A]/10 text-[#1E392A]">
              <Columns className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#1C1917]">
                Virtual Try-On Comparison Gallery
              </h2>
              <p className="text-xs text-[#78716C]">
                Select any 2 looks to compare fit, silhouettes, and color palettes side-by-side.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#78716C] hover:text-[#1C1917] rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Side-by-Side Comparison Box if 2 selected */}
          {comparedRecords.length === 2 && (
            <div className="bg-white rounded-3xl p-6 border-2 border-[#1E392A]/40 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1E392A] flex items-center gap-1.5">
                  <Columns className="w-4 h-4" />
                  <span>Side-by-Side Comparison</span>
                </span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-[#78716C] hover:text-[#1C1917]"
                >
                  Clear Selection
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {comparedRecords.map((record) => (
                  <div key={record.id} className="space-y-3 bg-[#FAF7F2] p-4 rounded-2xl border border-stone-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-base font-bold text-[#1C1917] truncate">
                        {record.outfit_name}
                      </h4>
                      <button
                        onClick={() => handleToggleFavorite(record.id)}
                        className="text-stone-400 hover:text-rose-600 transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${record.is_favorite ? 'fill-rose-600 text-rose-600' : ''}`}
                        />
                      </button>
                    </div>

                    <div className="aspect-3/4 rounded-xl overflow-hidden bg-stone-100 border border-stone-300">
                      <img
                        src={record.generated_image_url || record.person_image_url}
                        alt={record.outfit_name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-[#1C1917]">Garments in look:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {record.garments.map((g) => (
                          <span
                            key={g.id}
                            className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[11px] text-[#57534E]"
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Saved Try-On Records Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                Saved Simulations ({tryonRecords.length})
              </span>
              <span className="text-xs text-[#78716C]">
                Click checkboxes to select 2 looks for comparison
              </span>
            </div>

            {tryonRecords.length === 0 ? (
              <div className="border border-dashed border-stone-300 rounded-2xl p-12 text-center text-xs text-[#78716C] bg-white/40">
                No try-on simulations generated yet. Enter the Dressing Room and click "Generate Virtual Try-On".
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {tryonRecords.map((record) => {
                  const isSelected = selectedIds.includes(record.id);

                  return (
                    <div
                      key={record.id}
                      className={`relative bg-white rounded-2xl p-3 border transition-all shadow-xs flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#1E392A] ring-2 ring-[#1E392A]/20 bg-[#1E392A]/5'
                          : 'border-[#E7E2D9] hover:border-stone-400'
                      }`}
                    >
                      {/* Checkbox for Comparison */}
                      <label className="absolute top-2 left-2 z-10 flex items-center p-1 bg-white/90 rounded-md shadow-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectForComparison(record.id)}
                          className="h-3.5 w-3.5 rounded text-[#1E392A] focus:ring-[#1E392A]"
                        />
                      </label>

                      {/* Favorite Button */}
                      <button
                        onClick={() => handleToggleFavorite(record.id)}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-xs text-stone-400 hover:text-rose-600 transition-colors"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${record.is_favorite ? 'fill-rose-600 text-rose-600' : ''}`}
                        />
                      </button>

                      {/* Image Preview */}
                      <div className="aspect-3/4 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 mb-2">
                        <img
                          src={record.generated_image_url || record.person_image_url}
                          alt={record.outfit_name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      {/* Look Info */}
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#1C1917] truncate">{record.outfit_name}</p>
                        <p className="text-[10px] text-[#78716C]">
                          {new Date(record.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Bottom actions */}
                      <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => {
                            if (onSelectLookForStage) onSelectLookForStage(record);
                            onClose();
                          }}
                          className="text-[11px] font-medium text-[#1E392A] hover:underline"
                        >
                          Load on Stage
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E7E2D9] bg-white/70 backdrop-blur-sm flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-[#1E392A] text-white text-xs font-medium hover:bg-[#162A1F] transition-all"
          >
            Close Gallery
          </button>
        </div>
      </div>
    </div>
  );
};
