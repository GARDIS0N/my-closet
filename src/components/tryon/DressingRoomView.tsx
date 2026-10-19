import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Camera,
  Shirt,
  Layers,
  Heart,
  Calendar,
  Eye,
  RefreshCw,
  AlertCircle,
  Sliders,
  Check,
  ChevronRight,
  SplitSquareVertical,
  Plus,
  Compass,
  ArrowRight,
  History,
} from 'lucide-react';
import {
  ClothingItem,
  SavedOutfit,
  UserProfilePhoto,
  VirtualTryonRecord,
  VirtualTryonGarmentRef,
  TryonGarmentRole,
  TryonProviderStatus,
  POPULAR_OCCASIONS,
} from '../../types/closet.js';
import { closetService } from '../../services/closetService.js';
import { generateWardrobeOutfitCombinations } from '../../services/recommendationEngine.js';

interface DressingRoomViewProps {
  userId: string;
  wardrobe: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onOpenProfilePhotoModal: () => void;
  onOpenBulkUploadModal: () => void;
  onOpenOutfitCreator: () => void;
  onRefreshData: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const DressingRoomView: React.FC<DressingRoomViewProps> = ({
  userId,
  wardrobe,
  savedOutfits,
  onOpenProfilePhotoModal,
  onOpenBulkUploadModal,
  onOpenOutfitCreator,
  onRefreshData,
  showToast,
}) => {
  const [profilePhotos, setProfilePhotos] = useState<UserProfilePhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<UserProfilePhoto | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<SavedOutfit | null>(null);
  const [autoCombinations, setAutoCombinations] = useState<ReturnType<typeof generateWardrobeOutfitCombinations>>([]);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('Casual Outings');
  const [isGeneratingTryon, setIsGeneratingTryon] = useState(false);
  const [currentTryonResult, setCurrentTryonResult] = useState<VirtualTryonRecord | null>(null);
  const [savedTryonRecords, setSavedTryonRecords] = useState<VirtualTryonRecord[]>([]);
  const [providerStatus, setProviderStatus] = useState<TryonProviderStatus | null>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50); // Split slider 0-100%
  const [viewMode, setViewMode] = useState<'split' | 'sideBySide' | 'stage'>('split');
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Load persona photos, saved tryons, and provider capabilities
  useEffect(() => {
    loadDressingRoomState();
  }, [userId]);

  const loadDressingRoomState = async () => {
    try {
      const [photos, tryons, status] = await Promise.all([
        closetService.getProfilePhotos(userId),
        closetService.getTryonRecords(userId),
        closetService.getTryonProviderStatus(),
      ]);

      setProfilePhotos(photos);
      const primary = photos.find((p) => p.is_primary) || photos[0] || null;
      setSelectedPhoto(primary);
      setSavedTryonRecords(tryons);
      setProviderStatus(status);
    } catch (err) {
      console.warn('Error initializing dressing room:', err);
    }
  };

  // Generate automated outfit combinations based on current occasion and wardrobe
  useEffect(() => {
    if (wardrobe.length >= 2) {
      const combos = generateWardrobeOutfitCombinations(wardrobe, 6, selectedOccasion);
      setAutoCombinations(combos);
      // If no outfit selected yet, select first combo as initial preview
      if (!selectedOutfit && combos.length > 0) {
        loadCombinationAsOutfit(combos[0]);
      }
    }
  }, [wardrobe, selectedOccasion]);

  const loadCombinationAsOutfit = (combo: ReturnType<typeof generateWardrobeOutfitCombinations>[0]) => {
    const proposedOutfit: SavedOutfit = {
      id: `combo_${Date.now()}`,
      user_id: userId,
      name: combo.title,
      description: combo.explanation,
      occasion: combo.occasion,
      style: combo.style,
      season: combo.season,
      is_favorite: false,
      items: combo.items.map((item, idx) => {
        const cat = item.category.toLowerCase();
        let slot: any = 'other';
        if (cat.includes('t-shirt') || cat.includes('shirt') || cat.includes('sweater')) slot = 'top';
        else if (cat.includes('trouser') || cat.includes('jean') || cat.includes('short')) slot = 'bottom';
        else if (cat.includes('shoe') || cat.includes('sneaker')) slot = 'shoes';
        else if (cat.includes('jacket') || cat.includes('coat')) slot = 'outerwear';
        else if (cat.includes('access') || cat.includes('belt') || cat.includes('bag')) slot = 'accessory';
        return { slot, clothing_item_id: item.id, item };
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSelectedOutfit(proposedOutfit);
    setCurrentTryonResult(null); // Reset tryon view when outfit changes
  };

  // Map outfit items to VTO garment references with explicit roles
  const activeGarments = useMemo<VirtualTryonGarmentRef[]>(() => {
    if (!selectedOutfit) return [];

    return selectedOutfit.items
      .map((ref) => {
        const item = ref.item || wardrobe.find((w) => w.id === ref.clothing_item_id);
        if (!item) return null;

        const cat = item.category.toLowerCase();
        let role: TryonGarmentRole = 'upper_body';
        let is_supported_on_body = true;

        if (cat.includes('trouser') || cat.includes('jean') || cat.includes('short')) {
          role = 'lower_body';
          is_supported_on_body = true;
        } else if (cat.includes('shoe') || cat.includes('sneaker') || cat.includes('boot')) {
          role = 'footwear';
          is_supported_on_body = false; // Footwear shown in accompanying dock
        } else if (cat.includes('jacket') || cat.includes('coat') || cat.includes('blazer')) {
          role = 'outerwear';
          is_supported_on_body = true;
        } else if (cat.includes('access') || cat.includes('bag') || cat.includes('belt') || cat.includes('watch')) {
          role = 'accessory';
          is_supported_on_body = false; // Accessories shown in accompanying dock
        }

        return {
          id: item.id,
          name: item.name,
          category: item.category,
          image_url: item.image_url,
          role,
          is_supported_on_body,
        };
      })
      .filter(Boolean) as VirtualTryonGarmentRef[];
  }, [selectedOutfit, wardrobe]);

  const onBodyPieces = activeGarments.filter((g) => g.is_supported_on_body);
  const accompanyingPieces = activeGarments.filter((g) => !g.is_supported_on_body);

  // Submit Virtual Try-on Simulation Request
  const handleGenerateTryon = async () => {
    if (!selectedPhoto) {
      showToast('error', 'Persona Required', 'Please upload a full-body photo of yourself first.');
      onOpenProfilePhotoModal();
      return;
    }

    if (activeGarments.length === 0) {
      showToast('error', 'No Outfit Selected', 'Please select an outfit to try on.');
      return;
    }

    setIsGeneratingTryon(true);
    try {
      const result = await closetService.requestVirtualTryon(
        selectedPhoto.image_url,
        activeGarments,
        selectedOutfit?.name || 'Look'
      );

      const newRecord: VirtualTryonRecord = {
        id: `tryon_${Date.now()}`,
        user_id: userId,
        outfit_id: selectedOutfit?.id,
        outfit_name: selectedOutfit?.name || 'Look',
        person_image_url: selectedPhoto.image_url,
        generated_image_url: result.generated_image_url || undefined,
        garments: activeGarments,
        status: result.success ? 'completed' : 'simulated_board',
        provider: result.provider || 'local-stage',
        is_favorite: false,
        notes: result.message,
        created_at: new Date().toISOString(),
      };

      setCurrentTryonResult(newRecord);
      await closetService.saveTryonRecord(newRecord);
      loadDressingRoomState();

      if (result.success) {
        showToast('success', 'Simulation Ready', 'Generated personal virtual try-on preview!');
      } else {
        showToast(
          'info',
          'Persona Outfit Stage Ready',
          result.message || 'Garments staged with your personal profile silhouette.'
        );
      }
    } catch (err: any) {
      showToast('error', 'Try-On Error', err?.message || 'Failed to simulate look.');
    } finally {
      setIsGeneratingTryon(false);
    }
  };

  const handleWearToday = async () => {
    if (!selectedOutfit) return;
    const today = new Date().toISOString().split('T')[0];
    await closetService.scheduleOutfit(userId, today, selectedOutfit.id, 'Worn from Dressing Room');
    showToast('success', 'Scheduled', `Scheduled "${selectedOutfit.name}" for today!`);
    onRefreshData();
  };

  const handleSaveToOutfits = async () => {
    if (!selectedOutfit) return;
    if (savedOutfits.some((o) => o.name === selectedOutfit.name)) {
      showToast('info', 'Already Saved', 'This look is already in your Outfits collection.');
      return;
    }

    await closetService.createOutfit({
      user_id: userId,
      name: selectedOutfit.name,
      description: selectedOutfit.description,
      occasion: selectedOutfit.occasion,
      style: selectedOutfit.style,
      season: selectedOutfit.season,
      is_favorite: true,
      items: selectedOutfit.items.map((i) => ({
        slot: i.slot,
        clothing_item_id: i.clothing_item_id,
      })),
    });
    showToast('success', 'Outfit Saved', `Saved "${selectedOutfit.name}" to your closet looks!`);
    onRefreshData();
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-white rounded-3xl p-6 border border-[#E7E2D9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1E392A]">
            <Sparkles className="w-4 h-4 text-[#C2A674]" />
            <span>Haute Couture AI Simulation Studio</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#1C1917] mt-1">
            Virtual Dressing Room
          </h1>
          <p className="text-xs text-[#78716C] mt-1 max-w-xl">
            See yourself wearing real garments from your closet. Assemble looks, review on-body simulations, and compare styling options side-by-side.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenBulkUploadModal}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#D6CEBF] bg-[#FAF7F2] text-xs font-medium text-[#1C1917] hover:border-[#1E392A] transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[#1E392A]" />
            <span>Upload Clothes in Bulk</span>
          </button>
          <button
            onClick={onOpenProfilePhotoModal}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1E392A] text-white text-xs font-medium hover:bg-[#162A1F] transition-all shadow-xs"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{profilePhotos.length === 0 ? 'Upload My Full-Body Photo' : 'Manage Persona Photo'}</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Personal Persona Profile (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-[#E7E2D9] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1917]">
                My Persona
              </span>
              <button
                onClick={onOpenProfilePhotoModal}
                className="text-[11px] font-medium text-[#1E392A] hover:underline"
              >
                Change
              </button>
            </div>

            {selectedPhoto ? (
              <div className="relative aspect-3/4 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 group shadow-xs">
                <img
                  src={selectedPhoto.image_url}
                  alt="Persona"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 text-white">
                  <p className="text-xs font-semibold truncate">{selectedPhoto.label || 'Primary Persona'}</p>
                  <p className="text-[10px] text-stone-300">Head-to-toe full body reference</p>
                </div>
              </div>
            ) : (
              <div
                onClick={onOpenProfilePhotoModal}
                className="aspect-3/4 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 hover:bg-stone-100/70 cursor-pointer flex flex-col items-center justify-center p-4 text-center transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#1E392A]/10 text-[#1E392A] flex items-center justify-center mb-2">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-[#1C1917]">Upload Full-Body Photo</p>
                <p className="text-[10px] text-[#78716C] mt-1 leading-tight">
                  Required to generate virtual try-on previews wearing your clothes.
                </p>
              </div>
            )}

            {/* Persona Selector Pill Strip */}
            {profilePhotos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {profilePhotos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPhoto(p)}
                    className={`w-12 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      selectedPhoto?.id === p.id ? 'border-[#1E392A] scale-105 shadow-xs' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={p.image_url} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Accompanying Footwear & Accessories Dock */}
          <div className="bg-white rounded-3xl p-5 border border-[#E7E2D9] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1917]">
                Footwear & Accessories
              </span>
              <span className="text-[10px] text-[#78716C] bg-stone-100 px-2 py-0.5 rounded-full">
                Accompanying Pieces
              </span>
            </div>
            <p className="text-[11px] text-[#78716C] leading-snug">
              Jewelry, watches, belts, and footwear are curated alongside your outfit to preserve their intricate textures and design integrity.
            </p>

            {accompanyingPieces.length === 0 ? (
              <div className="p-4 border border-dashed border-stone-200 rounded-xl text-center text-xs text-[#78716C]">
                No footwear or accessories in this combination yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {accompanyingPieces.map((piece) => (
                  <div
                    key={piece.id}
                    className="p-2 bg-[#FAF7F2] rounded-xl border border-stone-200 flex items-center gap-2"
                  >
                    <img
                      src={piece.image_url}
                      alt={piece.name}
                      className="w-10 h-10 rounded-lg object-cover bg-white shrink-0 border border-stone-200"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-[#1C1917] truncate">{piece.name}</p>
                      <p className="text-[9px] text-[#78716C] capitalize">{piece.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Column: The Virtual Try-On Canvas Stage (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-[#E7E2D9] shadow-xs flex flex-col justify-between min-h-[580px]">
            {/* Top Stage Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                  {selectedOutfit?.name || 'Curated Outfit Stage'}
                </h3>
                <p className="text-[11px] text-[#78716C]">
                  {selectedOutfit?.occasion || selectedOccasion} • {selectedOutfit?.style || 'Editorial'}
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-stone-100 rounded-full p-1 text-xs">
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1 rounded-full font-medium transition-all ${
                    viewMode === 'split' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#78716C]'
                  }`}
                >
                  Split Slider
                </button>
                <button
                  onClick={() => setViewMode('sideBySide')}
                  className={`px-3 py-1 rounded-full font-medium transition-all ${
                    viewMode === 'sideBySide' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#78716C]'
                  }`}
                >
                  Side-by-Side
                </button>
              </div>
            </div>

            {/* Stage Canvas Display */}
            <div className="flex-1 my-4 flex items-center justify-center">
              {!selectedPhoto ? (
                <div className="text-center p-8 max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-[#1E392A]/10 text-[#1E392A] flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-[#1C1917]">No Persona Photo</h4>
                  <p className="text-xs text-[#78716C] mt-1 mb-4">
                    Upload your full-body picture to preview outfits mapped directly against your silhouette.
                  </p>
                  <button
                    onClick={onOpenProfilePhotoModal}
                    className="px-6 py-2 rounded-full bg-[#1E392A] text-white text-xs font-medium hover:bg-[#162A1F] transition-all"
                  >
                    Upload Photo
                  </button>
                </div>
              ) : viewMode === 'split' ? (
                /* Interactive Split Comparison Slider */
                <div className="relative w-full max-w-md aspect-3/4 rounded-2xl overflow-hidden border border-stone-300 bg-stone-100 select-none shadow-md">
                  {/* Layer 1: Base Persona Photo (Right / Under) */}
                  <img
                    src={selectedPhoto.image_url}
                    alt="Persona Base"
                    className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
                  />
                  <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 text-white text-[10px] font-mono rounded-md backdrop-blur-xs">
                    Original Persona
                  </span>

                  {/* Layer 2: Generated Simulation or Outfit Board (Left / Top clipped) */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  >
                    {currentTryonResult?.generated_image_url ? (
                      <img
                        src={currentTryonResult.generated_image_url}
                        alt="Try-on simulation"
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      /* Flatlay Persona Overlay Board */
                      <div className="w-full h-full bg-[#FAF7F2]/90 backdrop-blur-xs p-4 flex flex-col justify-between">
                        <div className="text-center pt-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#1E392A] text-white text-[10px] font-medium tracking-wider uppercase">
                            Garments Stage
                          </span>
                        </div>
                        <div className="space-y-3 my-auto max-w-[220px] mx-auto">
                          {onBodyPieces.map((piece) => (
                            <div
                              key={piece.id}
                              className="bg-white p-2 rounded-xl shadow-xs border border-stone-200 flex items-center gap-3"
                            >
                              <img
                                src={piece.image_url}
                                alt={piece.name}
                                className="w-12 h-12 rounded-lg object-cover bg-stone-100"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#1C1917] truncate">{piece.name}</p>
                                <p className="text-[10px] text-[#78716C] capitalize">{piece.category}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-center text-[10px] text-[#78716C] pb-2">
                          Real clothing photographed from your closet
                        </div>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-[#1E392A] text-white text-[10px] font-semibold rounded-md shadow-xs">
                      AI Simulation (Preview)
                    </span>
                  </div>

                  {/* Split Divider Line and Draggable Handle */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] cursor-ew-resize flex items-center justify-center"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="w-7 h-7 rounded-full bg-white text-[#1E392A] border border-stone-300 shadow-lg flex items-center justify-center">
                      <SplitSquareVertical className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Range input controller */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
                  />
                </div>
              ) : (
                /* Side-by-Side Dual View */
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="space-y-1 text-center">
                    <span className="text-[11px] font-semibold text-[#78716C]">Your Persona</span>
                    <div className="aspect-3/4 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs">
                      <img
                        src={selectedPhoto.image_url}
                        alt="Persona"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-center">
                    <span className="text-[11px] font-semibold text-[#1E392A]">
                      {currentTryonResult?.generated_image_url ? 'AI Simulation' : 'Selected Garments'}
                    </span>
                    <div className="aspect-3/4 rounded-2xl overflow-hidden border border-stone-200 bg-[#FAF7F2] shadow-xs p-3 flex flex-col justify-around">
                      {currentTryonResult?.generated_image_url ? (
                        <img
                          src={currentTryonResult.generated_image_url}
                          alt="Simulation"
                          className="w-full h-full object-cover object-top rounded-xl"
                        />
                      ) : (
                        onBodyPieces.map((piece) => (
                          <div
                            key={piece.id}
                            className="bg-white p-2 rounded-xl border border-stone-200 flex items-center gap-2"
                          >
                            <img
                              src={piece.image_url}
                              alt={piece.name}
                              className="w-10 h-10 rounded-lg object-cover bg-stone-100"
                            />
                            <div className="min-w-0 text-left">
                              <p className="text-[11px] font-semibold text-[#1C1917] truncate">{piece.name}</p>
                              <p className="text-[9px] text-[#78716C] capitalize">{piece.category}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Provider Transparency Status Card */}
            <div className="bg-[#FAF7F2] rounded-2xl p-3 border border-[#E7E2D9] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1C1917] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Computer Vision & Outfit Engine Active
                </span>
                <span className="text-[10px] text-[#78716C] font-mono">
                  {providerStatus?.configured ? 'VTO Cloud Connected' : 'Local Persona Mode'}
                </span>
              </div>
              <p className="text-[11px] text-[#57534E]">
                {providerStatus?.message ||
                  'Your actual clothes are mapped onto your personal silhouette. AI simulation previews are illustrative fashion styling tools.'}
              </p>
            </div>

            {/* Bottom Action Bar */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveToOutfits}
                  className="px-4 py-2 rounded-full border border-stone-300 text-xs font-medium text-[#1C1917] hover:border-[#1E392A] transition-colors flex items-center gap-1.5"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-600" />
                  <span>Favorite Look</span>
                </button>
                <button
                  onClick={handleWearToday}
                  className="px-4 py-2 rounded-full border border-stone-300 text-xs font-medium text-[#1C1917] hover:border-[#1E392A] transition-colors flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#1E392A]" />
                  <span>Wear Today</span>
                </button>
              </div>

              <button
                disabled={isGeneratingTryon || !selectedPhoto}
                onClick={handleGenerateTryon}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1E392A] text-white text-xs font-semibold hover:bg-[#162A1F] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#1E392A]/10"
              >
                {isGeneratingTryon ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Simulating Try-On...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#C2A674]" />
                    <span>Generate Virtual Try-On</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Outfits & Automated Combinations (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-[#E7E2D9] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1917]">
                Curated Outfits
              </span>
              <button
                onClick={onOpenOutfitCreator}
                className="text-[11px] font-medium text-[#1E392A] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Custom Flatlay</span>
              </button>
            </div>

            {/* Occasion Filter Dropdown */}
            <div>
              <label className="text-[10px] font-semibold text-[#78716C] uppercase">
                Occasion Proposal
              </label>
              <select
                value={selectedOccasion}
                onChange={(e) => setSelectedOccasion(e.target.value)}
                className="w-full mt-1 text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-[#1C1917] focus:outline-none focus:border-[#1E392A]"
              >
                {POPULAR_OCCASIONS.map((occ) => (
                  <option key={occ} value={occ}>
                    {occ}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Combinations List */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wider">
                Automated Combinations ({autoCombinations.length})
              </span>

              {autoCombinations.length === 0 ? (
                <div className="p-4 border border-dashed border-stone-200 rounded-xl text-center text-xs text-[#78716C]">
                  Add more tops and bottoms to your wardrobe to generate combinations.
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {autoCombinations.map((combo, idx) => (
                    <div
                      key={idx}
                      onClick={() => loadCombinationAsOutfit(combo)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        selectedOutfit?.name === combo.title
                          ? 'border-[#1E392A] bg-[#1E392A]/5 ring-1 ring-[#1E392A]'
                          : 'border-stone-200 hover:border-stone-400 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-[#1C1917] truncate">{combo.title}</p>
                        <span className="text-[10px] font-mono font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {combo.compatibilityScore}% match
                        </span>
                      </div>

                      {/* Small garment thumbnails strip */}
                      <div className="flex gap-1.5">
                        {combo.items.map((item) => (
                          <img
                            key={item.id}
                            src={item.image_url}
                            alt={item.name}
                            title={item.name}
                            className="w-8 h-8 rounded-lg object-cover bg-stone-100 border border-stone-200"
                          />
                        ))}
                      </div>

                      <p className="text-[10px] text-[#78716C] mt-2 line-clamp-1 italic">
                        {combo.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Outfits Quick Switcher */}
            {savedOutfits.length > 0 && (
              <div className="pt-3 border-t border-stone-100">
                <span className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wider mb-2 block">
                  My Saved Looks ({savedOutfits.length})
                </span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {savedOutfits.map((outfit) => (
                    <button
                      key={outfit.id}
                      onClick={() => {
                        setSelectedOutfit(outfit);
                        setCurrentTryonResult(null);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        selectedOutfit?.id === outfit.id
                          ? 'bg-[#1E392A] text-white font-medium'
                          : 'bg-stone-50 text-[#1C1917] hover:bg-stone-100'
                      }`}
                    >
                      <span className="truncate">{outfit.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
