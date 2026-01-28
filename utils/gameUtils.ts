
import { GameType, GeneratedGame, GeneratedWorksheet, UploadedFile } from "../types";
import { supabase } from "../services/supabase";
import { deleteWorksheetAssetFolder } from "./worksheetAssetStorage";

// --- ASSET HELPERS ---
export const resolvePath = (path: string) => {
    // If path is external (http/https), return as is
    if (path.startsWith('http')) return path;
    
    // Fix: Cast import.meta to any to avoid Property 'env' does not exist on type 'ImportMeta' error if types are missing
    // Get base URL from Vite env (defaults to /)
    const base = (import.meta as any).env?.BASE_URL || '/';
    
    // Clean path (remove leading slash)
    const relativePath = path.startsWith('/') ? path.slice(1) : path;
    
    // Clean base (ensure trailing slash)
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    
    return `${cleanBase}${relativePath}`;
};

// --- FILE HELPERS ---
export const processFile = (file: File): Promise<UploadedFile> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Strip the data:image/png;base64, prefix to get raw base64
            const data = result.split(',')[1]; 
            resolve({
                name: file.name,
                mimeType: file.type,
                data: data
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- AUDIO UTILS (Web Audio API) ---
// Singleton AudioContext to prevent "Max AudioContexts" error
let audioCtx: AudioContext | null = null;

const getAudioCtx = () => {
    if (!audioCtx) {
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (CtxClass) {
            audioCtx = new CtxClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

export const SOUND_VARIANTS = {
    correct: ['Modern', 'Retro', 'Chime', 'Piano', 'LevelUp', 'Magic', 'Sparkle', 'Confirm'],
    incorrect: ['Modern', 'Retro', 'Dull', 'Buzz', 'WompWomp', 'Error', 'Clank', 'Glitch'],
    select: ['Pop', 'Click', 'Blip', 'Bubble', 'Tap', 'Wood', 'SciFi', 'Drop'],
    win: ['Fanfare', 'Synth', 'Applause', 'Orchestral', 'Rock', 'Cosmic', 'Party', 'Success'],
    bonus: ['Magic', 'PowerUp', 'Sparkle', 'Coin', 'Warp', 'Secret', 'Energy', 'Heal'],
    timesUp: ['Gong', 'Alarm', 'Whistle', 'ClockEnd', 'Siren', 'Explosion', 'Fade', 'BuzzerLong']
};

export const playSound = (type: 'correct' | 'incorrect' | 'select' | 'win' | 'bonus' | 'times-up' | 'dart-hit', muted: boolean = false, variant: string = '') => {
    if (muted) return;
    
    const ctx = getAudioCtx();
    if (!ctx) return;
    
    const now = ctx.currentTime;
    
    // --- SYNTHESIS HELPERS ---

    // Play a basic tone with envelope
    const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol: number = 0.1, slideTo?: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, startTime + duration);
        }
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.02); // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Decay
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
    };

    // Play a Chord (Polyphony)
    const playChord = (freqs: number[], type: OscillatorType, startTime: number, duration: number, vol: number = 0.1, stagger: number = 0) => {
        freqs.forEach((f, i) => {
            playTone(f, type, startTime + (i * stagger), duration, vol);
        });
    };

    // Generate Noise (White/Pinkish)
    const playNoise = (startTime: number, duration: number, vol: number = 0.2, filterFreq: number = 1000) => {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(vol, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        noise.start(startTime);
    };

    // --- SOUND DEFINITIONS ---

    // 0. REALISTIC DART THUD
    if (type === 'dart-hit') {
        // Short, low frequency impact thud
        playNoise(now, 0.05, 0.8, 600); // Thwack
        playTone(80, 'square', now, 0.1, 0.3); // Low body resonance
        playTone(150, 'triangle', now, 0.05, 0.2); // Higher knock
    }

    // 1. CORRECT
    else if (type === 'correct') {
        const v = variant || 'Modern';
        if (v === 'Retro') {
            playTone(987.77, 'square', now, 0.1, 0.1); // B5
            playTone(1318.51, 'square', now + 0.1, 0.3, 0.1); // E6
        } else if (v === 'Chime') {
            playChord([523.25, 659.25, 783.99, 1046.50], 'sine', now, 0.8, 0.05, 0.05);
        } else if (v === 'Piano') {
            playChord([523.25, 659.25, 783.99], 'triangle', now, 0.6, 0.1, 0);
        } else if (v === 'LevelUp') {
            playTone(440, 'square', now, 0.1, 0.1);
            playTone(554, 'square', now+0.1, 0.1, 0.1);
            playTone(659, 'square', now+0.2, 0.1, 0.1);
            playTone(880, 'square', now+0.3, 0.4, 0.1);
        } else if (v === 'Magic') {
            playChord([880, 1108, 1318, 1760], 'sine', now, 1.0, 0.05, 0.05);
        } else if (v === 'Sparkle') {
            for(let i=0; i<8; i++) playTone(1000 + (i*200), 'sine', now + (i*0.03), 0.2, 0.05);
        } else if (v === 'Confirm') {
            playTone(800, 'sine', now, 0.1, 0.1);
            playTone(1200, 'sine', now+0.05, 0.2, 0.1);
        } else {
            // Modern (Major Triad Arpeggio)
            playTone(523.25, 'sine', now, 0.4, 0.2);       // C5
            playTone(659.25, 'sine', now + 0.05, 0.4, 0.2); // E5
            playTone(783.99, 'triangle', now + 0.1, 0.6, 0.15); // G5
            playTone(1046.50, 'sine', now + 0.15, 0.8, 0.1); // C6
        }
    } 
    // 2. INCORRECT
    else if (type === 'incorrect') {
        const v = variant || 'Modern';
        if (v === 'Retro') {
            playTone(150, 'sawtooth', now, 0.4, 0.1, 50);
        } else if (v === 'Dull') {
             playNoise(now, 0.2, 0.3, 400);
             playTone(60, 'triangle', now, 0.2, 0.3);
        } else if (v === 'Buzz') {
            playTone(100, 'sawtooth', now, 0.5, 0.2);
        } else if (v === 'WompWomp') {
            playTone(400, 'triangle', now, 0.3, 0.2, 300);
            playTone(300, 'triangle', now+0.3, 0.6, 0.2, 100);
        } else if (v === 'Error') {
             playTone(200, 'square', now, 0.1, 0.1);
             playTone(200, 'square', now+0.15, 0.3, 0.1);
        } else if (v === 'Clank') {
             playNoise(now, 0.1, 0.4, 2000);
             playTone(300, 'square', now, 0.05, 0.2);
        } else if (v === 'Glitch') {
            playTone(500, 'sawtooth', now, 0.05, 0.1);
            playTone(200, 'square', now+0.05, 0.05, 0.1);
            playTone(800, 'sawtooth', now+0.1, 0.05, 0.1);
        } else {
            // Modern (Buzz)
            playTone(150, 'sawtooth', now, 0.4, 0.3);
            playTone(142, 'sawtooth', now, 0.4, 0.3); // Clash
        }
    } 
    // 3. SELECT
    else if (type === 'select') {
        const v = variant || 'Pop';
        if (v === 'Click') {
            playNoise(now, 0.05, 0.1, 3000);
        } else if (v === 'Blip') {
             playTone(1200, 'square', now, 0.05, 0.05);
        } else if (v === 'Bubble') {
            playTone(400, 'sine', now, 0.1, 0.1, 800);
        } else if (v === 'Tap') {
            playNoise(now, 0.02, 0.2, 800);
        } else if (v === 'Wood') {
            playTone(300, 'sine', now, 0.05, 0.2);
            playNoise(now, 0.05, 0.1, 500);
        } else if (v === 'SciFi') {
            playTone(2000, 'sine', now, 0.1, 0.05, 500);
        } else if (v === 'Drop') {
             playTone(1000, 'sine', now, 0.2, 0.1, 200);
        } else {
            // Pop (Standard)
            playTone(600, 'sine', now, 0.1, 0.05);
        }
    } 
    // 4. WIN
    else if (type === 'win') {
        const v = variant || 'Fanfare';
        const start = now;
        if (v === 'Synth') {
            // 80s Arp
             [523, 659, 783, 1046, 783, 659, 523, 1046].forEach((f, i) => {
                 playTone(f, 'sawtooth', start + (i * 0.1), 0.2, 0.1);
             });
        } else if (v === 'Applause') {
             playNoise(start, 3.0, 0.5, 1200);
             // Whistles
             playTone(1500, 'sine', start + 1, 0.5, 0.1, 2000);
             playTone(1800, 'sine', start + 2, 0.5, 0.1, 1500);
        } else if (v === 'Orchestral') {
             playChord([261, 329, 392], 'sawtooth', start, 0.2, 0.2);
             playChord([392, 493, 587], 'sawtooth', start+0.2, 0.2, 0.2);
             playChord([523, 659, 783, 1046], 'sawtooth', start+0.4, 1.5, 0.3);
        } else if (v === 'Rock') {
             playTone(130, 'square', start, 0.2, 0.3);
             playTone(130, 'square', start+0.2, 0.2, 0.3);
             playChord([130, 196, 261], 'square', start+0.4, 2.0, 0.4);
        } else if (v === 'Cosmic') {
             playTone(400, 'sine', start, 3.0, 0.2, 1200);
             playTone(600, 'sine', start, 3.0, 0.2, 200);
             for(let i=0; i<10; i++) playTone(1000 + i*200, 'triangle', start + i*0.2, 0.5, 0.05);
        } else if (v === 'Party') {
             playNoise(start, 0.2, 0.3);
             playNoise(start+0.2, 0.2, 0.3);
             playTone(400, 'square', start, 0.5, 0.2, 800);
             playTone(600, 'square', start+0.25, 0.5, 0.2, 1000);
        } else if (v === 'Success') {
             playChord([523, 659, 783], 'sine', start, 0.1, 0.2);
             playChord([659, 783, 1046], 'sine', start+0.1, 0.1, 0.2);
             playChord([783, 1046, 1318], 'sine', start+0.2, 0.6, 0.2);
        } else {
            // Victory Fanfare
            playTone(523.25, 'triangle', start, 0.2, 0.2); // C
            playTone(523.25, 'triangle', start + 0.15, 0.2, 0.2); // C
            playTone(523.25, 'triangle', start + 0.3, 0.2, 0.2); // C
            playTone(659.25, 'triangle', start + 0.45, 0.6, 0.2); // E (Long)
            playTone(783.99, 'sine', start + 0.45, 0.6, 0.1); // G (Harmonic)
        }
    } 
    // 5. BONUS
    else if (type === 'bonus') {
        const v = variant || 'Magic';
        if (v === 'PowerUp') {
            playTone(220, 'square', now, 0.4, 0.2, 880);
        } else if (v === 'Sparkle') {
             for(let i=0; i<15; i++) {
                 playTone(1500 + (Math.random()*1500), 'sine', now + (i*0.04), 0.1, 0.1);
             }
        } else if (v === 'Coin') {
             playTone(988, 'square', now, 0.1, 0.1);
             playTone(1319, 'square', now+0.1, 0.3, 0.1);
        } else if (v === 'Warp') {
             playTone(200, 'sine', now, 0.5, 0.2, 2000);
        } else if (v === 'Secret') {
             playChord([523, 622, 783, 932], 'sine', now, 1.0, 0.1, 0.1); // Diminished-ish
        } else if (v === 'Energy') {
             playTone(100, 'sawtooth', now, 0.5, 0.2, 1000);
        } else if (v === 'Heal') {
             playChord([440, 554, 659], 'sine', now, 0.6, 0.1, 0.1);
        } else {
            // Magical Chime Upwards
            playTone(440, 'sine', now, 0.5, 0.1);
            playTone(554, 'sine', now + 0.05, 0.5, 0.1);
            playTone(659, 'sine', now + 0.10, 0.5, 0.1);
            playTone(880, 'sine', now + 0.15, 0.8, 0.1);
            playTone(1108, 'sine', now + 0.20, 1.0, 0.05);
        }
    } 
    // 6. TIMES UP
    else if (type === 'times-up') {
        const v = variant || 'Gong';
        if (v === 'Alarm') {
             playTone(800, 'square', now, 0.1, 0.2);
             playTone(800, 'square', now+0.2, 0.1, 0.2);
             playTone(800, 'square', now+0.4, 0.1, 0.2);
             playTone(800, 'square', now+0.6, 0.3, 0.2);
        } else if (v === 'Whistle') {
            playTone(1200, 'sine', now, 0.4, 0.3, 800);
        } else if (v === 'ClockEnd') {
             playNoise(now, 0.05, 0.5);
             playNoise(now+0.5, 0.05, 0.5);
             playNoise(now+1.0, 0.05, 0.5);
             playTone(200, 'square', now+1.5, 1.0, 0.3);
        } else if (v === 'Siren') {
             playTone(600, 'sawtooth', now, 1.5, 0.2, 900);
        } else if (v === 'Explosion') {
             playNoise(now, 1.5, 0.8, 100);
        } else if (v === 'Fade') {
             playTone(400, 'triangle', now, 1.0, 0.3, 50);
        } else if (v === 'BuzzerLong') {
             playTone(100, 'sawtooth', now, 1.5, 0.4);
        } else {
            // Gong / Crash
            playTone(800, 'square', now, 0.1, 0.2);
            playTone(800, 'square', now + 0.1, 0.1, 0.2);
            playTone(100, 'sawtooth', now + 0.3, 1.5, 0.4); 
            playTone(150, 'triangle', now + 0.3, 1.5, 0.2);
        }
    }
};

// --- DATA ACCESS LAYER ---

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Helper to retrieve local games (Guest Mode)
export const getLocalGames = (): GeneratedGame[] => {
    try {
        const existing = localStorage.getItem('teachersRoomGames');
        return existing ? JSON.parse(existing) : [];
    } catch (e) {
        console.error("Local Storage Error:", e);
        return [];
    }
};

export const saveGameToLibrary = async (game: GeneratedGame, userId?: string, authorName?: string): Promise<{ success: boolean; id?: string }> => {
    if (!userId) {
        // Local Storage for guests - PRIVATE ONLY
        try {
            const existing = localStorage.getItem('teachersRoomGames');
            const library = existing ? JSON.parse(existing) : [];
            const index = library.findIndex((g: GeneratedGame) => g.id === game.id);
            // Ensure guest games are never accidentally marked public locally to avoid UI confusion
            const safeGame = { ...game, config: { ...game.config, isPublic: false } };
            
            if (index >= 0) {
                library[index] = safeGame;
            } else {
                library.push(safeGame);
            }
            localStorage.setItem('teachersRoomGames', JSON.stringify(library));
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false };
        }
    }

    try {
        const extractId = (data: any) => {
            if (!data) return undefined;
            if (Array.isArray(data)) return data[0]?.id;
            return data.id;
        };
        const stopTheFireCategories =
            game.config.type === GameType.STOP_THE_FIRE
                ? (game.stopTheFireCategories || []).map((cat) => cat.trim()).filter(Boolean)
                : [];
        const configWithBank =
            stopTheFireCategories.length > 0
                ? { ...game.config, stopTheFireCategories }
                : game.config;
        // Prepare payload with top-level is_public column
        const payload: any = {
            user_id: userId,
            title: game.title,
            config: configWithBank,
            questions: game.questions,
            jeopardy_board: game.jeopardyBoard,
            pub_quiz_rounds: game.pubQuizRounds,
            is_public: game.config.isPublic || false, // Use new column
            author_name: authorName || 'Teacher', // New Column
            created_at: new Date()
        };

        if (game.id && isUUID(game.id)) {
            payload.id = game.id;
            const { data, error } = await supabase.from('saved_games').upsert(payload).select('id');
            if (error) throw error;
            return { success: true, id: extractId(data) || game.id };
        } else {
            if (game.id && isUUID(game.id)) {
                 payload.id = game.id;
            }
            const { data, error } = await supabase.from('saved_games').insert(payload).select('id');
            if (error) throw error;
            return { success: true, id: extractId(data) };
        }
    } catch (e) {
        console.error("Supabase Save Error:", e);
        return { success: false };
    }
};

export const getSavedGames = async (userId?: string): Promise<GeneratedGame[]> => {
    if (!userId) {
        return getLocalGames();
    }

    try {
        const { data, error } = await supabase
            .from('saved_games')
            .select('*')
            .eq('user_id', userId) 
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data.map((d: any) => ({
            id: d.id,
            title: d.title,
            authorId: d.user_id,
            authorName: d.author_name,
            authorAvatar: d.author_avatar || d.config?.authorAvatar,
            // Sync isPublic from column to config object for consistency
            config: { ...d.config, isPublic: d.is_public },
            questions: d.questions,
            jeopardyBoard: d.jeopardy_board,
            pubQuizRounds: d.pub_quiz_rounds,
            stopTheFireCategories: d.stop_the_fire_categories || d.config?.stopTheFireCategories,
            createdAt: d.created_at
        }));
    } catch (e) {
        console.error("Supabase Fetch Error:", e);
        return [];
    }
};

// Fetch Public Community Games - Updated to use is_public column
export const getCommunityGames = async (
    page: number = 1, 
    limit: number = 30, 
    search: string = '', 
    typeFilter: string = 'all', 
    sort: string = 'newest',
    sourceFilter: 'all' | 'ai' | 'manual' = 'all',
    authorId?: string
): Promise<{ data: GeneratedGame[], count: number, error: string | null }> => {
    try {
        // Query using the top-level is_public column (faster/cleaner)
        let query = supabase
            .from('saved_games')
            .select('*', { count: 'exact' })
            .eq('is_public', true); 

        if (authorId) {
            query = query.eq('user_id', authorId);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,config->>topic.ilike.%${search}%,author_name.ilike.%${search}%`);
        }

        if (typeFilter && typeFilter !== 'all') {
            query = query.contains('config', { type: typeFilter });
        }

        if (sourceFilter === 'ai') {
            query = query.contains('config', { isAI: true });
        } else if (sourceFilter === 'manual') {
            // Check for isAI: false
            query = query.contains('config', { isAI: false });
        }

        if (sort === 'newest') query = query.order('created_at', { ascending: false });
        if (sort === 'oldest') query = query.order('created_at', { ascending: true });
        if (sort === 'az') query = query.order('title', { ascending: true });
        if (sort === 'za') query = query.order('title', { ascending: false });

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        
        if (error) throw error;
        
        const mappedData = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            authorId: d.user_id,
            authorName: d.author_name,
            authorAvatar: d.author_avatar || d.config?.authorAvatar,
            config: { ...d.config, isPublic: d.is_public },
            questions: d.questions,
            jeopardyBoard: d.jeopardy_board,
            pubQuizRounds: d.pub_quiz_rounds,
            stopTheFireCategories: d.stop_the_fire_categories || d.config?.stopTheFireCategories,
            createdAt: d.created_at
        }));

        return { data: mappedData, count: count || 0, error: null };
    } catch (e: any) {
        console.error("Community Fetch Error:", e);
        return { data: [], count: 0, error: e.message || "Failed to fetch games" };
    }
};

export const getSharedGame = async (id: string): Promise<GeneratedGame | null> => {
    if (!id) return null;

    try {
        const { data, error } = await supabase
            .from('saved_games')
            .select('*')
            .eq('id', id)
            .eq('is_public', true)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            title: data.title,
            authorId: data.user_id,
            authorName: data.author_name,
            authorAvatar: data.author_avatar || data.config?.authorAvatar,
            config: { ...data.config, isPublic: data.is_public },
            questions: data.questions,
            jeopardyBoard: data.jeopardy_board,
            pubQuizRounds: data.pub_quiz_rounds,
            stopTheFireCategories: data.stop_the_fire_categories || data.config?.stopTheFireCategories,
            createdAt: data.created_at,
        };
    } catch (e) {
        console.error("Shared Game Fetch Error:", e);
        return null;
    }
};

export const syncPublicGameState = async (userId: string, userName?: string, userAvatar?: string) => {
    try {
        // 1. Fetch all user games
        const { data: games, error } = await supabase
            .from('saved_games')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;

        let updateCount = 0;

        // 2. Iterate and check for discrepancies
        for (const game of games) {
            const configPublic = game.config?.isPublic || false;
            const dbPublic = game.is_public;
            
            // Fix missing author name
            const needsAuthorUpdate = !game.author_name && userName;
            const needsAvatarUpdate = userAvatar !== undefined && game.config?.authorAvatar !== userAvatar;

            // If they mismatch, or if author_name is missing, update
            if (configPublic !== dbPublic || needsAuthorUpdate || needsAvatarUpdate) {
                // If config says public, enforce it on DB. 
                // If config says private (or undefined), enforce false on DB.
                // We trust the JSON config as the "user intent" if they just migrated.
                
                const updates: any = { is_public: configPublic };
                if (needsAuthorUpdate) updates.author_name = userName;
                if (needsAvatarUpdate) {
                    updates.config = { ...game.config, authorAvatar: userAvatar };
                }

                await supabase
                    .from('saved_games')
                    .update(updates)
                    .eq('id', game.id);
                
                updateCount++;
            }
        }

        const { data: worksheets, error: wsError } = await supabase
            .from('saved_worksheets')
            .select('*')
            .eq('user_id', userId);

        if (wsError) throw wsError;

        for (const worksheet of worksheets) {
            const configPublic = worksheet.config?.isPublic || false;
            const dbPublic = worksheet.is_public;
            const needsAuthorUpdate = !worksheet.author_name && userName;
            const needsAvatarUpdate = userAvatar !== undefined && worksheet.config?.authorAvatar !== userAvatar;

            if (configPublic !== dbPublic || needsAuthorUpdate || needsAvatarUpdate) {
                const updates: any = { is_public: configPublic };
                if (needsAuthorUpdate) updates.author_name = userName;
                if (needsAvatarUpdate) {
                    updates.config = { ...worksheet.config, authorAvatar: userAvatar };
                }

                await supabase
                    .from('saved_worksheets')
                    .update(updates)
                    .eq('id', worksheet.id);

                updateCount++;
            }
        }

        return { success: true, count: updateCount };
    } catch (e: any) {
        console.error("Sync Error:", e);
        return { success: false, error: e.message };
    }
};

export const deleteSavedGame = async (id: string, userId?: string) => {
    if (!userId) {
         try {
            const existing = localStorage.getItem('teachersRoomGames');
            if (existing) {
                const library = JSON.parse(existing).filter((g: GeneratedGame) => g.id !== id);
                localStorage.setItem('teachersRoomGames', JSON.stringify(library));
            }
        } catch(e) { console.error(e); }
        return;
    }

    try {
        await supabase.from('saved_games').delete().match({ id, user_id: userId });
    } catch (e) {
        console.error("Supabase Delete Error:", e);
    }
};

export const saveWorksheetToLibrary = async (worksheet: GeneratedWorksheet, userId?: string, authorName?: string): Promise<boolean> => {
    if (!userId) {
        try {
            const existing = localStorage.getItem('teachersRoomWorksheets');
            const library = existing ? JSON.parse(existing) : [];
            const index = library.findIndex((w: GeneratedWorksheet) => w.id === worksheet.id);
            // Ensure guest worksheets are always private locally
            const safeWs = { ...worksheet, config: { ...worksheet.config, isPublic: false } };
            
            if (index >= 0) {
                library[index] = safeWs;
            } else {
                library.push(safeWs);
            }
            localStorage.setItem('teachersRoomWorksheets', JSON.stringify(library));
            return true;
        } catch (e) { return false; }
    }

    try {
        const payload: any = {
            user_id: userId,
            title: worksheet.title,
            config: worksheet.config,
            content: worksheet.content,
            type: worksheet.type,
            is_public: worksheet.config?.isPublic || false,
            author_name: authorName || 'Teacher',
            created_at: new Date()
        };

        if (worksheet.id && isUUID(worksheet.id)) {
            payload.id = worksheet.id;
            const { error } = await supabase.from('saved_worksheets').upsert(payload);
            if (error) throw error;
        } else {
             if (worksheet.id && isUUID(worksheet.id)) {
                 payload.id = worksheet.id;
            }
            const { error } = await supabase.from('saved_worksheets').insert(payload);
            if (error) throw error;
        }
        return true;
    } catch (e) {
        console.error("Supabase Save Error:", e);
        return false;
    }
};

export const getSavedWorksheets = async (userId?: string): Promise<GeneratedWorksheet[]> => {
    if (!userId) {
        try {
            const existing = localStorage.getItem('teachersRoomWorksheets');
            return existing ? JSON.parse(existing) : [];
        } catch (e) { return []; }
    }

    try {
        const { data, error } = await supabase
            .from('saved_worksheets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        return data.map((d: any) => ({
            id: d.id,
            title: d.title,
            authorId: d.user_id,
            authorName: d.author_name,
            authorAvatar: d.author_avatar || d.config?.authorAvatar,
            config: { ...d.config, isPublic: d.is_public },
            content: d.content,
            type: d.type,
            createdAt: d.created_at
        }));
    } catch (e) {
        console.error("Supabase Fetch Error:", e);
        return [];
    }
};

// Fetch Public Community Worksheets
export const getCommunityWorksheets = async (
    page: number = 1, 
    limit: number = 30, 
    search: string = '', 
    gradeFilter: string = 'all',
    sort: string = 'newest',
    authorId?: string
): Promise<{ data: GeneratedWorksheet[], count: number, error: string | null }> => {
    try {
        let query = supabase
            .from('saved_worksheets')
            .select('*', { count: 'exact' })
            .eq('is_public', true); 

        if (authorId) {
            query = query.eq('user_id', authorId);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,config->>topic.ilike.%${search}%,author_name.ilike.%${search}%`);
        }

        if (gradeFilter && gradeFilter !== 'all') {
            query = query.contains('config', { gradeLevel: gradeFilter });
        }

        if (sort === 'newest') query = query.order('created_at', { ascending: false });
        if (sort === 'oldest') query = query.order('created_at', { ascending: true });
        if (sort === 'az') query = query.order('title', { ascending: true });
        if (sort === 'za') query = query.order('title', { ascending: false });

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        
        if (error) throw error;
        
        const mappedData = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            authorId: d.user_id,
            authorName: d.author_name,
            authorAvatar: d.author_avatar || d.config?.authorAvatar,
            config: { ...d.config, isPublic: d.is_public },
            content: d.content,
            type: d.type,
            createdAt: d.created_at
        }));

        return { data: mappedData, count: count || 0, error: null };
    } catch (e: any) {
        console.error("Community Worksheet Fetch Error:", e);
        return { data: [], count: 0, error: e.message || "Failed to fetch worksheets" };
    }
};

export const deleteSavedWorksheet = async (id: string, userId?: string) => {
    if (!userId) {
        try {
            const existing = localStorage.getItem('teachersRoomWorksheets');
            if (existing) {
                const library = JSON.parse(existing).filter((w: GeneratedWorksheet) => w.id !== id);
                localStorage.setItem('teachersRoomWorksheets', JSON.stringify(library));
            }
        } catch(e) { console.error(e); }
        return;
    }

    try {
        await supabase.from('saved_worksheets').delete().match({ id, user_id: userId });
        if (isUUID(id)) {
            try {
                await deleteWorksheetAssetFolder({ userId, worksheetId: id });
            } catch (e) {
                console.warn("Worksheet asset cleanup failed:", e);
            }
        }
    } catch (e) {
        console.error("Supabase Delete Error:", e);
    }
};

// NEW: Contact Form Submission
export const sendContactMessage = async (name: string, email: string, message: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase
            .from('contact_messages')
            .insert({ name, email, message });
            
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error("Contact Form Error:", e);
        return { success: false, error: e.message || "Failed to send message" };
    }
};

// NEW: Fetch Global Stats
export const getGlobalStats = async () => {
    try {
        // Use count: 'exact' and head: true to get only the count without data payload
        const { count: gamesCount } = await supabase.from('saved_games').select('*', { count: 'exact', head: true });
        const { count: worksheetsCount } = await supabase.from('saved_worksheets').select('*', { count: 'exact', head: true });
        
        return {
            games: gamesCount || 0,
            worksheets: worksheetsCount || 0
        };
    } catch (e) {
        console.error("Stats Fetch Error:", e);
        // Fallback for safety
        return { games: 0, worksheets: 0 };
    }
};
