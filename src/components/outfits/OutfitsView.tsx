import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Heart,
  Calendar as CalendarIcon,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  SavedOutfit,
  ClothingItem,
  POPULAR_OCCASIONS,
  STYLE_OPTIONS,
} from '../../types/closet.js';
import { OutfitCard } from './OutfitCard.js';
import { OutfitCreator } from './OutfitCreator.js';
import { ConfirmationModal } from '../common/ConfirmationModal.js';
import { closetService } from '../../services/closetService.js';
import { showToast } from '../common/Toast.js';

interface OutfitsViewProps {
  userId: string;
  outfits: SavedOutfit[];
  wardrobe: ClothingItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateToCalendar: () => void;
}

export const OutfitsView: React.FC<OutfitsViewProps> = ({
  userId,
  outfits,
  wardrobe,
  isLoading,
  onRefresh,
  onNavigateToCalendar,
}) => {
  const [search, setSearch] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('All');
  const [selectedStyle, setSelectedStyle] = useState<string>('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Modals
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<SavedOutfit | null>(null);
  const [deletingOutfit, setDeletingOutfit] = useState<SavedOutfit | null>(null);

  // Quick Schedule Modal
  const [schedulingOutfit, setSchedulingOutfit] = useState<SavedOutfit | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const filteredOutfits = useMemo(() => {
    let list = [...outfits];

    if (favoritesOnly) {
      list = list.filter((o) => o.is_favorite);
    }

    if (selectedOccasion !== 'All') {
      list = list.filter((o) => o.occasion === selectedOccasion);
    }

    if (selectedStyle !== 'All') {
      list = list.filter((o) => o.style === selectedStyle);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q) ||
          o.items.some((ref) => {
            const item = wardrobe.find((w) => w.id === ref.clothing_item_id);
            return item?.name.toLowerCase().includes(q) || item?.color.toLowerCase().includes(q);
          })
      );
    }

    return list;
  }, [outfits, favoritesOnly, selectedOccasion, selectedStyle, search, wardrobe]);

  const handleToggleFavorite = async (e: React.MouseEvent, outfit: SavedOutfit) => {
    e.stopPropagation();
    await closetService.toggleFavoriteOutfit(outfit.id);
    onRefresh();
  };

  const handleDeleteOutfit = async () => {
    if (!deletingOutfit) return;
    await closetService.deleteOutfit(deletingOutfit.id);
    showToast('info', 'Outfit Deleted', `"${deletingOutfit.name}" removed.`);
    setDeletingOutfit(null);
    onRefresh();
  };

  const handleConfirmSchedule = async () => {
    if (!schedulingOutfit) return;
    await closetService.scheduleOutfit(userId, scheduleDate, schedulingOutfit.id, `Planned for ${schedulingOutfit.name}`);
    showToast('success', 'Outfit Scheduled', `"${schedulingOutfit.name}" booked for ${scheduleDate}.`);
    setSchedulingOutfit(null);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#78716C] font-bold">
            Lookbook
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#1C1917]">
            Saved Outfits
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            {outfits.length} complete looks assembled from your wardrobe pieces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Outfits"
            className="p-2.5 bg-white border border-[#E8E2D8] hover:border-stone-400 rounded-2xl text-stone-700 cursor-pointer transition-colors shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingOutfit(null);
              setIsCreatorOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-2xl text-xs font-semibold shadow-xs hover:shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Look</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-[#E8E2D8] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search looks by name, piece, or color..."
            className="w-full pl-10 pr-9 py-2.5 bg-[#FAF7F2] border border-[#E8E2D8] rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-[#1E392A]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-stone-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedOccasion}
            onChange={(e) => setSelectedOccasion(e.target.value)}
            className="px-3 py-2 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs font-medium text-stone-700 cursor-pointer"
          >
            <option value="All">All Occasions</option>
            {POPULAR_OCCASIONS.map((occ) => (
              <option key={occ} value={occ}>
                {occ}
              </option>
            ))}
          </select>

          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="px-3 py-2 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs font-medium text-stone-700 cursor-pointer"
          >
            <option value="All">All Styles</option>
            {STYLE_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
              favoritesOnly
                ? 'bg-[#1E392A] text-rose-300 border-[#1E392A]'
                : 'bg-[#FAF7F2] text-stone-600 border-[#E8E2D8]'
            }`}
          >
            <Heart className={`w-4 h-4 ${favoritesOnly ? 'fill-rose-300' : ''}`} />
            <span className="hidden sm:inline">Favorites</span>
          </button>
        </div>
      </div>

      {/* Outfits Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-[#E8E2D8] space-y-3">
              <div className="w-full aspect-4/3 rounded-2xl skeleton-shimmer" />
              <div className="h-4 w-2/3 rounded-md skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : filteredOutfits.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOutfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              wardrobe={wardrobe}
              onSelect={(o) => {
                setEditingOutfit(o);
                setIsCreatorOpen(true);
              }}
              onToggleFavorite={handleToggleFavorite}
              onEdit={(e, o) => {
                e.stopPropagation();
                setEditingOutfit(o);
                setIsCreatorOpen(true);
              }}
              onDelete={(e, o) => {
                e.stopPropagation();
                setDeletingOutfit(o);
              }}
              onSchedule={(e, o) => {
                e.stopPropagation();
                setSchedulingOutfit(o);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E8E2D8] p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-3xl bg-[#EBF3EE] text-[#1E392A] flex items-center justify-center mx-auto shadow-inner">
            <Layers className="w-8 h-8 text-[#C2A674]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-editorial text-2xl font-bold text-[#1C1917]">
              No Outfits Found
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto">
              Combine your tops, trousers, outerwear, and footwear into harmonious ensembles.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingOutfit(null);
              setIsCreatorOpen(true);
            }}
            className="px-5 py-2.5 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-2xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            Create Your First Look
          </button>
        </div>
      )}

      {/* Outfit Creator Modal */}
      <OutfitCreator
        userId={userId}
        wardrobe={wardrobe}
        outfitToEdit={editingOutfit}
        isOpen={isCreatorOpen}
        onClose={() => {
          setIsCreatorOpen(false);
          setEditingOutfit(null);
        }}
        onSaved={() => {
          onRefresh();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deletingOutfit)}
        title="Delete Saved Outfit"
        message={`Are you sure you want to delete "${deletingOutfit?.name}"? Your individual garments will remain in your wardrobe.`}
        confirmLabel="Delete Outfit"
        isDestructive={true}
        onConfirm={handleDeleteOutfit}
        onCancel={() => setDeletingOutfit(null)}
      />

      {/* Quick Schedule Date Modal */}
      {schedulingOutfit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-editorial text-xl font-bold text-stone-900">
                Plan Outfit
              </h4>
              <button onClick={() => setSchedulingOutfit(null)} className="p-1 text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Select date to wear <span className="font-bold text-stone-900">{schedulingOutfit.name}</span>:
            </p>

            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-[#E8E2D8] rounded-xl text-xs font-semibold text-stone-800"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E2D8]">
              <button
                type="button"
                onClick={() => setSchedulingOutfit(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSchedule}
                className="px-4 py-2 bg-[#1E392A] text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Add to Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
