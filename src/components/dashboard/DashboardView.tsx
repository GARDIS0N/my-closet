import React, { useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Shirt,
  Layers,
  Calendar,
  CheckCircle2,
  Heart,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
  Eye,
  Upload,
} from 'lucide-react';
import {
  ClothingItem,
  SavedOutfit,
  CalendarEntry,
  UserProfile,
} from '../../types/closet.js';
import { NavTab } from '../navigation/Sidebar.js';
import { ClothingItemCard } from '../closet/ClothingItemCard.js';
import { OutfitCard } from '../outfits/OutfitCard.js';
import { generateRecommendations } from '../../services/recommendationEngine.js';
import { closetService } from '../../services/closetService.js';
import { showToast } from '../common/Toast.js';

interface DashboardViewProps {
  user: UserProfile | null;
  wardrobe: ClothingItem[];
  outfits: SavedOutfit[];
  calendarEntries: CalendarEntry[];
  isLoading: boolean;
  onNavigate: (tab: NavTab) => void;
  onOpenAddItem: () => void;
  onOpenBulkUpload?: () => void;
  onOpenOutfitCreator: () => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  wardrobe,
  outfits,
  calendarEntries,
  isLoading,
  onNavigate,
  onOpenAddItem,
  onOpenBulkUpload,
  onOpenOutfitCreator,
  onRefresh,
}) => {
  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Today's planned outfit
  const todayEntry = useMemo(() => {
    return calendarEntries.find((e) => e.date === todayStr);
  }, [calendarEntries, todayStr]);

  const todayOutfit = todayEntry?.outfit || outfits.find((o) => o.id === todayEntry?.outfit_id);

  // Statistics
  const cleanCount = wardrobe.filter((i) => i.status === 'clean').length;
  const laundryCount = wardrobe.filter((i) => i.status === 'in_laundry').length;
  const favoriteOutfits = outfits.filter((o) => o.is_favorite);
  const recentItems = wardrobe.slice(0, 4);

  // Prominent Outfit Recommendation (Outfit of the Day)
  const featuredRec = useMemo(() => {
    if (wardrobe.length < 2) return null;
    const recs = generateRecommendations(wardrobe, {
      occasion: user?.occasions?.[0] || 'Casual Outings',
      style: user?.preferred_style?.[0] || 'Minimalist',
      weather: 'Mild & Breezy',
      formality: 'Smart Casual',
    });
    return recs[0] || null;
  }, [wardrobe, user]);

  const handleWearFeatured = async () => {
    if (!featuredRec || !user) return;
    const items = featuredRec.items.map((item, idx) => ({
      slot: (idx === 0 ? 'top' : idx === 1 ? 'bottom' : idx === 2 ? 'shoes' : 'outerwear') as any,
      clothing_item_id: item.id,
      item,
    }));

    const outfit = await closetService.createOutfit({
      user_id: user.id,
      name: featuredRec.title,
      description: featuredRec.explanation,
      occasion: 'Casual Outings',
      style: 'Minimalist',
      season: 'All-Season',
      is_favorite: false,
      items,
    });

    await closetService.scheduleOutfit(user.id, todayStr, outfit.id, 'Today\'s recommendation');
    showToast('success', 'Look Scheduled', 'Set as today’s planned outfit!');
    onRefresh();
  };

  const handleToggleTodayWorn = async () => {
    if (!todayEntry) return;
    await closetService.markOutfitWorn(todayEntry.id, !todayEntry.is_worn);
    showToast('success', 'Logged Wear', 'Today\'s wear status updated.');
    onRefresh();
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Personalized Greeting & Hero Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#78716C] font-bold">
            Personal Wardrobe Edition
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#1C1917]">
            {greeting}, {user?.full_name?.split(' ')[0] || 'Stylist'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Here is your daily fashion curation and closet snapshot.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate('dressing-room')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-2xl text-xs font-semibold shadow-xs hover:shadow-md cursor-pointer transition-all"
          >
            <Eye className="w-4 h-4 text-[#C2A674]" />
            <span>Virtual Dressing Room</span>
          </button>
          {onOpenBulkUpload && (
            <button
              type="button"
              onClick={onOpenBulkUpload}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FAF7F2] border border-[#D6CEBF] hover:border-[#1E392A] text-[#1C1917] rounded-2xl text-xs font-semibold shadow-2xs cursor-pointer transition-all"
            >
              <Upload className="w-4 h-4 text-[#1E392A]" />
              <span>Bulk Digitizer</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddItem}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E8E2D8] hover:border-stone-400 text-stone-800 rounded-2xl text-xs font-semibold shadow-2xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Piece</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onNavigate('closet')}
          className="p-4 bg-white rounded-3xl border border-[#E8E2D8] shadow-xs cursor-pointer hover:border-[#1E392A] transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-stone-500 tracking-wider">
              Total Pieces
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#EBF3EE] text-[#1E392A] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Shirt className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="font-editorial text-2xl font-bold text-[#1C1917]">
            {wardrobe.length}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Archived in closet
          </p>
        </div>

        <div
          onClick={() => onNavigate('closet')}
          className="p-4 bg-white rounded-3xl border border-[#E8E2D8] shadow-xs cursor-pointer hover:border-[#1E392A] transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-stone-500 tracking-wider">
              Clean & Ready
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="font-editorial text-2xl font-bold text-[#1C1917]">
            {cleanCount}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Available to wear
          </p>
        </div>

        <div
          onClick={() => onNavigate('closet')}
          className="p-4 bg-white rounded-3xl border border-[#E8E2D8] shadow-xs cursor-pointer hover:border-[#1E392A] transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-stone-500 tracking-wider">
              In Laundry
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="font-editorial text-2xl font-bold text-[#1C1917]">
            {laundryCount}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            In wash cycle
          </p>
        </div>

        <div
          onClick={() => onNavigate('outfits')}
          className="p-4 bg-white rounded-3xl border border-[#E8E2D8] shadow-xs cursor-pointer hover:border-[#1E392A] transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-stone-500 tracking-wider">
              Saved Looks
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#EBF3EE] text-[#1E392A] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="font-editorial text-2xl font-bold text-[#1C1917]">
            {outfits.length}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {favoriteOutfits.length} favorited
          </p>
        </div>
      </div>

      {/* Main Feature: Today's Outfit & Featured Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Planned Look Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E2D8] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1E392A]" />
                <h3 className="font-editorial text-xl font-bold text-stone-900">
                  Today's Planned Look
                </h3>
              </div>
              <span className="text-xs font-semibold text-stone-500">
                {new Date().toLocaleDateString('default', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {todayOutfit ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D8] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#1E392A] bg-[#EBF3EE] px-2 py-0.5 rounded">
                        {todayOutfit.occasion}
                      </span>
                      <h4 className="font-editorial text-lg font-bold text-stone-900 mt-1">
                        {todayOutfit.name}
                      </h4>
                    </div>
                    {todayEntry?.is_worn && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Worn
                      </span>
                    )}
                  </div>

                  {/* Garments Preview */}
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {todayOutfit.items.map((ref, idx) => {
                      const item = ref.item || wardrobe.find((w) => w.id === ref.clothing_item_id);
                      if (!item) return null;
                      return (
                        <div
                          key={item.id + idx}
                          className="w-16 h-16 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 shadow-2xs group relative"
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {todayEntry?.notes && (
                    <p className="text-xs text-stone-600 italic">
                      "{todayEntry.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleTodayWorn}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      todayEntry?.is_worn
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#1E392A] hover:bg-[#15291E] text-white shadow-xs'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#C2A674]" />
                    <span>{todayEntry?.is_worn ? 'Worn Today (Click to Undo)' : 'Mark as Worn Today'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('calendar')}
                    className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors cursor-pointer"
                    title="View Calendar"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#FAF7F2] border border-dashed border-stone-300 text-center space-y-3">
                <Shirt className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="text-xs text-stone-600">
                  No look planned for today yet.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('calendar')}
                    className="px-4 py-2 bg-[#1E392A] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Plan from Looks
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('stylist')}
                    className="px-4 py-2 bg-white border border-[#E8E2D8] text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Get AI Recommendation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prominent Recommendation / Outfit of the Day */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E2D8] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C2A674]" />
                <h3 className="font-editorial text-xl font-bold text-stone-900">
                  Stylist Recommendation
                </h3>
              </div>
              <span className="text-xs font-bold text-[#1E392A] bg-[#EBF3EE] px-2.5 py-0.5 rounded-full">
                AI Curated
              </span>
            </div>

            {featuredRec ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D8] space-y-3">
                  <h4 className="font-editorial text-lg font-bold text-stone-900">
                    {featuredRec.title}
                  </h4>
                  <p className="text-xs text-stone-700 leading-relaxed line-clamp-2">
                    {featuredRec.explanation}
                  </p>

                  {/* Garments Preview */}
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {featuredRec.items.map((item) => (
                      <div
                        key={item.id}
                        className="w-16 h-16 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 shadow-2xs"
                        title={item.name}
                      >
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-stone-500 font-medium">
                    {featuredRec.color_harmony} • {featuredRec.weather_suitability}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleWearFeatured}
                    className="flex-1 py-2.5 px-4 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-[#C2A674]" />
                    <span>Wear This Today</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('stylist')}
                    className="px-4 py-2.5 bg-white border border-[#E8E2D8] hover:border-stone-400 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Explore More
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#FAF7F2] border border-dashed border-stone-300 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-[#C2A674] mx-auto" />
                <p className="text-xs text-stone-600">
                  {wardrobe.length < 2
                    ? 'Add at least 2 items to unlock intelligent AI styling.'
                    : 'Clean your garments to generate today’s looks.'}
                </p>
                {wardrobe.length === 0 && (
                  <button
                    type="button"
                    onClick={onOpenBulkUpload || onOpenAddItem}
                    className="px-4 py-2 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Upload My Wardrobe
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recently Added Clothing Garments Carousel/Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-editorial text-2xl font-bold text-[#1C1917]">
              Recently Added Pieces
            </h3>
            <p className="text-xs text-stone-600">
              Fresh additions to your digital archive.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('closet')}
            className="text-xs font-semibold text-[#1E392A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({wardrobe.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentItems.map((item) => (
              <ClothingItemCard
                key={item.id}
                item={item}
                onSelect={() => onNavigate('closet')}
                onToggleFavorite={async (e) => {
                  e.stopPropagation();
                  await closetService.toggleFavoriteItem(item.id);
                  onRefresh();
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl border border-[#E8E2D8] text-center space-y-3">
            <Shirt className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-xs text-stone-600">No clothing items added yet.</p>
            <button
              type="button"
              onClick={onOpenAddItem}
              className="px-4 py-2 bg-[#1E392A] text-white rounded-xl text-xs font-semibold"
            >
              Add First Item
            </button>
          </div>
        )}
      </div>

      {/* Favorite Looks Section */}
      {favoriteOutfits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-editorial text-2xl font-bold text-[#1C1917]">
                Favorite Ensembles
              </h3>
              <p className="text-xs text-stone-600">
                Your highest rated and go-to signatures.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('outfits')}
              className="text-xs font-semibold text-[#1E392A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>All Outfits ({outfits.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteOutfits.slice(0, 3).map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                wardrobe={wardrobe}
                onSelect={() => onNavigate('outfits')}
                onToggleFavorite={async (e) => {
                  e.stopPropagation();
                  await closetService.toggleFavoriteOutfit(outfit.id);
                  onRefresh();
                }}
                onEdit={() => onNavigate('outfits')}
                onDelete={() => onNavigate('outfits')}
                onSchedule={() => onNavigate('calendar')}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
