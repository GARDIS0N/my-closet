import React from 'react';
import {
  LayoutDashboard,
  Shirt,
  Sparkles,
  Calendar,
  Layers,
  User,
  Eye,
} from 'lucide-react';
import { NavTab } from './Sidebar.js';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'closet', label: 'Closet', icon: Shirt },
    { id: 'dressing-room', label: 'Try-On', icon: Eye },
    { id: 'outfits', label: 'Outfits', icon: Layers },
    { id: 'stylist', label: 'Stylist', icon: Sparkles },
    { id: 'calendar', label: 'Plan', icon: Calendar },
    { id: 'profile', label: 'You', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-t border-[#E8E2D8] px-2 py-1.5 pb-safe shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[52px] py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-[#1E392A] font-bold'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors relative ${
                  isActive ? 'bg-[#EBF3EE]' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#1E392A]' : 'text-[#78716C]'}`} />
                {tab.id === 'stylist' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#1E392A]" />
                )}
              </div>
              <span className="text-[11px] tracking-tight leading-tight mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
