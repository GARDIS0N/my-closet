import React, { useState } from 'react';
import {
  User,
  Database,
  Cloud,
  Download,
  Trash2,
  Sparkles,
  LogOut,
  Copy,
  Check,
  Code2,
  Palette,
  Briefcase,
  Layers,
  Save,
} from 'lucide-react';
import { useAuth } from '../../services/authContext.js';
import {
  STYLE_OPTIONS,
  POPULAR_OCCASIONS,
  COLOR_PALETTE,
  ClothingItem,
  SavedOutfit,
  EnhancerProviderStatus,
} from '../../types/closet.js';
import { closetService } from '../../services/closetService.js';
import { ConfirmationModal } from '../common/ConfirmationModal.js';
import { showToast } from '../common/Toast.js';
import { Wand2, ShieldCheck, Cpu } from 'lucide-react';

interface ProfileViewProps {
  wardrobe: ClothingItem[];
  outfits: SavedOutfit[];
  onRefresh: () => void;
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  wardrobe,
  outfits,
  onRefresh,
  onOpenAuth,
}) => {
  const { user, isLocalMode, updateProfile, logout } = useAuth();

  const [name, setName] = useState(user?.full_name || '');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    user?.preferred_style || ['Minimalist', 'Casual']
  );
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(
    user?.occasions || ['Work', 'Casual Outings']
  );
  const [budget, setBudget] = useState(user?.budget_preference || 'Balanced Quality');
  const [autoEnhance, setAutoEnhance] = useState<boolean>(user?.auto_enhance_photos ?? true);
  const [enhancerStatus, setEnhancerStatus] = useState<EnhancerProviderStatus | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    closetService.getEnhancerStatus().then(setEnhancerStatus).catch(() => {});
  }, []);

  const toggleItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateProfile({
      full_name: name.trim(),
      preferred_style: selectedStyles,
      occasions: selectedOccasions,
      budget_preference: budget,
      auto_enhance_photos: autoEnhance,
    });
    setSaving(false);
    showToast('success', 'Profile Updated', 'Your preferences have been saved.');
  };

  const handleExportData = () => {
    const data = {
      user,
      wardrobe,
      outfits,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mycloset-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Backup Exported', 'Downloaded wardrobe backup JSON.');
  };

  const handleResetWardrobe = async () => {
    if (!user) return;
    await closetService.clearUserWardrobe(user.id);
    showToast('info', 'Wardrobe Cleared', 'All garments and outfits removed.');
    setShowResetConfirm(false);
    onRefresh();
  };

  const SQL_MIGRATION_SNIPPET = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  brand TEXT,
  size TEXT,
  season TEXT[] NOT NULL DEFAULT '{"All-Season"}',
  occasion TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'clean',
  image_url TEXT NOT NULL,
  notes TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  times_worn INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own clothes" ON public.clothing_items FOR ALL USING (auth.uid() = user_id);`;

  const copySql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    showToast('success', 'Copied SQL', 'Paste into Supabase SQL editor to create cloud tables.');
  };

  return (
    <div className="space-y-8 pb-20 max-w-4xl">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-widest text-[#78716C] font-bold">
          Account & Customization
        </span>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#1C1917]">
          Wardrobe Settings
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Customize your styling preferences, manage cloud/local storage, and manage your wardrobe archive.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E2D8] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1E392A] text-white flex items-center justify-center font-bold text-2xl shadow-md">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="font-editorial text-xl font-bold text-[#1C1917]">
              {user?.full_name || 'Stylist Curator'}
            </h3>
            <p className="text-xs text-stone-600">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  isLocalMode
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isLocalMode ? <Database className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                <span>{isLocalMode ? 'Local Persistent (IndexedDB)' : 'Supabase Cloud Synchronized'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isLocalMode ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex-1 sm:flex-initial px-4 py-2 bg-white border border-[#E8E2D8] hover:border-stone-400 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Sign In to Cloud
            </button>
          ) : (
            <button
              type="button"
              onClick={() => logout()}
              className="flex-1 sm:flex-initial px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Styling Preferences Form */}
      <form onSubmit={handleSavePreferences} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D8] shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-[#F3EFEA] pb-3">
          <h3 className="font-editorial text-xl font-bold text-[#1C1917]">
            Styling Profile
          </h3>
          <span className="text-xs text-stone-500">Affects AI suggestions</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Full Name / Alias
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs font-semibold text-stone-800"
          />
        </div>

        {/* Preferred Styles */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-2">
            Aesthetic Preferences
          </label>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((st) => {
              const isSelected = selectedStyles.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleItem(selectedStyles, st, setSelectedStyles)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#1E392A] text-white border-[#1E392A]'
                      : 'bg-[#FAF7F2] text-stone-700 border-[#E8E2D8]'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Frequent Occasions */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-2">
            Frequent Occasions
          </label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_OCCASIONS.map((occ) => {
              const isSelected = selectedOccasions.includes(occ);
              return (
                <button
                  key={occ}
                  type="button"
                  onClick={() => toggleItem(selectedOccasions, occ, setSelectedOccasions)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#1E392A] text-white border-[#1E392A]'
                      : 'bg-[#FAF7F2] text-stone-700 border-[#E8E2D8]'
                  }`}
                >
                  {occ}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget Preference */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Shopping Focus / Budget Preference
          </label>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-xs font-medium text-stone-800"
          >
            <option value="Thrifting & Vintage">Thrifting & Vintage / Circular Fashion</option>
            <option value="Smart Essentials">Accessible & Smart High-Street</option>
            <option value="Balanced Quality">Balanced Contemporary & Quality Staples</option>
            <option value="Designer Investment">Luxury & Investment Designer Pieces</option>
          </select>
        </div>

        {/* Photo Cleanup Automation Toggle */}
        <div className="pt-2 border-t border-[#F3EFEA]">
          <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D8]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#1E392A]" />
                <h4 className="text-xs font-bold text-stone-900">
                  Automatic Studio Photo Cleanup
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-[#1E392A]/10 text-[#1E392A] text-[10px] font-bold">
                  AI Enhanced
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed max-w-xl">
                Automatically isolate garments, remove background clutter, apply soft studio lighting, and center items with physical grounding shadows on upload. Original photos are permanently preserved and restorable.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={autoEnhance}
                onChange={(e) => setAutoEnhance(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E392A]"></div>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>

      {/* Data Management & Supabase Migration Tools */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D8] shadow-xs space-y-6">
        <div className="border-b border-[#F3EFEA] pb-3">
          <h3 className="font-editorial text-xl font-bold text-[#1C1917]">
            Database & Wardrobe Management
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage your persistence layer, backups, AI image processing, and cloud migrations.
          </p>
        </div>

        {/* Active AI Photo Enhancer Engine Status Card */}
        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D8] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#1E392A]" />
              <h4 className="text-xs font-bold text-stone-900">
                AI Studio Photo Processing Engine
              </h4>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
              <ShieldCheck className="w-3 h-3 text-emerald-700" />
              {enhancerStatus ? enhancerStatus.activeProvider : 'READY'}
            </span>
          </div>

          <p className="text-[11px] text-stone-600 leading-relaxed">
            Multi-tier processing pipeline with automatic fallback: Remove.bg API &rarr; Photoroom &rarr; Clipdrop &rarr; High-performance Studio CV Engine (Sharp / Canvas).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className="p-2 bg-white rounded-xl border border-stone-200">
              <span className="text-stone-400 block text-[10px]">Tops & Bottoms</span>
              <span className="font-semibold text-stone-800">Edge-Preserving</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-stone-200">
              <span className="text-stone-400 block text-[10px]">Shoes & Boots</span>
              <span className="font-semibold text-stone-800">Sole & Lace Guard</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-stone-200">
              <span className="text-stone-400 block text-[10px]">Accessories & Watches</span>
              <span className="font-semibold text-stone-800">Reflective Contour</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-stone-200">
              <span className="text-stone-400 block text-[10px]">Shadow Physics</span>
              <span className="font-semibold text-stone-800">Elliptical Grounding</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D8] space-y-2">
            <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-[#1E392A]" />
              <span>Export Wardrobe Backup</span>
            </h4>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Download a complete JSON export of all your garments, saved looks, and wear history.
            </p>
            <button
              type="button"
              onClick={handleExportData}
              className="mt-2 px-3 py-2 bg-white border border-[#E8E2D8] hover:border-stone-400 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
            >
              Export JSON
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D8] space-y-2">
            <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-[#1E392A]" />
              <span>Supabase Cloud Schema</span>
            </h4>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              View and copy the PostgreSQL table migration script to run directly in your Supabase SQL editor.
            </p>
            <button
              type="button"
              onClick={copySql}
              className="mt-2 px-3 py-2 bg-[#1E392A] text-white hover:bg-[#15291E] rounded-xl text-xs font-semibold cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied SQL!' : 'Copy Migration SQL'}</span>
            </button>
          </div>
        </div>

        {/* Danger zone actions */}
        <div className="pt-4 border-t border-[#F3EFEA] flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Entire Wardrobe</span>
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showResetConfirm}
        title="Clear Entire Wardrobe?"
        message="This will remove all your clothing items, saved outfits, and calendar schedules. This cannot be undone."
        confirmLabel="Yes, Clear Everything"
        isDestructive={true}
        onConfirm={handleResetWardrobe}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
