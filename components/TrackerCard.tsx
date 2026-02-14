import React from 'react';
import { Tracker, TrackerType } from '../types';
import { ICONS, TRANSLATIONS } from '../constants';

interface TrackerCardProps {
  tracker: Tracker;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  language: 'ru' | 'en';
}

const TrackerCard: React.FC<TrackerCardProps> = ({ tracker, onClick, onDelete, language }) => {
  const Icon = ICONS[tracker.icon as keyof typeof ICONS] || ICONS.FileText;
  const t = TRANSLATIONS[language];

  // Calculate progress
  const completed = tracker.tasks.filter(t => t.completed).length;
  const total = tracker.tasks.length;
  const progress = total === 0 ? 0 : (completed / total) * 100;

  const handleDeleteClick = (e: React.MouseEvent) => {
    // Critical: Stop propagation immediately and strictly
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onDelete(e);
  };

  return (
    <div 
      onClick={onClick}
      className={`
        relative group cursor-pointer overflow-hidden rounded-2xl p-6
        bg-white/5 backdrop-blur-md border border-white/10
        hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-xl
        transition-all duration-300
      `}
    >
      {/* Decorative BG - pointer-events-none is crucial here to not block clicks */}
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${tracker.color} opacity-20 blur-2xl -mr-6 -mt-6 rounded-full transition-opacity group-hover:opacity-30 pointer-events-none`} />
      
      <div className="relative flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${tracker.color} text-white shadow-lg`}>
          <Icon size={24} />
        </div>
        
        {/* Delete Button with strict event stopping and high z-index */}
        <div 
            className="relative z-50 isolate" 
            onClick={(e) => e.stopPropagation()} 
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button 
                onClick={handleDeleteClick}
                className="p-2 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-all active:scale-95"
                title="Delete"
            >
                <ICONS.Trash2 size={18} />
            </button>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-1 truncate">{tracker.title}</h3>
      <p className="text-xs text-white/50 uppercase tracking-wider mb-4">{tracker.type}</p>

      {tracker.type !== TrackerType.NOTE && (
        <div>
            <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>{t.progress}</span>
                <span>{completed}/{total}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                    className={`h-full bg-gradient-to-r ${tracker.color} transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
      )}

      {tracker.type === TrackerType.NOTE && (
        <div className="text-sm text-white/40 line-clamp-2 min-h-[1.5rem]">
            {tracker.noteContent || t.noNotes}
        </div>
      )}
    </div>
  );
};

export default TrackerCard;