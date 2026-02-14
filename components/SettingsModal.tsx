import React, { useRef, useState } from 'react';
import { ICONS, APP_THEMES, BG_PATTERNS, TRANSLATIONS } from '../constants';
import { AppSettings, Tracker } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdate: (newSettings: AppSettings) => void;
  onImportData: (data: { trackers?: Tracker[], settings?: AppSettings }) => void;
  onClose: () => void;
  themeBackground: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onImportData, onClose, themeBackground }) => {
  const t = TRANSLATIONS[settings.language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for import flow
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<'none' | 'success' | 'error'>('none');

  const handleExport = () => {
    try {
      const trackers = localStorage.getItem('glass-trackers');
      const appSettings = localStorage.getItem('glass-settings');
      
      const backupData = {
        trackers: trackers ? JSON.parse(trackers) : [],
        settings: appSettings ? JSON.parse(appSettings) : {}
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `fantrack_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Stage the file for confirmation
    setPendingImportFile(file);
    
    // Clear input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImport = () => {
    if (!pendingImportFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result);
        
        // Use the callback from App to update state directly (Soft Reload)
        onImportData({
            trackers: parsed.trackers,
            settings: parsed.settings
        });
        
        setImportStatus('success');

      } catch (err) {
        console.error("Import failed", err);
        setImportStatus('error');
      } finally {
        setPendingImportFile(null);
      }
    };
    reader.readAsText(pendingImportFile);
  };

  const closeSuccessModal = () => {
      setImportStatus('none');
      onClose(); // Close the settings modal too, so user sees their new data
  };

  return (
    <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div 
            className="w-full max-w-lg border border-white/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            style={{ background: themeBackground }}
        >
            {/* Decorative BG */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/20 blur-3xl rounded-full pointer-events-none" />
            
            <div className="flex justify-between items-center mb-6 relative z-10">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <ICONS.Settings className="text-indigo-200" /> {t.settings}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ICONS.X size={20} />
            </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                
                {/* Language Section */}
                <section>
                    <h3 className="text-sm text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ICONS.Globe size={14} /> {t.language}
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onUpdate({ ...settings, language: 'ru' })}
                            className={`px-4 py-2 rounded-lg border transition-all ${settings.language === 'ru' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                            Русский
                        </button>
                        <button 
                            onClick={() => onUpdate({ ...settings, language: 'en' })}
                            className={`px-4 py-2 rounded-lg border transition-all ${settings.language === 'en' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                            English
                        </button>
                    </div>
                </section>

                {/* Data Management Section */}
                <section className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <h3 className="text-sm text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ICONS.Database size={14} /> {t.dataManagement}
                    </h3>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleExport}
                            className="flex-1 flex items-center justify-center gap-2 bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500/30 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium backdrop-blur-md"
                        >
                            <ICONS.Download size={16} /> {t.exportData}
                        </button>
                        <button 
                            onClick={handleImportClick}
                            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium backdrop-blur-md"
                        >
                            <ICONS.Upload size={16} /> {t.importData}
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                    </div>
                </section>

                {/* Theme Section */}
                <section>
                    <h3 className="text-sm text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ICONS.Palette size={14} /> {t.theme}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {APP_THEMES.map(theme => (
                            <button
                                key={theme.id}
                                onClick={() => onUpdate({ ...settings, themeId: theme.id })}
                                className={`
                                    relative h-16 rounded-xl border-2 transition-all overflow-hidden
                                    ${settings.themeId === theme.id ? 'border-white scale-105 shadow-lg' : 'border-transparent hover:border-white/30 opacity-70 hover:opacity-100'}
                                `}
                            >
                                <div 
                                    className="absolute inset-0" 
                                    style={{ background: theme.value }} 
                                />
                                <span className="absolute bottom-1 left-2 text-xs font-medium shadow-black drop-shadow-md">
                                    {theme.name}
                                </span>
                                {settings.themeId === theme.id && (
                                    <div className="absolute top-1 right-1 bg-white text-black rounded-full p-0.5">
                                        <ICONS.CheckSquare size={10} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Pattern Section */}
                <section>
                    <h3 className="text-sm text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ICONS.Image size={14} /> {t.pattern}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {BG_PATTERNS.map(pattern => (
                            <button
                                key={pattern.id}
                                onClick={() => onUpdate({ ...settings, patternId: pattern.id })}
                                className={`
                                    relative h-12 rounded-xl border transition-all flex items-center justify-center
                                    ${settings.patternId === pattern.id ? 'bg-white/20 border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}
                                `}
                            >
                                {pattern.id !== 'none' && (
                                    <div 
                                        className="absolute inset-0 opacity-30" 
                                        style={{ backgroundImage: pattern.value }} 
                                    />
                                )}
                                <span className="relative z-10 text-sm">{pattern.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* API Key Section */}
                <section className="bg-black/20 p-4 rounded-xl border border-white/10">
                    <h3 className="text-sm text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <ICONS.Wand2 size={14} /> {t.apiKey}
                    </h3>
                    <p className="text-xs text-white/40 mb-3">
                        {t.apiKeyDesc}
                    </p>
                    <input 
                        type="password"
                        value={settings.userApiKey || ''}
                        onChange={(e) => onUpdate({ ...settings, userApiKey: e.target.value })}
                        placeholder={t.apiKeyPlaceholder}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-indigo-400 focus:bg-white/10 text-sm font-mono"
                    />
                </section>
            </div>
        </div>
        </div>

        {/* Import Confirmation Dialog */}
        <ConfirmDialog 
            isOpen={!!pendingImportFile}
            title={t.importData}
            message={t.importConfirm}
            confirmText="Import"
            isDangerous={true}
            onConfirm={processImport}
            onCancel={() => setPendingImportFile(null)}
            language={settings.language}
            themeColor={themeBackground}
        />

        {/* Success / Error Notification Modal */}
        {importStatus !== 'none' && (
             <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                 <div 
                    className="border border-white/20 rounded-2xl p-8 shadow-2xl flex flex-col items-center animate-scale-in max-w-sm w-full relative overflow-hidden"
                    style={{ background: themeBackground }}
                 >
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none" />
                     
                     <div className={`p-4 rounded-full mb-4 relative z-10 ${importStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                         {importStatus === 'success' ? <ICONS.Check size={32} /> : <ICONS.X size={32} />}
                     </div>
                     <h3 className="text-xl font-bold mb-2 relative z-10 text-white">
                         {importStatus === 'success' ? 'Import Successful!' : 'Import Failed'}
                     </h3>
                     <p className="text-white/60 mb-6 text-center relative z-10">
                         {importStatus === 'success' ? 'Data loaded successfully.' : 'Please check your file format.'}
                     </p>
                     
                     <div className="w-full relative z-10">
                        {importStatus === 'success' ? (
                            <button 
                                onClick={closeSuccessModal} 
                                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-[1.02]"
                            >
                                Awesome!
                            </button>
                        ) : (
                             <button 
                                onClick={() => setImportStatus('none')} 
                                className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                             >
                                 Close
                             </button>
                        )}
                     </div>
                 </div>
             </div>
        )}
    </>
  );
};

export default SettingsModal;