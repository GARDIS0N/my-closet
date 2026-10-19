import React from 'react';
import {
  LayoutDashboard,
  Shirt,
  Sparkles,
  Calendar,
  Layers,
  User,
  Plus,
  Cloud,
  Database,
  LogOut,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../services/authContext.js';

export type NavTab = 'dashboard' | 'closet' | 'outfits' | 'dressing-room' | 'stylist' | 'calendar' | 'profile';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddItem: () => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddItem,
  onOpenAuth,
}) => {
  const { user, isLocalMode, logout } = useAuth();

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'closet', label: 'Wardrobe', icon: Shirt },
    { id: 'dressing-room', label: 'Dressing Room', icon: Eye },
    { id: 'outfits', label: 'Outfits', icon: Layers },
    { id: 'stylist', label: 'AI Stylist', icon: Sparkles },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#FAF7F2] border-r border-[#E8E2D8] min-h-screen px-4 py-6 justify-between select-none shrink-0 sticky top-0 h-screen">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-1">
          <div className="w-10 h-10 rounded-2xl bg-[#1E392A] text-[#FAF7F2] flex items-center justify-center shadow-md">
            <Shirt className="w-5 h-5 text-[#C2A674]" />
          </div>
          <div>
            <h1 className="font-editorial text-2xl font-bold tracking-tight text-[#1C1917] leading-none">
              MyCloset
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-[#78716C] font-semibold">
              Digital Wardrobe
            </span>
          </div>
        </div>

        {/* Quick Add Action */}
        <button
          onClick={onOpenAddItem}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1E392A] hover:bg-[#15291E] text-white rounded-2xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
          <span>Add Clothing</span>
        </button>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-150 cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#EBF3EE] text-[#1E392A] font-semibold shadow-2xs'
                    : 'text-[#44403C] hover:bg-stone-200/50 hover:text-[#1C1917]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-[#1E392A]' : 'text-[#78716C]'
                  }`}
                />
                <span>{item.label}</span>
                {item.id === 'stylist' && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-[#1E392A]/10 text-[#1E392A] px-2 py-0.5 rounded-full">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer & Account info */}
      <div className="space-y-4 pt-4 border-t border-[#E8E2D8]">
        {/* Persistence Status Badge */}
        <div className="px-3 py-2 bg-white/80 border border-[#E8E2D8] rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isLocalMode ? (
              <Database className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="text-stone-600 font-medium">
              {isLocalMode ? 'Local Persistent' : 'Supabase Cloud'}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              isLocalMode ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </div>

        {/* User Card */}
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/60 transition-colors">
            <button
              onClick={() => onSelectTab('profile')}
              className="flex items-center gap-3 text-left overflow-hidden cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#1E392A] text-white flex items-center justify-center font-bold text-sm shrink-0">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-[#1C1917] truncate leading-tight">
                  {user.full_name}
                </p>
                <p className="text-xs text-[#78716C] truncate">{user.email}</p>
              </div>
            </button>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full py-2.5 px-4 bg-white border border-[#E8E2D8] hover:border-stone-400 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
          >
            Sign In / Register
          </button>
        )}
      </div>
    </aside>
  );
};
