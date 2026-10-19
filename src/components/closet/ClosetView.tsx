import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  SlidersHorizontal,
  Star,
  Shirt,
  Sparkles,
  RefreshCw,
  Tag,
  ArrowUpDown,
  X,
  Upload,
} from 'lucide-react';
import {
  ClothingItem,
  STANDARD_CATEGORIES,
  ALL_SEASONS,
  ItemStatus,
  Season,
} from '../../types/closet.js';
import { ClothingItemCard } from './ClothingItemCard.js';
import { ClothingDetailModal } from './ClothingDetailModal.js';
import { AddEditClothingModal } from './AddEditClothingModal.js';
import { SkeletonCard } from '../common/SkeletonCard.js';
import { closetService } from '../../services/closetService.js';
import { showToast } from '../common/Toast.js';

interface ClosetViewProps {
  userId: string;
  items: ClothingItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenAddItem: () => void;
  onOpenBulkUpload?: () => void;
}

export const ClosetView: React.FC<ClosetViewProps> = ({
  userId,
  items,
  isLoading,
  onRefresh,
  onOpenAddItem,
  onOpenBulkUpload,
}) => {
  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ItemStatus>('all');
  const [seasonFilter, setSeasonFilter] = useState<'all' | Season>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'worn' | 'name' | 'oldest'>('newest');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Modals
  const [activeItem, setActiveItem] = useState<ClothingItem | null>(null);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Derive categories and item counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length };
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  const uniqueCategories = useMemo(() => {
    const custom = items
      .map((i) => i.category)
      .filter((cat) => !STANDARD_CATEGORIES.includes(cat as any));
    return ['All', ...STANDARD_CATEGORIES, ...Array.from(new Set(custom))];
  }, [items]);

  // Filter & Sort Logic
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter((i) => i.category === selectedCategory);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter);
    }

    // Season filter
    if (seasonFilter !== 'all') {
      result = result.filter(
        (i) => i.season.includes(seasonFilter) || i.season.includes('All-Season')
      );
    }

    // Favorites filter
    if (onlyFavorites) {
      result = result.filter((i) => i.is_favorite);
    }

    // Search query (name, brand, color, notes, category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.brand?.toLowerCase().includes(q) ||
          i.color.toLowerCase().includes(q) ||
          i.notes?.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'worn') {
        return (b.times_worn || 0) - (a.times_worn || 0);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [items, selectedCategory, statusFilter, seasonFilter, onlyFavorites, searchQuery, sortBy]);

  // Card interaction handlers
  const handleSelectItem = (item: ClothingItem) => {
    setActiveItem(item);
    setIsDetailOpen(true);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, item: ClothingItem) => {
    e.stopPropagation();
    const updated = await closetService.toggleFavoriteItem(item.id);
    onRefresh();
  };

  const handleUpdateStatus = async (item: ClothingItem, status: ItemStatus) => {
    await closetService.updateItemStatus(item.id, status);
    if (activeItem?.id === item.id) {
      setActiveItem({ ...activeItem, status });
    }
    showToast('info', 'Status Updated', `${item.name} marked as ${status.replace('_', ' ')}.`);
    onRefresh();
  };

  const handleRecordWorn = async (item: ClothingItem) => {
    await closetService.recordItemWorn(item.id);
    if (activeItem?.id === item.id) {
      setActiveItem({
        ...activeItem,
        times_worn: (activeItem.times_worn || 0) + 1,
        last_worn: new Date().toISOString().split('T')[0],
      });
    }
    showToast('success', 'Logged Wear', `${item.name} marked worn today!`);
    onRefresh();
  };

  const handleDeleteItem = async (item: ClothingItem) => {
    await closetService.deleteItem(item.id, userId);
    showToast('info', 'Item Deleted', `Removed "${item.name}" from wardrobe.`);
    onRefresh();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#78716C] font-bold">
            Curated Archive
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#1C1917]">
            My Wardrobe
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            {items.length} garments in rotation • {categoryCounts['Clean'] || items.filter(i => i.status === 'clean').length} clean & ready to wear
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Wardrobe"
            className="p-2.5 bg-white border border-[#E8E2D8] hover:border-stone-400 rounded-2xl text-stone-700 cursor-pointer transition-colors shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onOpenBulkUpload && (
            <button
              type="button"
              onClick={onOpenBulkUpload}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FAF7F2] border border-[#D6CEBF] hover:border-[#1E392A] text-[#1C1917] rounded-2xl text-xs font-semibold shadow-2xs cursor-pointer transition-all"
            >
              <Upload className="w-4 h-4 text-[#1E392A]" />
              <span className="hidden sm:inline">Bulk Digitizer</span>
              <span className="sm:hidden">Bulk</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddItem}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-2xl text-xs font-semibold shadow-xs hover:shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Clothing</span>
          </button>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {uniqueCategories.map((cat) => {
          const count = categoryCounts[cat] || 0;
          if (cat !== 'All' && count === 0) return null; // keep clean
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-[#1E392A] text-white border-[#1E392A] shadow-xs'
                  : 'bg-white text-stone-700 border-[#E8E2D8] hover:border-stone-400'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filters Controls Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-[#E8E2D8] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, brand, color, or notes..."
            className="w-full pl-10 pr-9 py-2.5 bg-[#FAF7F2] border border-[#E8E2D8] rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-[#1E392A] placeholder:text-stone-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Quick Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs font-medium text-stone-700 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="clean">Clean Only</option>
            <option value="in_laundry">In Laundry</option>
            <option value="unavailable">Unavailable</option>
          </select>

          {/* Season Quick Filter */}
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value as any)}
            className="px-3 py-2 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs font-medium text-stone-700 cursor-pointer"
          >
            <option value="all">All Seasons</option>
            {ALL_SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-medium text-stone-700 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest Added</option>
              <option value="worn">Most Worn</option>
              <option value="name">Name (A-Z)</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {/* Favorites Filter Button */}
          <button
            type="button"
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
              onlyFavorites
                ? 'bg-[#1E392A] text-[#C2A674] border-[#1E392A]'
                : 'bg-[#FAF7F2] text-stone-600 border-[#E8E2D8] hover:border-stone-400'
            }`}
            title="Show only favorites"
          >
            <Star className={`w-4 h-4 ${onlyFavorites ? 'fill-[#C2A674]' : ''}`} />
            <span className="hidden sm:inline">Favorites</span>
          </button>
        </div>
      </div>

      {/* Clothing Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredItems.map((item) => (
            <ClothingItemCard
              key={item.id}
              item={item}
              onSelect={handleSelectItem}
              onToggleFavorite={handleToggleFavorite}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-[#E8E2D8] p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-3xl bg-[#EBF3EE] text-[#1E392A] flex items-center justify-center mx-auto shadow-inner">
            <Shirt className="w-8 h-8 text-[#C2A674]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-editorial text-2xl font-bold text-[#1C1917]">
              {items.length === 0 ? 'Your Wardrobe is Empty' : 'No Garments Match Filters'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto">
              {items.length === 0
                ? 'Start by taking or uploading photos of your favorite pieces to unlock outfit styling.'
                : 'Try adjusting your search query, status, or season filters to see your items.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {items.length === 0 ? (
              <>
                <button
                  type="button"
                  onClick={onOpenAddItem}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-2xl text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Your First Item</span>
                </button>
                {onOpenBulkUpload && (
                  <button
                    type="button"
                    onClick={onOpenBulkUpload}
                    className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#1E392A]" />
                    <span>Bulk Upload Wardrobe</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setStatusFilter('all');
                  setSeasonFilter('all');
                  setOnlyFavorites(false);
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Clothing Detail Modal */}
      <ClothingDetailModal
        isOpen={isDetailOpen}
        item={activeItem}
        onClose={() => {
          setIsDetailOpen(false);
          setActiveItem(null);
        }}
        onEdit={(item) => {
          setEditingItem(item);
          setIsEditOpen(true);
        }}
        onDelete={handleDeleteItem}
        onToggleFavorite={(item) => handleToggleFavorite({ stopPropagation: () => {} } as any, item)}
        onUpdateStatus={handleUpdateStatus}
        onRecordWorn={handleRecordWorn}
        onItemUpdated={() => onRefresh()}
      />

      {/* Add / Edit Modal */}
      <AddEditClothingModal
        isOpen={isEditOpen}
        itemToEdit={editingItem}
        userId={userId}
        onClose={() => {
          setIsEditOpen(false);
          setEditingItem(null);
        }}
        onSaved={() => {
          onRefresh();
        }}
      />
    </div>
  );
};
