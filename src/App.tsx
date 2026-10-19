import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './services/authContext.js';
import { NavTab, Sidebar } from './components/navigation/Sidebar.js';
import { BottomNav } from './components/navigation/BottomNav.js';
import { TopHeader } from './components/navigation/TopHeader.js';
import { DashboardView } from './components/dashboard/DashboardView.js';
import { ClosetView } from './components/closet/ClosetView.js';
import { OutfitsView } from './components/outfits/OutfitsView.js';
import { StylistView } from './components/stylist/StylistView.js';
import { CalendarView } from './components/calendar/CalendarView.js';
import { ProfileView } from './components/profile/ProfileView.js';
import { AddEditClothingModal } from './components/closet/AddEditClothingModal.js';
import { BulkUploadModal } from './components/closet/BulkUploadModal.js';
import { OutfitCreator } from './components/outfits/OutfitCreator.js';
import { DressingRoomView } from './components/tryon/DressingRoomView.js';
import { ProfilePhotoModal } from './components/profile/ProfilePhotoModal.js';
import { AuthModal } from './components/auth/AuthModal.js';
import { OnboardingModal } from './components/onboarding/OnboardingModal.js';
import { ToastContainer, showToast } from './components/common/Toast.js';
import { closetService } from './services/closetService.js';
import { ClothingItem, SavedOutfit, CalendarEntry, UserProfilePhoto } from './types/closet.js';

const ClosetAppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Global modals
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isOutfitCreatorOpen, setIsOutfitCreatorOpen] = useState(false);
  const [isProfilePhotoOpen, setIsProfilePhotoOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [profilePhotos, setProfilePhotos] = useState<UserProfilePhoto[]>([]);

  const loadProfilePhotos = useCallback(async () => {
    if (!user) return;
    const photos = await closetService.getProfilePhotos(user.id);
    setProfilePhotos(photos);
  }, [user]);

  useEffect(() => {
    loadProfilePhotos();
  }, [loadProfilePhotos]);

  // Fetch all wardrobe, outfit, and calendar data for current user
  const loadClosetData = useCallback(async () => {
    if (!user) {
      setWardrobe([]);
      setOutfits([]);
      setCalendarEntries([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    try {
      const [itemsData, outfitsData, calData] = await Promise.all([
        closetService.getItems(user.id),
        closetService.getOutfits(user.id),
        closetService.getCalendarEntries(user.id),
      ]);
      setWardrobe(itemsData);
      setOutfits(outfitsData);
      setCalendarEntries(calData);
    } catch (err) {
      console.error('Failed to load closet data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadClosetData();
  }, [loadClosetData]);

  // Check onboarding status
  useEffect(() => {
    if (user && !user.onboarding_completed) {
      setIsOnboardingOpen(true);
    } else {
      setIsOnboardingOpen(false);
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-stone-700">
        <div className="w-12 h-12 rounded-2xl bg-[#1E392A] text-white flex items-center justify-center shadow-lg animate-pulse mb-3">
          <span className="font-editorial text-2xl font-bold text-[#C2A674]">M</span>
        </div>
        <p className="font-editorial text-xl font-bold text-stone-900">MyCloset</p>
        <span className="text-xs text-stone-500 mt-1">Preparing your wardrobe...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col md:flex-row antialiased selection:bg-[#1E392A] selection:text-[#FAF7F2]">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddItem={() => setIsAddItemOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <TopHeader
          activeTab={activeTab}
          onOpenAddItem={() => setIsAddItemOpen(true)}
          onSelectTab={setActiveTab}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 md:py-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              user={user}
              wardrobe={wardrobe}
              outfits={outfits}
              calendarEntries={calendarEntries}
              isLoading={dataLoading}
              onNavigate={setActiveTab}
              onOpenAddItem={() => setIsAddItemOpen(true)}
              onOpenBulkUpload={() => setIsBulkUploadOpen(true)}
              onOpenOutfitCreator={() => setIsOutfitCreatorOpen(true)}
              onRefresh={loadClosetData}
            />
          )}

          {activeTab === 'closet' && (
            <ClosetView
              userId={user?.id || ''}
              items={wardrobe}
              isLoading={dataLoading}
              onRefresh={loadClosetData}
              onOpenAddItem={() => setIsAddItemOpen(true)}
              onOpenBulkUpload={() => setIsBulkUploadOpen(true)}
            />
          )}

          {activeTab === 'dressing-room' && (
            <DressingRoomView
              userId={user?.id || ''}
              wardrobe={wardrobe}
              savedOutfits={outfits}
              onOpenProfilePhotoModal={() => setIsProfilePhotoOpen(true)}
              onOpenBulkUploadModal={() => setIsBulkUploadOpen(true)}
              onOpenOutfitCreator={() => setIsOutfitCreatorOpen(true)}
              onRefreshData={loadClosetData}
              showToast={showToast}
            />
          )}

          {activeTab === 'outfits' && (
            <OutfitsView
              userId={user?.id || ''}
              outfits={outfits}
              wardrobe={wardrobe}
              isLoading={dataLoading}
              onRefresh={loadClosetData}
              onNavigateToCalendar={() => setActiveTab('calendar')}
            />
          )}

          {activeTab === 'stylist' && (
            <StylistView
              userId={user?.id || ''}
              wardrobe={wardrobe}
              onNavigateToCalendar={() => setActiveTab('calendar')}
              onRefresh={loadClosetData}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              userId={user?.id || ''}
              entries={calendarEntries}
              outfits={outfits}
              wardrobe={wardrobe}
              isLoading={dataLoading}
              onRefresh={loadClosetData}
              onOpenOutfitCreator={() => setIsOutfitCreatorOpen(true)}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              wardrobe={wardrobe}
              outfits={outfits}
              onRefresh={loadClosetData}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Global Modals */}
      <AddEditClothingModal
        isOpen={isAddItemOpen}
        userId={user?.id || ''}
        onClose={() => setIsAddItemOpen(false)}
        onSaved={() => {
          loadClosetData();
        }}
      />

      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        userId={user?.id || ''}
        existingWardrobe={wardrobe}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploadSuccess={() => {
          loadClosetData();
        }}
        showToast={showToast}
      />

      <ProfilePhotoModal
        isOpen={isProfilePhotoOpen}
        userId={user?.id || ''}
        existingPhotos={profilePhotos}
        onClose={() => setIsProfilePhotoOpen(false)}
        onPhotosUpdated={() => {
          loadProfilePhotos();
        }}
        showToast={showToast}
      />

      <OutfitCreator
        isOpen={isOutfitCreatorOpen}
        userId={user?.id || ''}
        wardrobe={wardrobe}
        onClose={() => setIsOutfitCreatorOpen(false)}
        onSaved={() => {
          loadClosetData();
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          loadClosetData();
        }}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onFinish={() => {
          setIsOnboardingOpen(false);
          loadClosetData();
        }}
      />

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ClosetAppContent />
    </AuthProvider>
  );
}
