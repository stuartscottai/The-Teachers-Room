import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getSiteTheme } from '../utils/theme';

interface UnsavedChangesContextType {
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
  gameAppearance: 'dark' | 'light';
  setGameAppearance: (value: 'dark' | 'light') => void;
  confirmAction: (message: string, action: () => void, title?: string) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export const UnsavedChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDirty, setIsDirty] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameAppearance, setGameAppearance] = useState<'dark' | 'light'>(() => getSiteTheme());

  useEffect(() => {
    if (!isPlaying) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isPlaying]);
  
  // Custom Confirmation Modal State
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    message: string;
    title: string;
    action: (() => void) | null;
  }>({ isOpen: false, message: '', title: 'Unsaved Changes', action: null });

  const confirmAction = useCallback((message: string, action: () => void, title = 'Unsaved Changes') => {
    // If not dirty, just do it immediately (though usually caller checks dirty first)
    // But typically this function is called specifically when dirty check passes in component.
    // However, to be safe, if the caller invokes this, we assume they want the dialog.
    setConfirmationState({ isOpen: true, message, title, action });
  }, []);

  const handleConfirm = () => {
    if (confirmationState.action) {
        confirmationState.action();
    }
    setConfirmationState({ isOpen: false, message: '', title: 'Unsaved Changes', action: null });
    // We assume the action navigates away or resets state, so we clear dirty here to be safe
    // But often the component unmounts anyway.
    setIsDirty(false); 
  };

  const handleCancel = () => {
    setConfirmationState({ isOpen: false, message: '', title: 'Unsaved Changes', action: null });
  };

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setIsDirty, isPlaying, setIsPlaying, gameAppearance, setGameAppearance, confirmAction }}>
      {children}

      {/* Global Confirmation Modal */}
      {confirmationState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center transform transition-all scale-100">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmationState.title}</h3>
                <p className="text-slate-600 mb-8">{confirmationState.message}</p>
                <div className="flex gap-3">
                    <button 
                        onClick={handleCancel}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-md"
                    >
                        Leave
                    </button>
                </div>
            </div>
        </div>
      )}
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChanges = () => {
  const context = useContext(UnsavedChangesContext);
  if (context === undefined) {
    throw new Error('useUnsavedChanges must be used within an UnsavedChangesProvider');
  }
  return context;
};
