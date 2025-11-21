import { GeneratedGame } from "../types";

// --- AUDIO UTILS (Web Audio API) ---
export const playSound = (type: 'correct' | 'incorrect' | 'select' | 'win' | 'bonus') => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'correct') {
        // Ding! (High sine wave fade out)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'incorrect') {
        // Buzz! (Sawtooth drop)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'select') {
        // Pop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'win') {
        // Victory Fanfareish
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.1); 
        osc.frequency.setValueAtTime(659, now + 0.2);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
    } else if (type === 'bonus') {
        // Magic Chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.6);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 1);
        osc.start(now);
        osc.stop(now + 1);
    }
};

// --- LOCAL STORAGE UTILS ---
export const saveGameToLibrary = (game: GeneratedGame): boolean => {
    try {
        const existing = localStorage.getItem('teachersRoomGames');
        const library = existing ? JSON.parse(existing) : [];
        // Update if exists, else add
        const index = library.findIndex((g: GeneratedGame) => g.id === game.id);
        if (index >= 0) {
            library[index] = game;
        } else {
            library.push(game);
        }
        localStorage.setItem('teachersRoomGames', JSON.stringify(library));
        return true;
    } catch (e) {
        console.error("Save failed", e);
        return false;
    }
};

export const getSavedGames = (): GeneratedGame[] => {
    try {
        const existing = localStorage.getItem('teachersRoomGames');
        return existing ? JSON.parse(existing) : [];
    } catch (e) {
        return [];
    }
};

export const deleteSavedGame = (id: string) => {
    try {
        const existing = localStorage.getItem('teachersRoomGames');
        if (existing) {
            const library = JSON.parse(existing).filter((g: GeneratedGame) => g.id !== id);
            localStorage.setItem('teachersRoomGames', JSON.stringify(library));
        }
    } catch(e) {
        console.error(e);
    }
};