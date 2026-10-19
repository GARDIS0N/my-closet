import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Layers,
  Sparkles,
  Shirt,
  Footprints,
  Watch,
  Check,
} from 'lucide-react';
import {
  ClothingItem,
  SavedOutfit,
  OutfitItemRef,
  OutfitSlot,
  POPULAR_OCCASIONS,
  STYLE_OPTIONS,
  ALL_SEASONS,
} from '../../types/closet.js';
import { closetService } from '../../services/closetService.js';
import { showToast } from '../common/Toast.js';

interface OutfitCreatorProps {
  userId: string;
  wardrobe: ClothingItem[];
  outfitToEdit?: SavedOutfit | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (outfit: SavedOutfit) => void;
}

export const OutfitCreator: React.FC<OutfitCreatorProps> = ({
  userId,
  wardrobe,
  outfitToEdit,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [occasion, setOccasion] = useState<string>('Casual Outings');
  const [style, setStyle] = useState<string>('Minimalist');
  const [season, setSeason] = useState<string>('All-Season');
  const [selectedItems, setSelectedItems] = useState<OutfitItemRef[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // Clothing item picker modal state
  const [pickingSlot, setPickingSlot] = useState<OutfitSlot | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (outfitToEdit) {
      setName(outfitToEdit.name);
      setDescription(outfitToEdit.description || '');
      setOccasion(outfitToEdit.occasion);
      setStyle(outfitToEdit.style);
      setSeason(outfitToEdit.season);
      setIsFavorite(outfitToEdit.is_favorite);
      setSelectedItems(outfitToEdit.items || []);
    } else {
      setName('');
      setDescription('');
      setOccasion('Casual Outings');
      setStyle('Minimalist');
      setSeason('All-Season');
      setIsFavorite(false);
      setSelectedItems([]);
    }
    setError(null);
  }, [isOpen, outfitToEdit]);

  if (!isOpen) return null;

  const SLOTS: { slot: OutfitSlot; title: string; hint: string; icon: any }[] = [
    { slot: 'top', title: 'Top / Base', hint: 'Shirts, tees, knitwear', icon: Shirt },
    { slot: 'bottom', title: 'Bottom', hint: 'Trousers, denim, shorts', icon: Layers },
    { slot: 'shoes', title: 'Footwear', hint: 'Sneakers, boots, loafers', icon: Footprints },
    { slot: 'outerwear', title: 'Outerwear', hint: 'Jackets, blazers, coats', icon: Shirt },
    { slot: 'accessory', title: 'Accessories', hint: 'Belts, bags, scarves', icon: Watch },
  ];

  // Helper to get item attached to slot
  const getItemForSlot = (slot: OutfitSlot): ClothingItem | undefined => {
    const ref = selectedItems.find((i) => i.slot === slot);
    if (!ref) return undefined;
    return ref.item || wardrobe.find((w) => w.id === ref.clothing_item_id);
  };

  const handleAssignItem = (item: ClothingItem, slot: OutfitSlot) => {
    const updated = selectedItems.filter((i) => i.slot !== slot);
    updated.push({
      slot,
      clothing_item_id: item.id,
      item,
    });
    setSelectedItems(updated);
    setPickingSlot(null);
  };

  const handleRemoveSlot = (slot: OutfitSlot) => {
    setSelectedItems(selectedItems.filter((i) => i.slot !== slot));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an outfit name.');
      return;
    }
    if (selectedItems.length < 2) {
      setError('Please select at least 2 garments (e.g. Top + Bottom) to create an outfit.');
      return;
    }

    setSaving(true);
    try {
      if (outfitToEdit) {
        const updated = await closetService.updateOutfit(outfitToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          occasion,
          style,
          season,
          is_favorite: isFavorite,
          items: selectedItems,
        });
        if (updated) {
          showToast('success', 'Outfit Saved', `Updated "${updated.name}".`);
          onSaved(updated);
          onClose();
        }
      } else {
        const created = await closetService.createOutfit({
          user_id: userId,
          name: name.trim(),
          description: description.trim(),
          occasion,
          style,
          season,
          is_favorite: isFavorite,
          items: selectedItems,
        });
        showToast('success', 'Outfit Created', `"${created.name}" saved to your outfits.`);
        onSaved(created);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save outfit.');
    } finally {
      setSaving(false);
    }
  };

  // Filter wardrobe for current picking slot
  const candidatesForSlot = wardrobe.filter((w) => {
    if (!pickingSlot) return false;
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase();
      if (!w.name.toLowerCase().includes(q) && !w.color.toLowerCase().includes(q)) return false;
    }
    const cat = w.category.toLowerCase();
    if (pickingSlot === 'top') {
      return cat.includes('t-shirt') || cat.includes('shirt') || cat.includes('sweater') || cat.includes('hoodie');
    }
    if (pickingSlot === 'bottom') {
      return cat.includes('trouser') || cat.includes('jean') || cat.includes('short');
    }
    if (pickingSlot === 'shoes') {
      return cat.includes('shoe') || cat.includes('sneaker') || cat.includes('boot');
    }
    if (pickingSlot === 'outerwear') {
      return cat.includes('jacket') || cat.includes('coat') || cat.includes('blazer') || cat.includes('formal');
    }
    if (pickingSlot === 'accessory') {
      return cat.includes('access') || cat.includes('belt') || cat.includes('bag') || cat.includes('hat');
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative p-6 sm:p-8 animate-in zoom-in-95 flex flex-col md:flex-row gap-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/50 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: Visual Canvas / Flatlay Collage */}
        <div className="w-full md:w-1/2 flex flex-col space-y-4">
          <div>
            <span className="text-[11px] uppercase tracking-widest font-bold text-stone-500">
              Interactive Canvas
            </span>
            <h3 className="font-editorial text-2xl font-bold text-[#1C1917]">
              Flatlay Composition
            </h3>
            <p className="text-xs text-stone-600">
              Tap any slot to choose an actual item from your closet.
            </p>
          </div>

          {/* Slots Grid Canvas */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-3xl border border-[#E8E2D8] min-h-[360px] shadow-2xs">
            {SLOTS.map(({ slot, title, icon: SlotIcon }) => {
              const item = getItemForSlot(slot);
              return (
                <div
                  key={slot}
                  onClick={() => setPickingSlot(slot)}
                  className={`relative rounded-2xl border transition-all cursor-pointer overflow-hidden group flex flex-col justify-between ${
                    item
                      ? 'border-[#E8E2D8] bg-stone-50 shadow-xs hover:border-[#1E392A]'
                      : 'border-dashed border-stone-300 hover:border-[#1E392A] bg-[#FAF7F2]/50 hover:bg-[#EBF3EE]/40 p-4 text-center items-center justify-center min-h-[140px]'
                  }`}
                >
                  {item ? (
                    <>
                      <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSlot(slot);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                          title="Remove from outfit"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[9px] font-semibold uppercase tracking-wider">
                          {slot}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white">
                        <p className="text-xs font-semibold text-stone-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-stone-500 truncate">
                          {item.color} • {item.brand || item.category}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-500 group-hover:text-[#1E392A] group-hover:border-[#1E392A] transition-colors">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-stone-700 group-hover:text-[#1E392A]">
                        + {title}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-[#EBF3EE] rounded-2xl border border-[#C8DDD0] flex items-center gap-2 text-xs text-[#1E392A]">
            <Sparkles className="w-4 h-4 shrink-0 text-[#C2A674]" />
            <span>
              {selectedItems.length} clothing {selectedItems.length === 1 ? 'piece' : 'pieces'} selected for this look.
            </span>
          </div>
        </div>

        {/* Right Column: Metadata Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-between space-y-5">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <h3 className="font-editorial text-2xl font-bold text-[#1C1917]">
                Outfit Details
              </h3>
              <p className="text-xs text-stone-600">
                Categorize your look for intelligent calendar planning.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Outfit Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tailored Autumn Minimalist"
                className="w-full px-4 py-2.5 bg-white border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#1E392A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Styling Description & Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Crisp white shirt tucked into pleated trousers with trench coat"
                className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-xl text-xs focus:outline-none focus:border-[#1E392A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Occasion
                </label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-xl text-xs font-medium text-stone-700"
                >
                  {POPULAR_OCCASIONS.map((occ) => (
                    <option key={occ} value={occ}>
                      {occ}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-xl text-xs font-medium text-stone-700"
                >
                  {STYLE_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ideal Season
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-xl text-xs font-medium text-stone-700"
              >
                {ALL_SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="favOutfit"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="rounded text-[#1E392A] focus:ring-[#1E392A]"
              />
              <label htmlFor="favOutfit" className="text-xs font-medium text-stone-700 cursor-pointer">
                Mark as Favorite Outfit
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E2D8]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#1E392A] hover:bg-[#15291E] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Look...' : outfitToEdit ? 'Save Changes' : 'Create Outfit'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Wardrobe Item Selection Drawer / Picker */}
      {pickingSlot && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-editorial text-xl font-bold text-stone-900 capitalize">
                  Select {pickingSlot} Garment
                </h4>
                <p className="text-xs text-stone-500">
                  Choose from your clean and available closet pieces.
                </p>
              </div>
              <button
                onClick={() => setPickingSlot(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search pieces..."
              className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-xl text-xs focus:outline-none"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
              {candidatesForSlot.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAssignItem(item, pickingSlot)}
                  className="bg-white rounded-2xl border border-[#E8E2D8] overflow-hidden hover:border-[#1E392A] cursor-pointer group shadow-2xs transition-all p-2 flex flex-col justify-between"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-stone-100 mb-2">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-stone-900 truncate">
                      {item.name}
                    </h5>
                    <p className="text-[10px] text-stone-500 truncate">
                      {item.color} • {item.brand || item.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {candidatesForSlot.length === 0 && (
              <div className="py-8 text-center space-y-2">
                <Shirt className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="text-xs text-stone-600">
                  No matching garments found for this category.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
