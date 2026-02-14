import React, { useState, useMemo } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { Tracker, TrackerType, AppSettings } from './types';
import { TRACKER_COLORS, ICONS, CURRENCIES, APP_THEMES, BG_PATTERNS, TRANSLATIONS } from './constants';
import TrackerCard from './components/TrackerCard';
import TrackerDetail from './components/TrackerDetail';
import SettingsModal from './components/SettingsModal';
import ConfirmDialog from './components/ConfirmDialog';

const App: React.FC = () => {
  const [trackers, setTrackers] = useLocalStorage<Tracker[]>('glass-trackers', []);
  const [appSettings, setAppSettings] = useLocalStorage<AppSettings>('glass-settings', {
    themeId: 'deep-space',
    patternId: 'none',
    language: 'en'
  });

  const [activeTrackerId, setActiveTrackerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Confirmation State
  const [trackerToDelete, setTrackerToDelete] = useState<string | null>(null);

  // Dashboard State (Search/Filter/Sort)
  const [dashSearch, setDashSearch] = useState('');
  const [dashFilter, setDashFilter] = useState<TrackerType | 'ALL'>('ALL');
  const [dashSort, setDashSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [isDashSortOpen, setIsDashSortOpen] = useState(false);

  // New Tracker Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<TrackerType>(TrackerType.TODO);
  const [newColor, setNewColor] = useState(TRACKER_COLORS[0]);
  const [newCurrency, setNewCurrency] = useState(CURRENCIES[0].symbol);
  const [newIcon, setNewIcon] = useState<string>(''); // Explicitly selected icon

  const activeTracker = trackers.find(t => t.id === activeTrackerId);
  const t = TRANSLATIONS[appSettings.language];
  
  // Styles based on settings
  const currentTheme = APP_THEMES.find(t => t.id === appSettings.themeId) || APP_THEMES[0];
  const currentPattern = BG_PATTERNS.find(p => p.id === appSettings.patternId) || BG_PATTERNS[0];

  const createTracker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Use selected icon or fallback to default for type
    const finalIcon = newIcon || getIconForType(newType);

    const newTracker: Tracker = {
      id: Date.now().toString(),
      title: newTitle,
      type: newType,
      color: newColor,
      icon: finalIcon,
      tasks: [],
      createdAt: Date.now(),
      noteContent: '',
      currency: newCurrency
    };

    setTrackers([newTracker, ...trackers]); // Add to top
    setNewTitle('');
    setNewIcon(''); // Reset icon
    setIsModalOpen(false);
  };

  const updateTracker = (updatedTracker: Tracker) => {
    setTrackers(trackers.map(t => t.id === updatedTracker.id ? updatedTracker : t));
  };

  // Soft Reload: Update state directly from imported data
  const handleImportData = (data: { trackers?: Tracker[], settings?: AppSettings }) => {
    if (data.trackers) {
        setTrackers(data.trackers);
    }
    if (data.settings) {
        setAppSettings(data.settings);
    }
  };

  // 1. Request Delete (Shows Modal)
  const requestDeleteTracker = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTrackerToDelete(id);
  };

  // 2. Confirm Delete (Executes Logic)
  const confirmDeleteTracker = () => {
    if (trackerToDelete) {
        setTrackers(trackers.filter(t => t.id !== trackerToDelete));
        if (activeTrackerId === trackerToDelete) setActiveTrackerId(null);
        setTrackerToDelete(null);
    }
  };

  const getIconForType = (type: TrackerType): string => {
    switch (type) {
      case TrackerType.SHOPPING: return 'ShoppingCart';
      case TrackerType.TRAVEL: return 'Plane';
      case TrackerType.HABIT: return 'Activity';
      case TrackerType.NOTE: return 'FileText';
      default: return 'CheckSquare';
    }
  };

  // Filter Logic
  const filteredTrackers = useMemo(() => {
    return trackers
      .filter(t => dashFilter === 'ALL' || t.type === dashFilter)
      .filter(t => t.title.toLowerCase().includes(dashSearch.toLowerCase()))
      .sort((a, b) => {
         if (dashSort === 'name') return a.title.localeCompare(b.title);
         if (dashSort === 'oldest') return a.createdAt - b.createdAt;
         return b.createdAt - a.createdAt; // newest
      });
  }, [trackers, dashFilter, dashSearch, dashSort]);

  const filterOptions = [
      { id: 'ALL', label: t.filterAll, icon: ICONS.LayoutGrid },
      { id: TrackerType.SHOPPING, label: t.filterShopping, icon: ICONS.ShoppingCart },
      { id: TrackerType.TODO, label: t.filterTodo, icon: ICONS.CheckSquare },
      { id: TrackerType.TRAVEL, label: t.filterTravel, icon: ICONS.Plane },
      { id: TrackerType.HABIT, label: t.filterHabit, icon: ICONS.Activity },
      { id: TrackerType.NOTE, label: t.filterNote, icon: ICONS.FileText },
  ];

  // Icons available for picker (subset of ICONS)
  const availableIcons = Object.keys(ICONS).filter(k => k !== 'Minus' && k !== 'Plus' && k !== 'Trash2' && k !== 'X' && k !== 'Check' && k !== 'Settings');

  return (
    <div 
        className="min-h-screen text-white/90 font-sans selection:bg-pink-500/30 relative overflow-hidden transition-all duration-700 ease-in-out flex flex-col"
        style={{ background: currentTheme.value }}
    >
      
      {/* Dynamic Background Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-10 z-0 transition-all duration-500"
        style={{
          backgroundImage: currentPattern.value,
          backgroundSize: '60px 60px' // Ensure consistent sizing for patterns
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-t from-black/50 to-transparent opacity-80" />

      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 flex-1 flex flex-col relative z-10 h-full">
        
        {/* Main Header (only visible on dashboard) */}
        {!activeTracker && (
          <header className="flex flex-col gap-6 mb-6 md:mb-8 animate-fade-in-down flex-shrink-0">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="flex items-center gap-2 md:gap-3 text-3xl md:text-5xl font-black tracking-tight mb-1">
                        <ICONS.Ghost className="text-white/80 animate-pulse w-8 h-8 md:w-10 md:h-10" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-100 to-white/30 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                            {t.appTitle}
                        </span>
                    </h1>
                    <p className="text-white/50 font-medium tracking-wide ml-1 text-xs md:text-base hidden sm:block">{t.appSubtitle}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 md:p-3 rounded-xl transition-colors border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white backdrop-blur-sm"
                        title={t.settings}
                    >
                        <ICONS.Settings className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>
            </div>

            {/* Dashboard Controls (Search & Filter) */}
            <div className="flex flex-col gap-4">
                {/* Search Bar & Sort */}
                <div className="flex gap-3">
                    <div className="relative flex-1 group">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-indigo-300 transition-colors">
                            <ICONS.Search size={18} />
                         </div>
                         <input 
                            type="text" 
                            value={dashSearch}
                            onChange={(e) => setDashSearch(e.target.value)}
                            placeholder={t.search}
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-indigo-400/50 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:bg-white/10 transition-all backdrop-blur-sm shadow-lg"
                         />
                    </div>
                    
                    <div className="relative">
                        <button 
                            onClick={() => setIsDashSortOpen(!isDashSortOpen)}
                            className="h-full px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 flex items-center gap-2 transition-all backdrop-blur-sm"
                        >
                            <ICONS.ArrowDownAZ size={18} />
                            <span className="hidden md:block text-sm">{t.sort}</span>
                        </button>
                         {isDashSortOpen && (
                            <div 
                                className="absolute right-0 top-full mt-2 w-48 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up"
                                style={{ background: currentTheme.value }}
                            >
                                <div className="bg-black/40 backdrop-blur-md p-1">
                                    <button onClick={() => { setDashSort('newest'); setIsDashSortOpen(false) }} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center ${dashSort === 'newest' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                                        {t.sortNewest} {dashSort === 'newest' && <ICONS.Check size={14} />}
                                    </button>
                                    <button onClick={() => { setDashSort('oldest'); setIsDashSortOpen(false) }} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center ${dashSort === 'oldest' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                                        {t.sortOldest} {dashSort === 'oldest' && <ICONS.Check size={14} />}
                                    </button>
                                    <button onClick={() => { setDashSort('name'); setIsDashSortOpen(false) }} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center ${dashSort === 'name' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                                        {t.sortName} {dashSort === 'name' && <ICONS.Check size={14} />}
                                    </button>
                                </div>
                            </div>
                        )}
                        {isDashSortOpen && (
                            <div className="fixed inset-0 z-40" onClick={() => setIsDashSortOpen(false)} />
                        )}
                    </div>
                </div>

                {/* Filter Tabs - Horizontal Scroll with Hidden Scrollbar */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {filterOptions.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setDashFilter(opt.id as any)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border flex-shrink-0
                                ${dashFilter === opt.id 
                                    ? 'bg-white/20 border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                                    : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:text-white/80'
                                }
                            `}
                        >
                            <opt.icon size={14} />
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
          </header>
        )}

        {/* Content Area */}
        <main className={`flex-1 relative flex flex-col ${activeTracker ? 'h-full overflow-hidden' : ''}`}>
          {activeTracker ? (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl animate-fade-in flex flex-col flex-1 min-h-0 overflow-hidden">
               <TrackerDetail 
                  tracker={activeTracker} 
                  onUpdate={updateTracker} 
                  onBack={() => setActiveTrackerId(null)}
                  userApiKey={appSettings.userApiKey}
                  language={appSettings.language}
                  themeColor={currentTheme.value}
               />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up pb-8 content-start">
              {/* Add New Card */}
              {dashFilter === 'ALL' && !dashSearch && (
                  <button 
                    onClick={() => { setIsModalOpen(true); setNewIcon(''); }}
                    className="group flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-white/20 hover:border-white/50 hover:bg-white/5 transition-all min-h-[200px]"
                  >
                    <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 mb-4 transition-colors">
                        <ICONS.Plus size={32} className="text-white/50 group-hover:text-white" />
                    </div>
                    <span className="text-white/50 group-hover:text-white font-medium">{t.createTrack}</span>
                  </button>
              )}

              {filteredTrackers.map(tracker => (
                <TrackerCard 
                  key={tracker.id} 
                  tracker={tracker} 
                  onClick={() => setActiveTrackerId(tracker.id)}
                  onDelete={(e) => requestDeleteTracker(e, tracker.id)}
                  language={appSettings.language}
                />
              ))}

              {filteredTrackers.length === 0 && dashSearch && (
                  <div className="col-span-full text-center py-10 text-white/30">
                      <ICONS.Search size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Nothing found for "{dashSearch}"</p>
                  </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal: Create Tracker */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div 
            className="w-full max-w-md border border-white/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden my-auto"
            style={{ background: currentTheme.value }}
          >
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full pointer-events-none" />
             
             <h2 className="text-2xl font-bold mb-6 relative z-10">{t.newTrackTitle}</h2>
             
             <form onSubmit={createTracker} className="space-y-4 relative z-10">
                <div>
                    <label className="block text-sm text-white/50 mb-1">{t.nameLabel}</label>
                    <input 
                        type="text" 
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder={t.namePlaceholder}
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm text-white/50 mb-2">{t.typeLabel}</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.values(TrackerType).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => { setNewType(type); setNewIcon(''); }}
                                className={`
                                    px-3 py-2 rounded-lg text-sm border transition-all text-left
                                    ${newType === type 
                                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                    }
                                `}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Icon Selection */}
                <div>
                    <label className="block text-sm text-white/50 mb-2">Icon (Optional)</label>
                    <div className="h-32 overflow-y-auto custom-scrollbar border border-white/10 rounded-xl p-2 grid grid-cols-6 gap-2 bg-black/10">
                         {availableIcons.map(iconName => {
                             const Icon = ICONS[iconName as keyof typeof ICONS];
                             const isSelected = newIcon === iconName || (!newIcon && iconName === getIconForType(newType));
                             return (
                                 <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => setNewIcon(iconName)}
                                    className={`p-2 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-white text-black' : 'text-white/50 hover:bg-white/10'}`}
                                 >
                                     <Icon size={18} />
                                 </button>
                             )
                         })}
                    </div>
                </div>

                {(newType === TrackerType.SHOPPING || newType === TrackerType.TRAVEL) && (
                   <div>
                       <label className="block text-sm text-white/50 mb-2">{t.currencyLabel}</label>
                       <div className="grid grid-cols-5 gap-2">
                           {CURRENCIES.map(curr => (
                               <button
                                   key={curr.code}
                                   type="button"
                                   onClick={() => setNewCurrency(curr.symbol)}
                                   className={`
                                       px-1 py-2 rounded-lg text-sm border transition-all text-center
                                       ${newCurrency === curr.symbol
                                           ? 'bg-emerald-600 border-emerald-500 text-white' 
                                           : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                       }
                                   `}
                                   title={curr.label}
                               >
                                   {curr.symbol}
                               </button>
                           ))}
                       </div>
                   </div>
                )}

                <div>
                    <label className="block text-sm text-white/50 mb-2">{t.colorLabel}</label>
                    <div className="flex gap-2 flex-wrap">
                        {TRACKER_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setNewColor(color)}
                                className={`
                                    w-8 h-8 rounded-full bg-gradient-to-br ${color}
                                    transition-transform hover:scale-110
                                    ${newColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1e1b4b]' : 'opacity-70 hover:opacity-100'}
                                `}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/70"
                    >
                        {t.cancel}
                    </button>
                    <button 
                        type="submit" 
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-medium shadow-lg transition-all"
                    >
                        {t.create}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
            settings={appSettings}
            onUpdate={setAppSettings}
            onImportData={handleImportData}
            onClose={() => setIsSettingsOpen(false)}
            themeBackground={currentTheme.value}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog 
        isOpen={!!trackerToDelete}
        title={t.appTitle}
        message={t.deleteConfirm}
        confirmText="Delete"
        isDangerous={true}
        onConfirm={confirmDeleteTracker}
        onCancel={() => setTrackerToDelete(null)}
        language={appSettings.language}
        themeColor={currentTheme.value}
      />

    </div>
  );
};

export default App;