import React from 'react';
import { Star, Sparkles, Tag, Check, Shirt, MoreVertical } from 'lucide-react';
import { ClothingItem, ItemStatus } from '../../types/closet.js';

interface ClothingItemCardProps {
  item: ClothingItem;
  onSelect: (item: ClothingItem) => void;
  onToggleFavorite: (e: React.MouseEvent, item: ClothingItem) => void;
  onUpdateStatus?: (item: ClothingItem, status: ItemStatus) => void;
}

export const ClothingItemCard: React.FC<ClothingItemCardProps> = ({
  item,
  onSelect,
  onToggleFavorite,
  onUpdateStatus,
}) => {
  const statusLabels: Record<ItemStatus, { label: string; badgeClass: string; dot: string }> = {
    clean: {
      label: 'Clean',
      badgeClass: 'bg-[#EBF3EE] text-[#1E392A] border-[#C8DDD0]',
      dot: 'bg-emerald-600',
    },
    in_laundry: {
      label: 'In Laundry',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
    },
    unavailable: {
      label: 'Unavailable',
      badgeClass: 'bg-stone-100 text-stone-600 border-stone-200',
      dot: 'bg-stone-400',
    },
  };

  const statusConfig = statusLabels[item.status] || statusLabels.clean;
  const isStudioClean = item.processing_status === 'completed' || Boolean(item.processed_image_url);

  return (
    <div
      onClick={() => onSelect(item)}
      className="group bg-white rounded-3xl border border-[#E8E2D8] overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer relative"
    >
      {/* Image Container with aspect ratio */}
      <div
        className={`relative w-full aspect-4/5 overflow-hidden flex items-center justify-center transition-colors ${
          isStudioClean
            ? 'bg-gradient-to-b from-[#FDFCFA] via-white to-[#F8F6F2] p-4'
            : 'bg-stone-100'
        }`}
      >
        <img
          src={item.image_url}
          alt={item.name}
          loading="lazy"
          className={`w-full h-full group-hover:scale-105 transition-transform duration-500 ${
            isStudioClean
              ? 'object-contain object-center drop-shadow-[0_6px_14px_rgba(0,0,0,0.06)]'
              : 'object-cover object-center'
          }`}
          onError={(e) => {
            // Fallback for broken links
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Gradient Overlay for card contrast on raw photos */}
        {!isStudioClean && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 opacity-60 group-hover:opacity-40 transition-opacity" />
        )}

        {/* Favorite Star Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e, item);
          }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md ${
            item.is_favorite
              ? 'bg-[#1E392A] text-[#C2A674]'
              : 'bg-white/80 backdrop-blur-sm text-stone-500 hover:text-amber-500'
          }`}
          aria-label={item.is_favorite ? 'Remove favorite' : 'Add to favorites'}
        >
          <Star
            className={`w-4 h-4 ${
              item.is_favorite ? 'fill-[#C2A674] text-[#C2A674]' : ''
            }`}
          />
        </button>

        {/* Status Pill on Image */}
        <div className="absolute bottom-3 left-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border backdrop-blur-md shadow-xs ${statusConfig.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            <span>{statusConfig.label}</span>
          </span>
        </div>

        {/* Category tag & studio indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-1">
          {item.category && (
            <span className="bg-stone-900/75 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide">
              {item.category}
            </span>
          )}
          {isStudioClean && (
            <span
              title="Studio photo cleaned & isolated"
              className="bg-[#1E392A]/90 backdrop-blur-sm text-[#C2A674] p-1 rounded-md text-[10px] flex items-center shadow-xs"
            >
              <Sparkles className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
      </div>

      {/* Item Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-1.5 bg-white">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              {item.brand || 'Unbranded'}
            </span>
            {item.size && (
              <span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                {item.size}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-[#1C1917] line-clamp-1 group-hover:text-[#1E392A] transition-colors">
            {item.name}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#F3EFEA] text-[11px] text-stone-500">
          <span className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full border border-stone-300"
              style={{
                backgroundColor:
                  item.color.toLowerCase().includes('white')
                    ? '#FFFFFF'
                    : item.color.toLowerCase().includes('black')
                    ? '#000000'
                    : item.color.toLowerCase().includes('green')
                    ? '#1E392A'
                    : item.color.toLowerCase().includes('blue')
                    ? '#1E293B'
                    : item.color.toLowerCase().includes('brown')
                    ? '#8B5A2B'
                    : '#A8A29E',
              }}
            />
            <span className="truncate max-w-[90px]">{item.color}</span>
          </span>

          <span>Worn {item.times_worn || 0}×</span>
        </div>
      </div>
    </div>
  );
};
