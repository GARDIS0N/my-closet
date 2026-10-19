import React from 'react';
import { Heart, Calendar, Edit2, Trash2, Sparkles } from 'lucide-react';
import { SavedOutfit, ClothingItem } from '../../types/closet.js';

interface OutfitCardProps {
  outfit: SavedOutfit;
  wardrobe: ClothingItem[];
  onSelect: (outfit: SavedOutfit) => void;
  onToggleFavorite: (e: React.MouseEvent, outfit: SavedOutfit) => void;
  onEdit: (e: React.MouseEvent, outfit: SavedOutfit) => void;
  onDelete: (e: React.MouseEvent, outfit: SavedOutfit) => void;
  onSchedule: (e: React.MouseEvent, outfit: SavedOutfit) => void;
}

export const OutfitCard: React.FC<OutfitCardProps> = ({
  outfit,
  wardrobe,
  onSelect,
  onToggleFavorite,
  onEdit,
  onDelete,
  onSchedule,
}) => {
  // Resolve item instances from wardrobe
  const items = outfit.items
    .map((ref) => ref.item || wardrobe.find((w) => w.id === ref.clothing_item_id))
    .filter(Boolean) as ClothingItem[];

  return (
    <div
      onClick={() => onSelect(outfit)}
      className="group bg-white rounded-3xl border border-[#E8E2D8] overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer"
    >
      {/* Composite Garments Mosaic */}
      <div className="relative w-full aspect-4/3 bg-stone-100 p-2 overflow-hidden">
        <div
          className={`w-full h-full grid gap-1.5 rounded-2xl overflow-hidden ${
            items.length === 1
              ? 'grid-cols-1'
              : items.length === 2
              ? 'grid-cols-2'
              : items.length === 3
              ? 'grid-cols-3'
              : 'grid-cols-2 grid-rows-2'
          }`}
        >
          {items.slice(0, 4).map((item, idx) => (
            <div key={item.id + idx} className="relative w-full h-full bg-stone-200 overflow-hidden">
              <img
                src={item.image_url}
                alt={item.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={(e) => onToggleFavorite(e, outfit)}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md ${
            outfit.is_favorite
              ? 'bg-[#1E392A] text-rose-400'
              : 'bg-white/90 backdrop-blur-sm text-stone-500 hover:text-rose-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${outfit.is_favorite ? 'fill-rose-400 text-rose-400' : ''}`} />
        </button>

        {/* Pieces Counter */}
        <span className="absolute bottom-4 left-4 bg-stone-900/75 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-xs">
          {items.length} pieces
        </span>
      </div>

      {/* Outfit Info */}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E392A] bg-[#EBF3EE] px-2 py-0.5 rounded-md">
              {outfit.occasion}
            </span>
            <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              {outfit.style}
            </span>
          </div>

          <h4 className="font-editorial text-lg font-bold text-[#1C1917] group-hover:text-[#1E392A] transition-colors leading-tight">
            {outfit.name}
          </h4>

          {outfit.description && (
            <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
              {outfit.description}
            </p>
          )}
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F3EFEA]">
          <button
            type="button"
            onClick={(e) => onSchedule(e, outfit)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-[#EBF3EE] hover:bg-[#C8DDD0] text-[#1E392A] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Plan in Calendar</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => onEdit(e, outfit)}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
              title="Edit Outfit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => onDelete(e, outfit)}
              className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete Outfit"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
