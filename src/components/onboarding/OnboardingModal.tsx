import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Palette,
  Briefcase,
  Layers,
  Shirt,
} from 'lucide-react';
import { useAuth } from '../../services/authContext.js';
import {
  STYLE_OPTIONS,
  POPULAR_OCCASIONS,
  COLOR_PALETTE,
  UserProfile,
} from '../../types/closet.js';
import { showToast } from '../common/Toast.js';

interface OnboardingModalProps {
  isOpen: boolean;
  onFinish: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onFinish }) => {
  const { user, completeOnboarding } = useAuth();
  const [step, setStep] = useState(1);

  // Form State
  const [fullName, setFullName] = useState(user?.full_name && user.full_name !== 'Guest Curator' ? user.full_name : '');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(user?.preferred_style || []);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(user?.occasions || []);
  const [selectedColors, setSelectedColors] = useState<string[]>(user?.preferred_colors || []);
  const [budget, setBudget] = useState(user?.budget_preference || 'Balanced Quality');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const toggleItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await completeOnboarding({
        full_name: fullName.trim() || user.full_name || 'MyCloset Curator',
        preferred_style: selectedStyles,
        occasions: selectedOccasions,
        preferred_colors: selectedColors,
        budget_preference: budget,
      });

      showToast('success', 'Profile Created', 'Welcome to your private digital wardrobe!');
      onFinish();
    } catch (err) {
      console.error(err);
      showToast('error', 'Onboarding', 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    await completeOnboarding({});
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-6 animate-in zoom-in-95">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-[#1E392A]'
                    : s < step
                    ? 'w-4 bg-[#2D5A43]'
                    : 'w-4 bg-stone-200'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        {/* Step 1: Your Name */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1E392A] text-white flex items-center justify-center shadow-md">
              <Shirt className="w-6 h-6 text-[#C2A674]" />
            </div>
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[#1C1917]">
                Welcome to MyCloset
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Let's customize your wardrobe experience in less than a minute. What should we call you?
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Your Preferred Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jordan Smith"
                className="w-full px-4 py-3 bg-white border border-[#E8E2D8] rounded-2xl text-sm font-medium focus:outline-none focus:border-[#1E392A]"
              />
            </div>
          </div>
        )}

        {/* Step 2: Preferred Style */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF3EE] text-[#1E392A] flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[#1C1917]">
                Define Your Aesthetic
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Select styles you naturally gravitate toward. You can adjust this anytime.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {STYLE_OPTIONS.map((style) => {
                const selected = selectedStyles.includes(style);
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleItem(selectedStyles, style, setSelectedStyles)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      selected
                        ? 'bg-[#1E392A] text-white border-[#1E392A] shadow-xs'
                        : 'bg-white text-stone-700 border-[#E8E2D8] hover:border-stone-400'
                    }`}
                  >
                    <span>{style}</span>
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Frequent Occasions */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF3EE] text-[#1E392A] flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[#1C1917]">
                Your Daily Occasions
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Where do you spend most of your time? We'll prioritize recommendations for these settings.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {POPULAR_OCCASIONS.map((occ) => {
                const selected = selectedOccasions.includes(occ);
                return (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => toggleItem(selectedOccasions, occ, setSelectedOccasions)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      selected
                        ? 'bg-[#1E392A] text-white border-[#1E392A] shadow-xs'
                        : 'bg-white text-stone-700 border-[#E8E2D8] hover:border-stone-400'
                    }`}
                  >
                    <span>{occ}</span>
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Color Palette & Budget */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF3EE] text-[#1E392A] flex items-center justify-center">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[#1C1917]">
                Color Palette & Preferences
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Pick hues you love wearing and your preferred wardrobe investment focus.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {COLOR_PALETTE.slice(0, 9).map((color) => {
                const selected = selectedColors.includes(color.name);
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => toggleItem(selectedColors, color.name, setSelectedColors)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      selected ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="truncate">{color.name.split('/')[0]}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Budget / Shopping Preference (Optional)
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-xl text-xs font-medium text-stone-700"
              >
                <option value="Thrifting & Vintage">Thrifting & Vintage / Circular Fashion</option>
                <option value="Smart Essentials">Accessible & Smart High-Street</option>
                <option value="Balanced Quality">Balanced Contemporary & Quality Staples</option>
                <option value="Designer Investment">Luxury & Investment Designer Pieces</option>
              </select>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E8E2D8]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-stone-600 hover:text-stone-900 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleComplete}
              className="px-6 py-2.5 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-60"
            >
              <span>{saving ? 'Preparing Closet...' : 'Enter My Closet'}</span>
              <Sparkles className="w-3.5 h-3.5 text-[#C2A674]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
