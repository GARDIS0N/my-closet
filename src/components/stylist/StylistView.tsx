import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CloudSun,
  Layers,
  Check,
  Calendar,
  Save,
  Shirt,
  Sliders,
  ChevronRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  ClothingItem,
  SavedOutfit,
  RecommendationCriteria,
  OutfitRecommendation,
  WeatherCondition,
  FormalityLevel,
  POPULAR_OCCASIONS,
  STYLE_OPTIONS,
  COLOR_PALETTE,
} from '../../types/closet.js';
import { generateRecommendations } from '../../services/recommendationEngine.js';
import { closetService } from '../../services/closetService.js';
import { showToast } from '../common/Toast.js';

interface StylistViewProps {
  userId: string;
  wardrobe: ClothingItem[];
  onNavigateToCalendar: () => void;
  onRefresh: () => void;
}

export const StylistView: React.FC<StylistViewProps> = ({
  userId,
  wardrobe,
  onNavigateToCalendar,
  onRefresh,
}) => {
  // Recommendation criteria
  const [occasion, setOccasion] = useState<string>('Casual Outings');
  const [style, setStyle] = useState<string>('Minimalist');
  const [weather, setWeather] = useState<WeatherCondition>('Mild & Breezy');
  const [formality, setFormality] = useState<FormalityLevel>('Smart Casual');
  const [preferredColor, setPreferredColor] = useState<string>('');
  const [mustIncludeId, setMustIncludeId] = useState<string>('');
  const [avoidId, setAvoidId] = useState<string>('');

  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Auto-generate initial recommendations on view load
  useEffect(() => {
    if (wardrobe.length >= 2 && !hasGenerated) {
      handleGenerate();
    }
  }, [wardrobe]);

  const handleGenerate = async (forceAi = false) => {
    setIsGenerating(true);
    const criteria: RecommendationCriteria = {
      occasion,
      style,
      weather,
      formality,
      preferred_color: preferredColor || undefined,
      must_include_item_id: mustIncludeId || undefined,
      avoid_item_id: avoidId || undefined,
    };

    let aiRec: OutfitRecommendation | null = null;

    // Optional AI enhancement call if requested or available
    if (forceAi) {
      try {
        const response = await fetch('/api/closet/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wardrobe, criteria }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && !data.useFallback && data.recommendation) {
            aiRec = data.recommendation;
            showToast('success', 'Gemini AI Stylist', 'Generated haute editorial recommendation!');
          }
        }
      } catch {
        // Silent graceful fallback to local recommendation engine
      }
    }

    const localResults = generateRecommendations(wardrobe, criteria);
    const finalResults = aiRec ? [aiRec, ...localResults] : localResults;

    setRecommendations(finalResults);
    setIsGenerating(false);
    setHasGenerated(true);
  };

  const handleSaveToOutfits = async (rec: OutfitRecommendation) => {
    const slots = ['top', 'bottom', 'shoes', 'outerwear', 'accessory'] as const;
    const items = rec.items.map((item, idx) => ({
      slot: (idx === 0 ? 'top' : idx === 1 ? 'bottom' : idx === 2 ? 'shoes' : 'outerwear') as any,
      clothing_item_id: item.id,
      item,
    }));

    await closetService.createOutfit({
      user_id: userId,
      name: rec.title,
      description: `${rec.explanation} • ${rec.style_notes}`,
      occasion,
      style,
      season: weather.includes('Cold') ? 'Winter' : weather.includes('Warm') ? 'Summer' : 'Spring',
      is_favorite: true,
      items,
    });

    showToast('success', 'Outfit Saved', `Saved "${rec.title}" to your looks!`);
    onRefresh();
  };

  const handleWearToday = async (rec: OutfitRecommendation) => {
    const today = new Date().toISOString().split('T')[0];

    // Create outfit first if needed
    const items = rec.items.map((item, idx) => ({
      slot: (idx === 0 ? 'top' : idx === 1 ? 'bottom' : idx === 2 ? 'shoes' : 'outerwear') as any,
      clothing_item_id: item.id,
      item,
    }));

    const outfit = await closetService.createOutfit({
      user_id: userId,
      name: rec.title,
      description: rec.explanation,
      occasion,
      style,
      season: 'All-Season',
      is_favorite: false,
      items,
    });

    await closetService.scheduleOutfit(userId, today, outfit.id, 'Styled by AI Recommendations');
    showToast('success', 'Scheduled for Today', `Added "${rec.title}" to today's calendar!`);
    onRefresh();
  };

  const weatherOptions: { label: WeatherCondition; icon: string; desc: string }[] = [
    { label: 'Warm & Sunny', icon: '☀️', desc: 'Breathable, light tones' },
    { label: 'Mild & Breezy', icon: '⛅', desc: 'Effortless layers' },
    { label: 'Cool & Crisp', icon: '🍂', desc: 'Knitwear & structured trench' },
    { label: 'Cold & Rainy', icon: '🌧️', desc: 'Water-resistant, boots & wool' },
    { label: 'Freezing & Snow', icon: '❄️', desc: 'Heavy insulating outerwear' },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-[#EBF3EE] text-[#1E392A] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#C2A674]" />
          </div>
          <span className="text-xs uppercase tracking-widest text-[#78716C] font-bold">
            Intelligent Styling Engine
          </span>
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#1C1917]">
          AI Stylist & Recommendations
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl">
          Personalized combinations assembled exclusively from your clean wardrobe garments. Zero hallucinated items.
        </p>
      </div>

      {/* Styling Studio Input Panel */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8E2D8] shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-[#F3EFEA] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#1E392A]" />
            <h3 className="font-editorial text-lg font-bold text-stone-900">
              Styling Parameters
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            {wardrobe.filter((i) => i.status === 'clean').length} clean garments ready
          </span>
        </div>

        {/* Weather Selection */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-2">
            Current / Forecasted Weather
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {weatherOptions.map((opt) => {
              const isSelected = weather === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setWeather(opt.label)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1E392A] text-white border-[#1E392A] shadow-xs'
                      : 'bg-[#FAF7F2] text-stone-800 border-[#E8E2D8] hover:border-stone-400'
                  }`}
                >
                  <span className="text-lg block mb-1">{opt.icon}</span>
                  <p className="text-xs font-bold leading-tight">{opt.label}</p>
                  <p className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-stone-500'}`}>
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Occasion & Style Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Occasion
            </label>
            <select
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs font-semibold text-stone-800"
            >
              {POPULAR_OCCASIONS.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Target Style
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs font-semibold text-stone-800"
            >
              {STYLE_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Formality Level
            </label>
            <select
              value={formality}
              onChange={(e) => setFormality(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs font-semibold text-stone-800"
            >
              {(['Casual', 'Smart Casual', 'Business', 'Cocktail', 'Formal'] as FormalityLevel[]).map(
                (lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Must-Include and Avoid Garment Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Must Wear This Piece (Optional)
            </label>
            <select
              value={mustIncludeId}
              onChange={(e) => setMustIncludeId(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs text-stone-800"
            >
              <option value="">No specific piece required</option>
              {wardrobe.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.color})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Avoid This Piece (Optional)
            </label>
            <select
              value={avoidId}
              onChange={(e) => setAvoidId(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs text-stone-800"
            >
              <option value="">Do not exclude any item</option>
              {wardrobe.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.color})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            disabled={isGenerating || wardrobe.length < 2}
            onClick={() => handleGenerate(false)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-white border border-[#E8E2D8] hover:border-stone-400 text-stone-800 disabled:opacity-60 rounded-2xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#1E392A]" />
            <span>Generate Combinations</span>
          </button>

          <button
            type="button"
            disabled={isGenerating || wardrobe.length < 2}
            onClick={() => handleGenerate(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#1E392A] hover:bg-[#15291E] disabled:opacity-60 text-white rounded-2xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#C2A674]" />
            )}
            <span>Consult Gemini AI Stylist</span>
          </button>
        </div>
      </div>

      {/* Recommendations Results Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-editorial text-2xl font-bold text-[#1C1917]">
            Curated Proposals
          </h2>
          {recommendations.length > 0 && (
            <span className="text-xs font-semibold text-[#1E392A] bg-[#EBF3EE] px-3 py-1 rounded-full">
              {recommendations.length} tailored combinations
            </span>
          )}
        </div>

        {isGenerating ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-[#E8E2D8] space-y-4">
                <div className="w-full aspect-16/9 rounded-2xl skeleton-shimmer" />
                <div className="h-5 w-1/2 rounded-md skeleton-shimmer" />
                <div className="h-4 w-3/4 rounded-md skeleton-shimmer" />
              </div>
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-3xl border border-[#E8E2D8] overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                {/* Composite Clothing Items Preview */}
                <div className="p-4 bg-stone-50 border-b border-[#E8E2D8]">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {rec.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs group relative aspect-square"
                      >
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                          <p className="text-[9px] text-white font-medium truncate">
                            {item.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Editorial Breakdown */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-editorial text-xl font-bold text-[#1C1917]">
                        {rec.title}
                      </h3>
                      <span className="text-xs font-bold text-[#1E392A] bg-[#EBF3EE] px-2 py-0.5 rounded-full shrink-0">
                        {rec.confidence_score}% Match
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed">
                      {rec.explanation}
                    </p>

                    <div className="space-y-2 pt-1 text-xs">
                      <div className="flex items-start gap-2 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E8E2D8]">
                        <Info className="w-3.5 h-3.5 text-[#1E392A] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-stone-900 block text-[11px]">
                            Stylist Insight
                          </span>
                          <span className="text-stone-600 text-[11px] leading-relaxed">
                            {rec.style_notes}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-stone-50 rounded-xl border border-stone-200">
                          <span className="text-stone-500 font-medium block">Color Harmony</span>
                          <span className="font-semibold text-stone-800">{rec.color_harmony}</span>
                        </div>
                        <div className="p-2 bg-stone-50 rounded-xl border border-stone-200">
                          <span className="text-stone-500 font-medium block">Weather Comfort</span>
                          <span className="font-semibold text-stone-800">{rec.weather_suitability}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-[#F3EFEA]">
                    <button
                      type="button"
                      onClick={() => handleWearToday(rec)}
                      className="flex-1 py-2.5 px-3 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#C2A674]" />
                      <span>Wear Today</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveToOutfits(rec)}
                      className="flex-1 py-2.5 px-3 bg-white border border-[#E8E2D8] hover:border-stone-400 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5 text-[#1E392A]" />
                      <span>Save as Outfit</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E8E2D8] p-10 text-center max-w-md mx-auto space-y-3">
            <Shirt className="w-10 h-10 text-stone-400 mx-auto" />
            <h4 className="font-editorial text-lg font-bold text-stone-900">
              {wardrobe.length < 2 ? 'Add More Clothes to Generate Outfits' : 'No Clean Combinations Found'}
            </h4>
            <p className="text-xs text-stone-600">
              {wardrobe.length < 2
                ? 'Your wardrobe needs at least 2 items (like a shirt and trousers) to build complete looks.'
                : 'All matching tops or bottoms might be in the laundry. Mark items clean or relax filters.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
