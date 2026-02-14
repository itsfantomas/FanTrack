import React from 'react';
import { ICONS, TRANSLATIONS } from '../constants';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  language: 'ru' | 'en';
  themeColor?: string; // New prop for dynamic styling
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  isDangerous = false,
  language,
  themeColor
}) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[language];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-sm border border-white/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-scale-in"
        style={{ background: themeColor || '#1e1b4b' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-white/70 mb-6 text-sm leading-relaxed">{message}</p>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors text-sm font-medium border border-transparent hover:border-white/10"
            >
              {cancelText || t.cancel}
            </button>
            <button
              onClick={onConfirm}
              className={`
                flex-1 py-2.5 rounded-xl text-white shadow-lg transition-all text-sm font-medium flex items-center justify-center gap-2
                ${isDangerous 
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-500/20' 
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 shadow-indigo-500/20'
                }
              `}
            >
              {isDangerous && <ICONS.Trash2 size={16} />}
              {confirmText || 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;