import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Tracker, TrackerType, Task } from '../types';
import { ICONS, TRANSLATIONS } from '../constants';
import { generateTrackerSuggestions } from '../services/geminiService';
import ConfirmDialog from './ConfirmDialog';

interface TrackerDetailProps {
  tracker: Tracker;
  onUpdate: (updatedTracker: Tracker) => void;
  onBack: () => void;
  userApiKey?: string;
  language: 'ru' | 'en';
  themeColor: string;
}

type SortOption = 'created' | 'name' | 'value';

const TrackerDetail: React.FC<TrackerDetailProps> = ({ 
  tracker, 
  onUpdate, 
  onBack, 
  userApiKey,
  language,
  themeColor
}) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskValue, setNewTaskValue] = useState('');
  const [newTaskQuantity, setNewTaskQuantity] = useState('1');
  
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('created');
  
  // UI State
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{text: string, value: string, quantity: string}>({ text: '', value: '', quantity: '1' });
  
  // State for collapsible habits (Store IDs of expanded habits)
  const [expandedHabits, setExpandedHabits] = useState<Set<string>>(new Set());

  // Bulk Actions Confirmation State
  const [confirmAction, setConfirmAction] = useState<{ type: 'DELETE_ALL' | 'CLEAR_COMPLETED', callback: () => void } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const currency = tracker.currency || '₽';
  const t = TRANSLATIONS[language];

  // Optimization: Calculate today's date string once per render
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
     // Optional: Load initial state logic here if needed
  }, []);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Logic: Process tasks based on search, filter and sort
  const { activeTasks, completedTasks } = useMemo(() => {
    let tasks = [...tracker.tasks];

    // 1. Search
    if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        tasks = tasks.filter(task => task.text.toLowerCase().includes(lowerQuery));
    }

    // 2. Sort (Applied before splitting)
    tasks.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.text.localeCompare(b.text);
            case 'value':
                const valA = (a.value || 0) * (a.quantity || 1);
                const valB = (b.value || 0) * (b.quantity || 1);
                return valB - valA; // Descending price
            case 'created':
            default:
                return a.id.localeCompare(b.id);
        }
    });

    const active = tasks.filter(t => !t.completed);
    const completed = tasks.filter(t => t.completed);

    return { activeTasks: active, completedTasks: completed };
  }, [tracker.tasks, searchQuery, sortBy]);

  const totalValue = tracker.tasks.reduce((acc, t) => acc + (t.value || 0) * (t.quantity || 1), 0);
  const showFinancials = tracker.type === TrackerType.SHOPPING || tracker.type === TrackerType.TRAVEL;

  // Check if all active habits are expanded
  const areAllActiveExpanded = activeTasks.length > 0 && activeTasks.every(t => expandedHabits.has(t.id));

  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskText.trim()) return;

    const newId = Date.now().toString();
    const newTask: Task = {
      id: newId,
      text: newTaskText,
      completed: false,
      value: newTaskValue ? parseFloat(newTaskValue) : undefined,
      quantity: newTaskQuantity ? parseInt(newTaskQuantity) : 1,
      completedDates: []
    };

    onUpdate({
      ...tracker,
      tasks: [...tracker.tasks, newTask]
    });

    // Auto expand new habit
    if (tracker.type === TrackerType.HABIT) {
        setExpandedHabits(prev => new Set(prev).add(newId));
    }

    setNewTaskText('');
    setNewTaskValue('');
    setNewTaskQuantity('1');
    
    setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditForm({
      text: task.text,
      value: task.value?.toString() || '',
      quantity: task.quantity?.toString() || '1'
    });
  };

  const saveEdit = () => {
    if (!editingTaskId) return;

    const updatedTasks = tracker.tasks.map(t => {
      if (t.id === editingTaskId) {
        return {
          ...t,
          text: editForm.text,
          value: editForm.value ? parseFloat(editForm.value) : undefined,
          quantity: editForm.quantity ? parseInt(editForm.quantity) : 1
        };
      }
      return t;
    });

    onUpdate({ ...tracker, tasks: updatedTasks });
    setEditingTaskId(null);
  };

  const handleToggleTask = (taskId: string) => {
    if (editingTaskId === taskId) return;
    const updatedTasks = tracker.tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdate({ ...tracker, tasks: updatedTasks });
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tracker.tasks.filter(t => t.id !== taskId);
    onUpdate({ ...tracker, tasks: updatedTasks });
  };

  // --- Habit Tracking Logic ---
  const toggleHabitExpand = (taskId: string) => {
      setExpandedHabits(prev => {
          const next = new Set(prev);
          if (next.has(taskId)) {
              next.delete(taskId);
          } else {
              next.add(taskId);
          }
          return next;
      });
  };
  
  const toggleAllHabits = () => {
      if (areAllActiveExpanded) {
          // Collapse all active
          setExpandedHabits(prev => {
              const next = new Set(prev);
              activeTasks.forEach(t => next.delete(t.id));
              return next;
          });
      } else {
          // Expand all active
          setExpandedHabits(prev => {
              const next = new Set(prev);
              activeTasks.forEach(t => next.add(t.id));
              return next;
          });
      }
  };

  const toggleHabitDate = (taskId: string, dateStr: string) => {
      const updatedTasks = tracker.tasks.map(t => {
          if (t.id !== taskId) return t;
          
          const currentDates = t.completedDates || [];
          const exists = currentDates.includes(dateStr);
          
          let newDates;
          if (exists) {
              newDates = currentDates.filter(d => d !== dateStr);
          } else {
              newDates = [...currentDates, dateStr];
          }

          return { ...t, completedDates: newDates };
      });
      onUpdate({ ...tracker, tasks: updatedTasks });
  };

  const getCalendarData = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayObj = new Date(year, month, 1);
      const startDay = firstDayObj.getDay(); // 0 = Sun, 1 = Mon ...
      
      // Calculate offset for Monday start (Mon=0 ... Sun=6)
      const offset = startDay === 0 ? 6 : startDay - 1;
      
      const days = [];
      for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(year, month, i);
          const dateStr = d.toISOString().split('T')[0];
          days.push({ date: i, dateStr });
      }
      return { days, offset };
  };
  // ---------------------------

  // Bulk Actions
  const promptDeleteAll = () => {
      setIsMenuOpen(false);
      setConfirmAction({
          type: 'DELETE_ALL',
          callback: () => {
              onUpdate({ ...tracker, tasks: [] });
              setConfirmAction(null);
          }
      });
  };

  const promptClearCompleted = () => {
      setIsMenuOpen(false);
      setConfirmAction({
          type: 'CLEAR_COMPLETED',
          callback: () => {
              const activeOnly = tracker.tasks.filter(t => !t.completed);
              onUpdate({ ...tracker, tasks: activeOnly });
              setConfirmAction(null);
          }
      });
  };

  const handleAiSuggest = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    
    const suggestions = await generateTrackerSuggestions(aiPrompt, tracker.type, userApiKey, language);
    
    if (suggestions.length > 0) {
        if (tracker.type === TrackerType.NOTE) {
            // For notes, join the paragraphs
            const textToAdd = suggestions.join('\n\n');
            const newContent = (tracker.noteContent || '') + (tracker.noteContent ? '\n\n' : '') + textToAdd;
            onUpdate({ ...tracker, noteContent: newContent });
        } else {
            // For lists
            const newTasks = suggestions.map(s => ({
                id: Date.now() + Math.random().toString(),
                text: s,
                completed: false,
                quantity: 1,
                completedDates: []
            }));
            onUpdate({
                ...tracker,
                tasks: [...tracker.tasks, ...newTasks]
            });
             // Expand new suggestions for habits
            if (tracker.type === TrackerType.HABIT) {
                setExpandedHabits(prev => {
                     const next = new Set(prev);
                     newTasks.forEach(t => next.add(t.id));
                     return next;
                });
            }
        }
    }
    setIsAiLoading(false);
    setShowAiInput(false);
    setAiPrompt('');
  };

  const handleNoteChange = (content: string) => {
    onUpdate({ ...tracker, noteContent: content });
  };

  // Input helpers
  const incrementQty = () => {
      const current = parseInt(newTaskQuantity) || 0;
      setNewTaskQuantity((current + 1).toString());
  };
  const decrementQty = () => {
      const current = parseInt(newTaskQuantity) || 1;
      if (current > 1) setNewTaskQuantity((current - 1).toString());
  };

  // --- Renderers ---

  const renderHabitItem = (task: Task) => {
      const { days, offset } = getCalendarData();
      const weekDays = language === 'ru' 
        ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
        : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      
      const isExpanded = expandedHabits.has(task.id);
      const isEditing = editingTaskId === task.id;

      return (
        <div key={task.id} className={`bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 animate-slide-in transition-all ${task.completed ? 'opacity-50' : ''}`}>
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3 mb-2">
                 <div className="flex items-center gap-3 flex-1 min-w-0">
                     {/* Complete/Archive Habit Button */}
                     <button 
                        onClick={() => handleToggleTask(task.id)}
                        className={`
                            flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-all
                            ${task.completed 
                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                : 'border-white/30 hover:border-white/60 hover:bg-white/5'
                            }
                        `}
                        title={task.completed ? "Reactivate Habit" : "Complete/Archive Habit"}
                     >
                        {task.completed && <ICONS.Check size={14} />}
                     </button>
                     
                     {isEditing ? (
                         <div className="flex-1 flex gap-2">
                             <input 
                                autoFocus
                                value={editForm.text}
                                onChange={e => setEditForm({...editForm, text: e.target.value})}
                                className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-indigo-400 w-full text-lg font-medium"
                             />
                             <button onClick={saveEdit} className="p-1 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30">
                                 <ICONS.Save size={18} />
                             </button>
                         </div>
                     ) : (
                        <h3 
                            onClick={() => toggleHabitExpand(task.id)}
                            className={`text-lg font-medium text-white truncate cursor-pointer select-none hover:text-indigo-200 transition-colors ${task.completed ? 'line-through text-white/50' : ''}`}
                        >
                            {task.text}
                        </h3>
                     )}
                 </div>

                 <div className="flex items-center gap-1">
                     {!isEditing && (
                        <button onClick={() => startEditing(task)} className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 hover:border-white/20 transition-all backdrop-blur-sm">
                            <ICONS.Edit2 size={16} />
                        </button>
                     )}
                     <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-white/40 hover:text-rose-400 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 hover:border-white/20 transition-all backdrop-blur-sm">
                         <ICONS.Trash2 size={16} />
                     </button>
                     <button 
                        onClick={() => toggleHabitExpand(task.id)} 
                        className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 hover:border-white/20 transition-all backdrop-blur-sm"
                     >
                         {isExpanded ? <ICONS.ChevronUp size={16} /> : <ICONS.ChevronDown size={16} />}
                     </button>
                 </div>
            </div>
            
            {/* Calendar Grid (Collapsible) */}
            {isExpanded && !task.completed && (
                <div className="grid grid-cols-7 gap-2 mt-4 animate-fade-in">
                    {/* Headers */}
                    {weekDays.map((d, i) => (
                        <div key={i} className="text-center text-[10px] uppercase font-bold text-white/30 mb-1">
                            {d}
                        </div>
                    ))}

                    {/* Empty Slots */}
                    {Array.from({ length: offset }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {/* Days */}
                    {days.map((day) => {
                        const isCompleted = task.completedDates?.includes(day.dateStr);
                        // OPTIMIZATION: Use pre-calculated todayStr
                        const isToday = day.dateStr === todayStr;
                        
                        return (
                            <button
                                key={day.dateStr}
                                onClick={() => toggleHabitDate(task.id, day.dateStr)}
                                className={`
                                    aspect-square rounded-full flex items-center justify-center transition-all border relative
                                    ${isCompleted 
                                        ? 'bg-white/20 border-white/40 text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]' 
                                        : isToday
                                            ? 'bg-white/5 border-indigo-400/50 text-white'
                                            : 'bg-transparent border-white/10 text-white/40 hover:border-white/30'
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <ICONS.Check size={14} strokeWidth={3} className="animate-check-bounce" />
                                ) : (
                                    <span className="text-xs">{day.date}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
      );
  };

  const renderTaskItem = (task: Task) => {
    const isEditing = editingTaskId === task.id;
    const q = task.quantity || 1;
    const val = task.value || 0;
    const totalItemVal = val * q;

    if (isEditing) {
      return (
        <div key={task.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl animate-fade-in z-10 relative mb-3 w-full">
           <div className="flex flex-col gap-2">
              <input 
                autoFocus
                value={editForm.text}
                onChange={e => setEditForm({...editForm, text: e.target.value})}
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400 w-full"
                placeholder={t.nameLabel}
              />
              {showFinancials && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">{currency}</span>
                     <input 
                        type="number"
                        value={editForm.value}
                        onChange={e => setEditForm({...editForm, value: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                        placeholder={t.pricePlaceholder}
                      />
                  </div>
                  <input 
                    type="number"
                    value={editForm.quantity}
                    onChange={e => setEditForm({...editForm, quantity: e.target.value})}
                    className="w-20 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                    placeholder={t.qtyPlaceholder}
                  />
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <button onClick={saveEdit} className="flex-1 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-100 backdrop-blur-md py-1 rounded-lg text-sm transition-all">
                  <ICONS.Save className="inline mr-1" size={14} /> {t.save}
                </button>
                <button onClick={() => setEditingTaskId(null)} className="px-3 bg-white/10 hover:bg-white/20 text-white py-1 rounded-lg text-sm">
                  <ICONS.X size={14} />
                </button>
              </div>
           </div>
        </div>
      );
    }

    return (
        <div 
            key={task.id} 
            className={`
                group flex items-center justify-between p-3 rounded-xl border transition-all duration-300 mb-2 animate-slide-in w-full
                ${task.completed 
                    ? 'bg-black/20 border-transparent opacity-60' 
                    : 'bg-white/10 border-white/10 hover:bg-white/15'
                }
            `}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button 
                    onClick={() => handleToggleTask(task.id)}
                    className={`
                        flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-300 relative overflow-hidden
                        ${task.completed 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-white/30 hover:border-white/60 hover:bg-white/5'
                        }
                    `}
                >
                    {task.completed && (
                        <ICONS.Check 
                            size={14} 
                            className="animate-check-bounce" 
                            strokeWidth={3}
                        />
                    )}
                </button>
                <div className="flex flex-col truncate">
                  <span 
                    className={`truncate transition-all duration-300 ${task.completed ? 'line-through text-white/40' : 'text-white/90'}`}
                  >
                      {task.text}
                  </span>
                  {showFinancials && (task.value !== undefined || q > 1) && (
                    <span className="text-xs text-white/50">
                      {q > 1 && <span className="text-indigo-300 font-mono">x{q} </span>}
                      {task.value !== undefined && <span>{task.value} {currency}/шт</span>}
                    </span>
                  )}
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 pl-2">
                 {showFinancials && task.value !== undefined && (
                    <span className={`text-sm font-mono whitespace-nowrap transition-colors ${task.completed ? 'text-white/30' : 'text-emerald-300'}`}>
                        {totalItemVal} {currency}
                    </span>
                 )}
                
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                      onClick={() => startEditing(task)}
                      className="text-white/60 hover:text-white p-2"
                  >
                      <ICONS.Edit2 size={16} />
                  </button>
                  <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-rose-400 hover:text-rose-300 p-2"
                  >
                      <ICONS.Trash2 size={16} />
                  </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 z-20 relative flex-shrink-0 w-full">
        <button 
          onClick={onBack}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
        >
          <ICONS.ArrowLeft />
        </button>
        <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold truncate max-w-[150px] md:max-w-md">{tracker.title}</h2>
            <span className="text-xs uppercase tracking-widest text-white/50">{tracker.type}</span>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowAiInput(!showAiInput)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg hover:shadow-indigo-500/50 transition-all text-white flex items-center gap-2 font-medium"
                title="AI"
            >
                <ICONS.Wand2 size={18} />
                <span className="hidden sm:inline">Gemini</span>
            </button>
        </div>
      </div>

      {/* AI Box */}
      {showAiInput && (
        <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md z-20 relative flex-shrink-0 animate-fade-in-up w-full">
            <label className="block text-sm text-gray-300 mb-2">
                {isAiLoading ? t.aiThinking : t.aiPrompt}
            </label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={t.aiInputPlaceholder}
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-indigo-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSuggest()}
                    disabled={isAiLoading}
                />
                <button 
                    onClick={handleAiSuggest}
                    disabled={isAiLoading}
                    className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                >
                    <ICONS.Wand2 size={16} />
                </button>
            </div>
        </div>
      )}

      {/* Filter/Sort Toolbar - Visible for List Types AND Habits now */}
      {tracker.type !== TrackerType.NOTE && (
        <div className="flex flex-col md:flex-row gap-2 mb-4 z-20 relative flex-shrink-0 w-full">
            {/* Search Input */}
            <div className="relative flex-1 bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                    <ICONS.Search size={14} />
                </div>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.search}
                    className="w-full bg-transparent border-none rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all h-full"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                    >
                        <ICONS.X size={12} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-4 md:flex md:w-auto gap-2 flex-shrink-0 bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
                 
                 {/* Collapse/Expand All Button - ONLY FOR HABITS */}
                 {tracker.type === TrackerType.HABIT && (
                     <button
                        onClick={toggleAllHabits}
                        className={`
                            flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm transition-all w-full h-full
                            ${areAllActiveExpanded ? 'bg-white/20 text-white' : 'bg-transparent hover:bg-white/10 text-white/70'}
                        `}
                        title={areAllActiveExpanded ? t.collapseAll : t.expandAll}
                     >
                         {areAllActiveExpanded ? <ICONS.ChevronsUp size={16} /> : <ICONS.ChevronsDown size={16} />}
                     </button>
                 )}
                 
                 {/* Sort Dropdown */}
                 <div className="relative" ref={sortRef}>
                    <button 
                        onClick={() => setIsSortOpen(!isSortOpen)}
                        className={`
                            flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm transition-all w-full h-full
                            ${isSortOpen ? 'bg-white/20 text-white' : 'bg-transparent hover:bg-white/10 text-white/70'}
                        `}
                    >
                        <ICONS.Filter size={14} />
                        <span className="hidden md:inline">{t.sort}</span>
                        {sortBy === 'name' && <ICONS.ArrowDownAZ size={12} />}
                        {sortBy === 'value' && <ICONS.DollarSign size={12} />}
                        {sortBy === 'created' && <ICONS.Calendar size={12} />}
                    </button>
                    
                    {isSortOpen && (
                        <div 
                            className="absolute top-full left-0 mt-2 w-48 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up"
                            style={{ background: themeColor }}
                        >
                            <div className="bg-black/40 backdrop-blur-md">
                                <button 
                                    onClick={() => { setSortBy('created'); setIsSortOpen(false); }} 
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-white/10 transition-colors ${sortBy === 'created' ? 'text-white font-bold bg-white/10' : 'text-white/80'}`}
                                >
                                    {t.sortTime}
                                    {sortBy === 'created' && <ICONS.Check size={14} />}
                                </button>
                                <button 
                                    onClick={() => { setSortBy('name'); setIsSortOpen(false); }} 
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-white/10 transition-colors ${sortBy === 'name' ? 'text-white font-bold bg-white/10' : 'text-white/80'}`}
                                >
                                    {t.sortName}
                                    {sortBy === 'name' && <ICONS.Check size={14} />}
                                </button>
                                {showFinancials && (
                                    <button 
                                        onClick={() => { setSortBy('value'); setIsSortOpen(false); }} 
                                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-white/10 transition-colors ${sortBy === 'value' ? 'text-white font-bold bg-white/10' : 'text-white/80'}`}
                                    >
                                        {t.sortValue}
                                        {sortBy === 'value' && <ICONS.Check size={14} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                 </div>

                 {/* Hide Completed Toggle */}
                 <button 
                    onClick={() => setHideCompleted(!hideCompleted)}
                    className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm transition-colors w-full h-full ${hideCompleted ? 'bg-indigo-600/50 text-white' : 'bg-transparent hover:bg-white/10 text-white/70'}`}
                    title={hideCompleted ? t.showCompleted : t.hideCompleted}
                 >
                    {hideCompleted ? <ICONS.EyeOff size={14} /> : <ICONS.Eye size={14} />}
                 </button>

                 {/* Bulk Actions Menu */}
                 <div className="relative" ref={menuRef}>
                     <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`flex items-center justify-center p-1.5 rounded-lg transition-colors h-full w-full ${isMenuOpen ? 'bg-white/20' : 'bg-transparent hover:bg-white/10 text-white/70'}`}
                     >
                         <ICONS.MoreVertical size={16} />
                     </button>
                     {isMenuOpen && (
                         <div 
                             className="absolute top-full right-0 mt-2 w-48 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up"
                             style={{ background: themeColor }}
                         >
                             <div className="bg-black/40 backdrop-blur-md p-1">
                                 <button
                                    onClick={promptClearCompleted}
                                    disabled={tracker.tasks.every(t => !t.completed)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 hover:bg-white/10 text-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                 >
                                     <ICONS.CheckSquare size={14} />
                                     Clear Completed
                                 </button>
                                 <div className="h-px bg-white/10 my-1" />
                                 <button
                                    onClick={promptDeleteAll}
                                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 hover:bg-rose-500/20 text-rose-300 transition-colors"
                                 >
                                     <ICONS.Trash2 size={14} />
                                     Delete All Tasks
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
            </div>
        </div>
      )}

      {/* Content Area - REMOVED pr-2 to fix alignment width */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-0 min-h-0 w-full">
        {tracker.type === TrackerType.NOTE ? (
            <textarea 
                className="w-full h-full min-h-[400px] bg-white/5 rounded-xl p-4 text-white focus:outline-none focus:bg-white/10 transition-colors resize-none"
                value={tracker.noteContent || ''}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder={t.notePlaceholder}
            />
        ) : tracker.type === TrackerType.HABIT ? (
            <>
                 {activeTasks.length === 0 && completedTasks.length === 0 && (
                     <div className="text-center py-20 text-white/30">
                         <div className="inline-block p-4 rounded-full bg-white/5 mb-4">
                             <ICONS.Activity size={32} />
                         </div>
                         <p>{t.emptyList}</p>
                     </div>
                 )}
                 {/* Active Habits */}
                 {activeTasks.map(renderHabitItem)}

                 {/* Completed/Archived Habits */}
                 {completedTasks.length > 0 && !hideCompleted && (
                    <div className="mt-6 animate-fade-in">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <div className="h-px bg-white/10 flex-1" />
                            <span className="text-xs font-medium uppercase tracking-widest text-white/40">
                                Completed Habits ({completedTasks.length})
                            </span>
                            <div className="h-px bg-white/10 flex-1" />
                        </div>
                        <div className="space-y-2 opacity-80">
                            {completedTasks.map(renderHabitItem)}
                        </div>
                    </div>
                )}
                 <div ref={scrollRef} className="h-4" />
            </>
        ) : (
            <>
                {activeTasks.length === 0 && completedTasks.length === 0 && (
                    <div className="text-center py-20 text-white/30">
                        <div className="inline-block p-4 rounded-full bg-white/5 mb-4">
                            {searchQuery ? <ICONS.Search size={32} /> : <ICONS.FileText size={32} />}
                        </div>
                        <p>{searchQuery ? 'Ничего не найдено' : t.emptyList}</p>
                    </div>
                )}
                
                {/* Active Tasks Group */}
                {activeTasks.map(renderTaskItem)}

                {/* Completed Tasks Group */}
                {completedTasks.length > 0 && !hideCompleted && (
                    <div className="mt-6 animate-fade-in">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <div className="h-px bg-white/10 flex-1" />
                            <span className="text-xs font-medium uppercase tracking-widest text-white/40">
                                Completed ({completedTasks.length})
                            </span>
                            <div className="h-px bg-white/10 flex-1" />
                        </div>
                        <div className="space-y-2 opacity-80">
                            {completedTasks.map(renderTaskItem)}
                        </div>
                    </div>
                )}
                
                <div ref={scrollRef} className="h-4" />
            </>
        )}
      </div>

      {/* Footer / Input Area */}
      {tracker.type !== TrackerType.NOTE && (
        <div className="pt-4 mt-2 border-t border-white/10 z-20 relative flex-shrink-0 w-full">
            {showFinancials && (
                 <div className="flex justify-between items-end text-sm text-white/50 mb-3 px-2">
                    <span>{t.totalItems} {activeTasks.length + completedTasks.length}</span>
                    <div className="text-right">
                        <span className="text-xs block mb-1 opacity-70">{t.sum}</span>
                        <span className="font-mono text-2xl font-bold text-emerald-300">{totalValue} {currency}</span>
                    </div>
                 </div>
            )}
            
            <form onSubmit={handleAddTask} className={showFinancials ? "flex flex-col gap-3" : "flex gap-2"}>
                <div className="flex gap-2 w-full">
                    <input 
                        type="text" 
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        placeholder={tracker.type === TrackerType.HABIT ? "Новая привычка..." : t.newTaskPlaceholder}
                        className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 h-12 text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 focus:bg-white/10 transition-all w-full"
                    />
                     {!showFinancials && (
                        <button 
                            type="submit"
                            disabled={!newTaskText.trim()}
                            className="bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500/30 text-indigo-100 h-12 w-12 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                        >
                            <ICONS.Plus size={20} />
                        </button>
                    )}
                </div>
                
                {showFinancials && (
                  <div className="flex gap-2 w-full items-center">
                        <div className="relative flex-1 min-w-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-bold">{currency}</span>
                            <input 
                                type="number" 
                                value={newTaskValue}
                                onChange={(e) => setNewTaskValue(e.target.value)}
                                placeholder={t.pricePlaceholder}
                                className="w-full bg-white/5 border border-white/20 rounded-xl pl-8 pr-3 h-12 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 focus:bg-white/10 transition-all"
                            />
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center bg-white/5 border border-white/20 rounded-xl overflow-hidden h-12 shrink-0">
                            <button 
                                type="button" 
                                onClick={decrementQty}
                                className="w-10 h-full flex items-center justify-center hover:bg-white/10 text-white/70 active:bg-white/20 transition-colors"
                            >
                                <ICONS.Minus size={16} /> 
                            </button>
                            <input 
                                type="number" 
                                value={newTaskQuantity}
                                onChange={(e) => setNewTaskQuantity(e.target.value)}
                                className="w-10 text-center bg-transparent text-white border-none focus:outline-none appearance-none m-0 font-medium"
                            />
                             <button 
                                type="button" 
                                onClick={incrementQty}
                                className="w-10 h-full flex items-center justify-center hover:bg-white/10 text-white/70 active:bg-white/20 transition-colors"
                            >
                                <ICONS.Plus size={16} />
                            </button>
                        </div>

                        <button 
                            type="submit"
                            disabled={!newTaskText.trim()}
                            className="bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500/30 text-indigo-100 h-12 w-12 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                        >
                            <ICONS.Plus size={20} />
                        </button>
                  </div>
                )}
            </form>
        </div>
      )}

      {/* Confirmation Dialog for Bulk Actions */}
      <ConfirmDialog 
         isOpen={!!confirmAction}
         title={confirmAction?.type === 'DELETE_ALL' ? 'Delete All' : 'Clear Completed'}
         message={confirmAction?.type === 'DELETE_ALL' ? 'This will permanently remove all tasks in this tracker.' : 'This will remove all completed tasks.'}
         confirmText="Confirm"
         isDangerous={true}
         onConfirm={() => confirmAction?.callback()}
         onCancel={() => setConfirmAction(null)}
         language={language}
         themeColor={themeColor}
      />
    </div>
  );
};

export default TrackerDetail;