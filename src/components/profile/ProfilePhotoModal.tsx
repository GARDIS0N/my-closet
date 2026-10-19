import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  User,
  ShieldCheck,
  Check,
  AlertCircle,
  Trash2,
  Camera,
  Star,
  Info,
} from 'lucide-react';
import { UserProfilePhoto } from '../../types/closet.js';
import { compressImage } from '../../services/storageAdapter.js';
import { closetService } from '../../services/closetService.js';

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  existingPhotos: UserProfilePhoto[];
  onPhotosUpdated: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  isOpen,
  onClose,
  userId,
  existingPhotos,
  onPhotosUpdated,
  showToast,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [hasConfirmedConsent, setHasConfirmedConsent] = useState(false);
  const [photoLabel, setPhotoLabel] = useState('Full-Body Persona');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!hasConfirmedConsent) {
      showToast('error', 'Consent Required', 'Please confirm the permission checklist before uploading.');
      return;
    }

    setIsUploading(true);
    try {
      const compressed = await compressImage(file, 1200, 0.88);
      const isFirst = existingPhotos.length === 0;

      await closetService.saveProfilePhoto(userId, compressed, isFirst, photoLabel);
      showToast('success', 'Persona Uploaded', 'Your full-body photo was securely saved for the Virtual Dressing Room.');
      onPhotosUpdated();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      showToast('error', 'Upload Failed', err?.message || 'Could not process photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await closetService.deleteProfilePhoto(id);
      showToast('info', 'Photo Removed', 'Persona photo deleted.');
      onPhotosUpdated();
    } catch (err: any) {
      showToast('error', 'Error', err?.message);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await closetService.setPrimaryProfilePhoto(userId, id);
      showToast('success', 'Active Persona', 'Primary try-on photo updated.');
      onPhotosUpdated();
    } catch (err: any) {
      showToast('error', 'Error', err?.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#E7E2D9] max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E2D9] bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-full bg-[#1E392A]/10 text-[#1E392A]">
              <User className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#1C1917]">
                Personal Try-On Style Profile
              </h2>
              <p className="text-xs text-[#78716C]">
                Private full-body persona used exclusively for your Virtual Dressing Room.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#78716C] hover:text-[#1C1917] rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Best Practices & Guidelines */}
          <div className="bg-white rounded-2xl p-4 border border-[#E7E2D9] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1E392A]">
              <Info className="w-4 h-4" />
              <span>Recommended Photo Guidelines</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#57534E]">
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-stone-200">
                <p className="font-medium text-[#1C1917]">1. Natural Light</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Even front lighting, no heavy back shadows.</p>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-stone-200">
                <p className="font-medium text-[#1C1917]">2. Full-Body</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Head-to-toe framed, straight camera angle.</p>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-stone-200">
                <p className="font-medium text-[#1C1917]">3. Neutral Clothes</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Well-fitting, simple basics (plain tee & jeans).</p>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-stone-200">
                <p className="font-medium text-[#1C1917]">4. Clean Backdrop</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Plain wall or uncluttered room background.</p>
              </div>
            </div>
          </div>

          {/* Privacy & Consent Checklist */}
          <div className="bg-[#1E392A]/5 border border-[#1E392A]/20 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1E392A]">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy & Image Use Confirmation</span>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Your persona photo is stored in private encrypted local storage and is never made public or used for training. It is strictly utilized to generate your personalized outfit simulations.
            </p>
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasConfirmedConsent}
                onChange={(e) => setHasConfirmedConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-[#1E392A] focus:ring-[#1E392A]"
              />
              <span className="text-xs font-medium text-[#1C1917]">
                I confirm that I have permission to use this photograph for personal virtual styling simulations.
              </span>
            </label>
          </div>

          {/* Upload Trigger */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={photoLabel}
                onChange={(e) => setPhotoLabel(e.target.value)}
                placeholder="Persona label (e.g. Standing Neutral, Summer Hair)"
                className="flex-1 text-xs bg-white border border-stone-200 rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:border-[#1E392A]"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!hasConfirmedConsent || isUploading}
                onChange={handleFileSelect}
              />
              <button
                type="button"
                disabled={!hasConfirmedConsent || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1E392A] text-white text-xs font-medium hover:bg-[#162A1F] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
              >
                <Camera className="w-4 h-4" />
                <span>{isUploading ? 'Compressing...' : 'Upload Full-Body Photo'}</span>
              </button>
            </div>
            {!hasConfirmedConsent && (
              <p className="text-[11px] text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Check the confirmation box above to enable photo upload.
              </p>
            )}
          </div>

          {/* Existing Persona Photos Gallery */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Your Persona Photos ({existingPhotos.length})
            </h3>

            {existingPhotos.length === 0 ? (
              <div className="border border-dashed border-stone-300 rounded-2xl p-8 text-center text-xs text-[#78716C] bg-white/40">
                No persona photos uploaded yet. Upload a photo above to step into the Virtual Dressing Room.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {existingPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative rounded-2xl overflow-hidden border transition-all bg-white shadow-xs ${
                      photo.is_primary
                        ? 'border-[#1E392A] ring-2 ring-[#1E392A]/20'
                        : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <div className="aspect-3/4 w-full bg-stone-100 overflow-hidden">
                      <img
                        src={photo.image_url}
                        alt="Persona"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>

                    {/* Primary Badge */}
                    {photo.is_primary ? (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#1E392A] text-white text-[10px] rounded-full font-medium shadow-xs flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        Active Persona
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetPrimary(photo.id)}
                        className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 hover:bg-white text-[#1C1917] text-[10px] rounded-full font-medium shadow-xs transition-colors"
                      >
                        Set Active
                      </button>
                    )}

                    {/* Delete Action */}
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-rose-50 text-stone-600 hover:text-rose-600 rounded-full shadow-xs transition-colors"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="p-2 bg-white text-[11px] text-[#1C1917] truncate font-medium border-t border-stone-100">
                      {photo.label || 'Persona Look'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E7E2D9] bg-white/70 backdrop-blur-sm flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-[#1E392A] text-white text-xs font-medium hover:bg-[#162A1F] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
