import React from 'react';
import { Shirt, Plus } from 'lucide-react';
import { NavTab } from './Sidebar.js';
import { useAuth } from '../../services/authContext.js';

interface TopHeaderProps {
  activeTab: NavTab;
  onOpenAddItem: () => void;
  onSelectTab: (tab: NavTab) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onOpenAddItem,
  onSelectTab,
}) => {
  const { user } = useAuth();

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'MyCloset', subtitle: 'Curated Overview' },
    closet: { title: 'Wardrobe', subtitle: 'All Pieces' },
    'dressing-room': { title: 'Dressing Room', subtitle: 'Virtual Try-On' },
    outfits: { title: 'Outfits', subtitle: 'Curated Looks' },
    stylist: { title: 'AI Stylist', subtitle: 'Smart Recommendations' },
    calendar: { title: 'Schedule', subtitle: 'Outfit Planning' },
    profile: { title: 'Preferences', subtitle: 'Account & Setup' },
  };

  const current = titles[activeTab];

  return (
    <header className="md:hidden sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8E2D8] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#1E392A] text-white flex items-center justify-center shadow-xs">
          <Shirt className="w-4 h-4 text-[#C2A674]" />
        </div>
        <div>
          <h2 className="font-editorial text-lg font-bold text-[#1C1917] leading-none">
            {current.title}
          </h2>
          <p className="text-[10px] text-[#78716C] font-medium tracking-wide uppercase">
            {current.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAddItem}
          className="flex items-center gap-1.5 py-1.5 px-3 bg-[#1E392A] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>

        <button
          onClick={() => onSelectTab('profile')}
          className="w-8 h-8 rounded-full bg-[#EBF3EE] border border-[#C8DDD0] text-[#1E392A] flex items-center justify-center font-bold text-xs cursor-pointer"
        >
          {user?.full_name?.charAt(0) || 'U'}
        </button>
      </div>
    </header>
  );
};
