import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Trash2,
  Clock,
  Shirt,
  Sparkles,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  CalendarEntry,
  SavedOutfit,
  ClothingItem,
} from '../../types/closet.js';
import { closetService } from '../../services/closetService.js';
import { showToast } from '../common/Toast.js';

interface CalendarViewProps {
  userId: string;
  entries: CalendarEntry[];
  outfits: SavedOutfit[];
  wardrobe: ClothingItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenOutfitCreator: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  userId,
  entries,
  outfits,
  wardrobe,
  isLoading,
  onRefresh,
  onOpenOutfitCreator,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());

  // Modal to schedule outfit
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>(
    outfits[0]?.id || ''
  );
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Month navigation
  const prevMonth = () => {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
    );
  };

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Preceding padding
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }

    // Trailing padding to fill 35 or 42 cells
    const remaining = 35 - days.length;
    if (remaining > 0) {
      for (let i = 1; i <= remaining; i++) {
        const m = month + 2 > 12 ? 1 : month + 2;
        const y = month + 2 > 12 ? year + 1 : year;
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        days.push({ dateStr, dayNum: i, isCurrentMonth: false });
      }
    }

    return days;
  }, [currentMonthDate]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    entries.forEach((e) => {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [entries]);

  // Week days calculation for week view
  const weekDays = useMemo(() => {
    const cur = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = cur.getDay(); // 0 is Sunday
    const startOfWeek = new Date(cur);
    startOfWeek.setDate(cur.getDate() - dayOfWeek);

    const days: { dateStr: string; dayNum: number; dayName: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayNum = d.getDate();
      const dayName = d.toLocaleDateString('default', { weekday: 'short' });
      days.push({ dateStr, dayNum, dayName });
    }
    return days;
  }, [selectedDate]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Selected date entries
  const selectedDayEntries = entriesByDate.get(selectedDate) || [];

  // Upcoming entries (today and future)
  const upcomingEntries = useMemo(() => {
    return entries
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, todayStr]);

  // Past history entries
  const pastEntries = useMemo(() => {
    return entries
      .filter((e) => e.date < todayStr)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, todayStr]);

  // Toggle worn status
  const handleToggleWorn = async (entry: CalendarEntry) => {
    await closetService.markOutfitWorn(entry.id, !entry.is_worn);
    showToast(
      'success',
      !entry.is_worn ? 'Marked as Worn' : 'Unmarked Worn',
      `Wear log updated for ${entry.date}.`
    );
    onRefresh();
  };

  const handleDeleteEntry = async (id: string) => {
    await closetService.deleteCalendarEntry(id);
    showToast('info', 'Plan Removed', 'Removed scheduled outfit.');
    onRefresh();
  };

  const handleOpenSchedule = (date = selectedDate) => {
    setTargetDate(date);
    setSelectedOutfitId(outfits[0]?.id || '');
    setScheduleNotes('');
    setDuplicateWarning(null);
    setIsScheduleModalOpen(true);
  };

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutfitId) {
      showToast('error', 'Select Outfit', 'Please select an outfit to plan.');
      return;
    }

    // Check duplicate
    const existing = entriesByDate.get(targetDate) || [];
    if (existing.some((e) => e.outfit_id === selectedOutfitId) && !duplicateWarning) {
      setDuplicateWarning('This outfit is already scheduled for this date. Click schedule again to confirm.');
      return;
    }

    await closetService.scheduleOutfit(userId, targetDate, selectedOutfitId, scheduleNotes.trim());
    showToast('success', 'Outfit Planned', `Scheduled for ${targetDate}.`);
    setIsScheduleModalOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#78716C] font-bold">
            Wardrobe Schedule
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#1C1917]">
            Outfit Calendar
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Plan what to wear for the week ahead and maintain a visual archive of your looks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex p-1 bg-white border border-[#E8E2D8] rounded-2xl text-xs font-semibold">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                  viewMode === mode
                    ? 'bg-[#1E392A] text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleOpenSchedule()}
            disabled={outfits.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1E392A] hover:bg-[#15291E] disabled:opacity-50 text-white rounded-2xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Plan Outfit</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Interactive Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-[#E8E2D8] shadow-xs space-y-4">
          {/* Month Header & Controls */}
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-2xl font-bold text-[#1C1917]">
              {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentMonthDate(new Date());
                  setSelectedDate(todayStr);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {viewMode === 'month' && (
            <>
              {/* Weekday Names */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-stone-400 py-1">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarDays.map((d) => {
                  const dayEntries = entriesByDate.get(d.dateStr) || [];
                  const isSelected = selectedDate === d.dateStr;
                  const isToday = todayStr === d.dateStr;
                  const hasOutfit = dayEntries.length > 0;
                  const firstOutfit = dayEntries[0]?.outfit;

                  return (
                    <div
                      key={d.dateStr}
                      onClick={() => setSelectedDate(d.dateStr)}
                      className={`min-h-[72px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#1E392A] ring-2 ring-[#1E392A]/20 bg-[#FAF7F2]'
                          : isToday
                          ? 'border-[#C8DDD0] bg-[#EBF3EE]/40'
                          : d.isCurrentMonth
                          ? 'border-[#E8E2D8] bg-white hover:border-stone-400'
                          : 'border-transparent bg-stone-50/50 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                            isToday
                              ? 'bg-[#1E392A] text-white'
                              : isSelected
                              ? 'text-[#1E392A]'
                              : d.isCurrentMonth
                              ? 'text-stone-800'
                              : 'text-stone-400'
                          }`}
                        >
                          {d.dayNum}
                        </span>
                        {hasOutfit && (
                          <span className="w-2 h-2 rounded-full bg-[#1E392A]" />
                        )}
                      </div>

                      {hasOutfit ? (
                        <div className="mt-1">
                          <p className="text-[10px] font-semibold text-stone-900 truncate leading-tight">
                            {firstOutfit?.name || 'Planned Look'}
                          </p>
                          <span className="text-[9px] text-[#1E392A] font-medium">
                            {dayEntries.length > 1 ? `+${dayEntries.length - 1} more` : '1 look'}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === 'week' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                {weekDays.map((d) => {
                  const dayEntries = entriesByDate.get(d.dateStr) || [];
                  const isSelected = selectedDate === d.dateStr;
                  const isToday = todayStr === d.dateStr;
                  const hasOutfit = dayEntries.length > 0;
                  const firstOutfit = dayEntries[0]?.outfit;

                  return (
                    <div
                      key={d.dateStr}
                      onClick={() => setSelectedDate(d.dateStr)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[140px] ${
                        isSelected
                          ? 'border-[#1E392A] bg-[#FAF7F2] ring-2 ring-[#1E392A]/20'
                          : isToday
                          ? 'border-[#C8DDD0] bg-[#EBF3EE]/40'
                          : 'border-[#E8E2D8] bg-white hover:border-stone-400'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">
                          {d.dayName}
                        </span>
                        <span
                          className={`text-sm font-bold inline-block px-1.5 py-0.5 rounded-md mt-0.5 ${
                            isToday ? 'bg-[#1E392A] text-white' : 'text-stone-800'
                          }`}
                        >
                          {d.dayNum}
                        </span>
                      </div>

                      {hasOutfit ? (
                        <div className="space-y-1 mt-2">
                          <span className="text-[9px] font-bold text-[#1E392A] bg-[#EBF3EE] px-1.5 py-0.5 rounded block truncate">
                            {firstOutfit?.name || 'Look'}
                          </span>
                          <span className="text-[9px] text-stone-500">
                            {dayEntries[0]?.is_worn ? '✓ Worn' : 'Planned'}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-stone-400 italic">No plan</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'day' && (
            <div className="p-6 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Day Focus
                  </span>
                  <h4 className="font-editorial text-2xl font-bold text-stone-900">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenSchedule(selectedDate)}
                  className="px-4 py-2 bg-[#1E392A] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                >
                  {selectedDayEntries.length > 0 ? 'Change Outfit' : '+ Plan Outfit'}
                </button>
              </div>

              {selectedDayEntries.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-stone-600">
                    Look scheduled for this day:
                  </p>
                  <p className="font-editorial text-xl font-bold text-[#1E392A]">
                    {selectedDayEntries[0]?.outfit?.name}
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-stone-500">
                  No outfit currently assigned for this date.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Selected Date Plan Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E2D8] shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#F3EFEA] pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                  Selected Date
                </span>
                <h4 className="font-editorial text-xl font-bold text-[#1C1917]">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => handleOpenSchedule(selectedDate)}
                className="p-2 rounded-xl bg-[#EBF3EE] text-[#1E392A] hover:bg-[#C8DDD0] cursor-pointer transition-colors"
                title="Add outfit to this day"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {selectedDayEntries.length > 0 ? (
              <div className="space-y-4">
                {selectedDayEntries.map((entry) => {
                  const outfit = entry.outfit;
                  const items = (outfit?.items || [])
                    .map((ref) => ref.item || wardrobe.find((w) => w.id === ref.clothing_item_id))
                    .filter(Boolean) as ClothingItem[];

                  return (
                    <div
                      key={entry.id}
                      className="p-4 rounded-2xl border border-[#E8E2D8] bg-[#FAF7F2] space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#EBF3EE] text-[#1E392A] px-2 py-0.5 rounded">
                              {outfit?.occasion || 'Casual'}
                            </span>
                            {entry.is_worn && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Worn
                              </span>
                            )}
                          </div>
                          <h5 className="font-editorial text-lg font-bold text-stone-900">
                            {outfit?.name || 'Curated Outfit'}
                          </h5>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Items Row Preview */}
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {items.map((item, idx) => (
                          <div
                            key={item.id + idx}
                            className="w-12 h-12 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 shadow-2xs"
                            title={`${item.name} (${item.color})`}
                          >
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>

                      {entry.notes && (
                        <p className="text-xs text-stone-600 italic bg-white p-2 rounded-xl border border-stone-200">
                          "{entry.notes}"
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleWorn(entry)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          entry.is_worn
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-[#E8E2D8] text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{entry.is_worn ? 'Worn Today (Click to Undo)' : 'Mark as Worn'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <Shirt className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-xs text-stone-600">
                  No outfit planned yet for this date.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenSchedule(selectedDate)}
                  className="px-4 py-2 bg-[#1E392A] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Plan Outfit for this Day
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming & History Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upcoming Plans */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E2D8] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1E392A]" />
            <h3 className="font-editorial text-xl font-bold text-stone-900">
              Upcoming Schedule
            </h3>
          </div>

          <div className="space-y-3">
            {upcomingEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedDate(entry.date)}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D8] hover:border-[#1E392A] transition-all cursor-pointer"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-500">
                    {entry.date}
                  </span>
                  <h5 className="text-sm font-semibold text-stone-900">
                    {entry.outfit?.name || 'Planned Outfit'}
                  </h5>
                </div>
                <span className="text-xs font-semibold text-[#1E392A] bg-[#EBF3EE] px-2.5 py-1 rounded-full">
                  {entry.outfit?.occasion || 'Upcoming'}
                </span>
              </div>
            ))}

            {upcomingEntries.length === 0 && (
              <p className="text-xs text-stone-500 text-center py-4">
                No future outfits planned. Choose a date above to schedule!
              </p>
            )}
          </div>
        </div>

        {/* History of Looks */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E2D8] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1E392A]" />
            <h3 className="font-editorial text-xl font-bold text-stone-900">
              Wardrobe History
            </h3>
          </div>

          <div className="space-y-3">
            {pastEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedDate(entry.date)}
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E8E2D8] hover:border-stone-400 transition-all cursor-pointer"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-500">
                    {entry.date}
                  </span>
                  <h5 className="text-sm font-semibold text-stone-900">
                    {entry.outfit?.name || 'Past Look'}
                  </h5>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    entry.is_worn
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {entry.is_worn ? 'Worn' : 'Scheduled'}
                </span>
              </div>
            ))}

            {pastEntries.length === 0 && (
              <p className="text-xs text-stone-500 text-center py-4">
                No outfit history recorded yet. Outfits scheduled in the past appear here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Plan Outfit Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5 animate-in zoom-in-95">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-editorial text-2xl font-bold text-[#1C1917]">
                Plan Outfit for Date
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Assign a look to your daily schedule.
              </p>
            </div>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <form onSubmit={handleConfirmSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-[#E8E2D8] rounded-xl text-xs font-semibold text-stone-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-700">
                    Select Outfit
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsScheduleModalOpen(false);
                      onOpenOutfitCreator();
                    }}
                    className="text-[11px] font-semibold text-[#1E392A] hover:underline"
                  >
                    + Create New
                  </button>
                </div>

                <select
                  value={selectedOutfitId}
                  onChange={(e) => setSelectedOutfitId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-[#E8E2D8] rounded-xl text-xs font-semibold text-stone-800"
                >
                  {outfits.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.occasion} • {o.items.length} pieces)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Day's Agenda / Styling Notes (Optional)
                </label>
                <input
                  type="text"
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="e.g. Board presentation, gallery opening, dinner date"
                  className="w-full px-3 py-2.5 bg-white border border-[#E8E2D8] rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D8]">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1E392A] hover:bg-[#15291E] text-white text-xs font-semibold shadow-xs"
                >
                  Confirm Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
