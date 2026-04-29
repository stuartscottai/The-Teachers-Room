
import React, { useEffect, useState } from 'react';
import { Link, To, useNavigate } from 'react-router-dom';
import { Play, Clock, Smile, Zap, Star, ArrowRight, Triangle, Circle, Hexagon, Square, Grid, Trophy, List, HelpCircle, Dice5, Activity, Beer, GraduationCap, X, DollarSign, Target, Timer, Flame, RefreshCw, Radio } from 'lucide-react';
import { TestimonialCarousel } from '../components/TestimonialCarousel';
import { GameType } from '../types';
import { getGlobalStats, getTrendingGames } from '../utils/gameUtils';

type HomeTrendingCard = {
    id: string;
    title: string;
    plays: string;
    image: string;
    icon: React.ReactNode;
    color: string;
    to: To;
    state?: unknown;
};

const compactNumberFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

const formatPlayCount = (value: number) => compactNumberFormatter.format(Math.max(0, value));
const isUUID = (str?: string) => !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const getGameVisual = (type?: GameType) => {
    switch (type) {
        case GameType.JEOPARDY:
            return { image: '/assets/games/jeopardy.png', icon: <Grid size={40} />, color: 'bg-blue-500' };
        case GameType.MILLIONAIRE:
            return { image: '/assets/games/millionaire.png', icon: <DollarSign size={40} />, color: 'bg-indigo-600' };
        case GameType.SURVEY_SHOWDOWN:
            return { image: '/assets/games/survey.png', icon: <List size={40} />, color: 'bg-emerald-500' };
        case GameType.TRIVIA:
            return { image: '/assets/games/trivia.png', icon: <HelpCircle size={40} />, color: 'bg-purple-500' };
        case GameType.LIVE_QUIZ_CHALLENGE:
            return { image: '/assets/games/livequiz.png', icon: <GraduationCap size={40} />, color: 'bg-cyan-700' };
        case GameType.PUB_QUIZ:
            return { image: '/assets/games/pubquiz.png', icon: <Beer size={40} />, color: 'bg-slate-700' };
        case GameType.DARTS:
            return { image: '/assets/games/darts.png', icon: <Target size={40} />, color: 'bg-red-500' };
        case GameType.TIME_BOMB:
            return { image: '/assets/games/timebomb.png', icon: <Timer size={40} />, color: 'bg-rose-600' };
        case GameType.STOP_THE_FIRE:
            return { image: '/assets/games/stopthefire.png', icon: <Flame size={40} />, color: 'bg-[#0f4c81]' };
        case GameType.WORD_WHEEL:
            return { image: '/assets/games/wordwheel.png', icon: <RefreshCw size={40} />, color: 'bg-cyan-600' };
        case GameType.SNAKES_LADDERS:
            return { image: '/assets/games/snakes.png', icon: <Dice5 size={40} />, color: 'bg-teal-500' };
        default:
            return { image: '/assets/games/trivia.png', icon: <Trophy size={40} />, color: 'bg-sky-600' };
    }
};

const FALLBACK_TRENDING_GAMES: HomeTrendingCard[] = [
    { id: 'fallback-1', title: 'Jeopardy', plays: '0', to: '/games', ...getGameVisual(GameType.JEOPARDY) },
    { id: 'fallback-2', title: 'Millionaire Maker', plays: '0', to: '/games', ...getGameVisual(GameType.MILLIONAIRE) },
    { id: 'fallback-3', title: 'Survey Showdown', plays: '0', to: '/games', ...getGameVisual(GameType.SURVEY_SHOWDOWN) },
    { id: 'fallback-4', title: 'Trivia Quiz', plays: '0', to: '/games', ...getGameVisual(GameType.TRIVIA) },
    { id: 'fallback-5', title: 'Pub Quiz', plays: '0', to: '/games', ...getGameVisual(GameType.PUB_QUIZ) }
];

// Simple Animated Counter Component
const StatCounter: React.FC<{ end: number, label: string }> = ({ end, label }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        // Don't animate if 0
        if (end === 0) return;
        
        const duration = 2000; // 2s duration
        const increment = end / (duration / 16); // 60fps
        
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        
        return () => clearInterval(timer);
    }, [end]);

    return (
        <div className="flex flex-col items-center">
            <div className="text-2xl md:text-3xl font-black text-brand-yellow font-mono">
                {count.toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-sky-100 font-bold uppercase tracking-wider">
                {label}
            </div>
        </div>
    );
};

// Robust Card for Trending Games
const TrendingGameCard: React.FC<{ game: HomeTrendingCard }> = ({ game }) => {
    const [hasError, setHasError] = useState(false);

    return (
        <Link to={game.to} state={game.state} className="group block h-full">
            <div className="bg-slate-50 rounded-xl overflow-hidden shadow-sm group-hover:shadow-xl hover:shadow-sky-200 transition-all border border-slate-100 h-full flex flex-col">
                <div className={`aspect-[3/2] w-full relative overflow-hidden shrink-0 ${hasError ? `${game.color}` : 'bg-transparent'}`}>
                    <img 
                        src={game.image} 
                        alt={game.title} 
                        crossOrigin="anonymous"
                        className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${hasError ? 'hidden' : 'block'}`}
                        onError={() => setHasError(true)}
                    />
                    
                    {hasError && (
                        <div className="w-full h-full flex items-center justify-center text-white/50 relative overflow-hidden">
                             {/* Fallback Gradient Design */}
                             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                             <div className="transform scale-150 group-hover:scale-125 transition-transform duration-500 text-white">
                                {game.icon}
                             </div>
                        </div>
                    )}
                    
                    {/* Overlay on hover (only if image loaded) */}
                    {!hasError && <div className="absolute inset-0 bg-sky-900/10 group-hover:bg-transparent transition-colors" />}
                </div>
                <div className="p-4 flex-grow">
                    <h3 className="font-bold text-slate-700 group-hover:text-sky-600 transition-colors truncate" title={game.title}>{game.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{game.plays} plays</p>
                </div>
            </div>
        </Link>
    );
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [stats, setStats] = useState({ games: 0, gamesPlayed: 0 });
  const [trendingGames, setTrendingGames] = useState<HomeTrendingCard[]>(FALLBACK_TRENDING_GAMES);
  const [showTourInvite, setShowTourInvite] = useState(false);
  const [dontShowTourAgain, setDontShowTourAgain] = useState(false);

  const TOUR_HIDE_KEY = 'teachersRoomTourPromptDisabled';

  const persistTourPreference = (hide: boolean) => {
    try {
      if (hide) {
        localStorage.setItem(TOUR_HIDE_KEY, '1');
      } else {
        localStorage.removeItem(TOUR_HIDE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    let isUnmounted = false;

    const refreshHomeFeed = async () => {
      try {
        const [statsData, trendingResult] = await Promise.all([
          getGlobalStats(),
          getTrendingGames(5)
        ]);

        if (isUnmounted) return;

        setStats(statsData);

        const mappedTrending = trendingResult.data.map((game, index) => {
          const visuals = getGameVisual(game.config?.type);
          return {
            id: game.id || `trending-${index}`,
            title: game.title || game.config?.type || 'Untitled game',
            plays: formatPlayCount(Number(game.playCount || 0)),
            to: '/games',
            state: isUUID(game.id) ? { view: 'community', previewGameId: game.id } : undefined,
            image: visuals.image,
            icon: visuals.icon,
            color: visuals.color
          };
        });

        setTrendingGames(mappedTrending.length > 0 ? mappedTrending : FALLBACK_TRENDING_GAMES);

      } catch (error) {
        if (isUnmounted) return;
        console.warn('Home feed refresh failed:', error);
        setTrendingGames(FALLBACK_TRENDING_GAMES);
      }
    };

    void refreshHomeFeed();
    const refreshInterval = window.setInterval(() => {
      void refreshHomeFeed();
    }, 120000);

    try {
      const disabled = localStorage.getItem(TOUR_HIDE_KEY) === '1';
      setShowTourInvite(!disabled);
    } catch {
      setShowTourInvite(true);
    }

    return () => {
      isUnmounted = true;
      clearInterval(refreshInterval);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSkipTour = () => {
    persistTourPreference(dontShowTourAgain);
    setShowTourInvite(false);
  };

  const startTour = () => {
    persistTourPreference(dontShowTourAgain);
    setShowTourInvite(false);
    navigate('/games', { state: { tour: 'games' } });
  };

  return (
    <div className="overflow-hidden">
      {showTourInvite && (
        <div className="fixed inset-0 z-[220] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain bg-white rounded-[1.75rem] sm:rounded-3xl border border-slate-100 shadow-2xl p-5 sm:p-7 relative animate-slide-up">
            <button
              type="button"
              onClick={handleSkipTour}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Close tour popup"
            >
              <X size={20} />
            </button>

            <div className="mb-3 inline-flex items-center justify-center bg-brand-yellow p-2.5 rounded-full shadow-sm">
              <GraduationCap size={20} className="text-sky-900" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-slate-800 mb-2 pr-8">Take a quick tour?</h2>
            <p className="text-sm sm:text-base text-slate-600 mb-5 leading-relaxed">
              Pick where you want to start. We&apos;ll guide you step by step.
            </p>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={startTour}
                className="py-3 px-4 rounded-xl bg-brand-blue text-white font-bold hover:bg-sky-600 transition-colors"
              >
                Games
              </button>
            </div>

            <label className="mt-4 flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
              <input
                type="checkbox"
                checked={dontShowTourAgain}
                onChange={(e) => setDontShowTourAgain(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-blue"
              />
              Don&apos;t show message again
            </label>

            <button
              type="button"
              onClick={handleSkipTour}
              className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Skip tour
            </button>
          </div>
        </div>
      )}

      {/* Hero Section - Parallax Effect */}
      <section className="relative min-h-[85vh] flex items-center justify-center bg-brand-blue overflow-hidden">
        
        {/* Background Image Layer with Parallax */}
        <div 
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ 
                transform: `translateY(${scrollY * 0.4}px)`,
                height: '120%', // Extra height for parallax movement
                top: '-10%' // Center the extra height
            }}
        >
            <img 
                src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2070&auto=format&fit=crop" 
                alt="Teacher's Desk Background" 
                crossOrigin="anonymous"
                className="w-full h-full object-cover opacity-20 mix-blend-overlay filter blur-[1px]"
            />
             {/* Tint Overlay to maintain theme consistency */}
             <div className="absolute inset-0 bg-brand-blue/60" />
        </div>

        {/* Gradient Fade to Solid Blue at Bottom for Seamless Divider */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-b from-transparent to-brand-blue z-10" />

        {/* Parallax Shapes */}
        {/* Top Left Cluster */}
        <div className="absolute top-20 left-[10%] text-brand-yellow opacity-80"
             style={{ transform: `translateY(${scrollY * 0.4}px) rotate(${scrollY * 0.1}deg)` }}>
            <Star size={48} fill="currentColor" />
        </div>
        <div className="absolute top-40 left-[5%] text-sky-200 opacity-60"
             style={{ transform: `translateY(${scrollY * 0.2}px) rotate(${scrollY * -0.2}deg)` }}>
             <Circle size={32} fill="currentColor" />
        </div>
        
        {/* Top Right Cluster */}
        <div className="absolute top-24 right-[15%] text-white opacity-30"
             style={{ transform: `translateY(${scrollY * -0.1}px) rotate(${scrollY * 0.1}deg)` }}>
             <Hexagon size={80} strokeWidth={1.5} />
        </div>
        <div className="absolute top-10 right-[5%] text-brand-accent opacity-90"
             style={{ transform: `translateY(${scrollY * 0.3}px) rotate(${scrollY * 0.2}deg)` }}>
             <Triangle size={56} fill="currentColor" className="rotate-12" />
        </div>

        {/* Middle Floating */}
        <div className="absolute top-1/2 left-[2%] text-white opacity-40"
             style={{ transform: `translateY(${scrollY * 0.15}px) rotate(45deg)` }}>
             <Square size={64} fill="currentColor" />
        </div>
        <div className="absolute top-1/3 right-[25%] text-brand-yellow opacity-50"
             style={{ transform: `translateY(${scrollY * -0.2}px)` }}>
             <Zap size={40} fill="currentColor" />
        </div>

        {/* Bottom Cluster */}
        <div className="absolute bottom-32 left-[15%] text-sky-200 opacity-80"
             style={{ transform: `translateY(${scrollY * 0.1}px) rotate(${scrollY * -0.1}deg)` }}>
             <Smile size={72} />
        </div>
        <div className="absolute bottom-20 right-[10%] text-white opacity-20"
             style={{ transform: `translateY(${scrollY * 0.25}px) rotate(${scrollY * 0.1}deg)` }}>
             <Hexagon size={120} fill="currentColor" />
        </div>
         <div className="absolute bottom-40 right-[40%] text-sky-100 opacity-30"
             style={{ transform: `translateY(${scrollY * -0.05}px) rotate(15deg)` }}>
             <Triangle size={30} strokeWidth={3} />
        </div>


        {/* Main Content */}
        <div className="relative z-20 text-center max-w-5xl mx-auto px-4 mt-10">
          
          <h1
            translate="no"
            lang="en"
            className="notranslate font-display text-6xl md:text-8xl font-black text-white mb-8 leading-tight drop-shadow-md"
          >
            <span translate="no" lang="en" className="notranslate inline-block transform -rotate-3 hover:rotate-0 transition-transform duration-300 text-sky-100 mr-4">The</span>
            <span translate="no" lang="en" className="notranslate relative inline-block mr-4">
                <span translate="no" lang="en" className="notranslate relative z-10">Teachers'</span>
                {/* Stylish highlight behind text */}
                <svg className="absolute w-[110%] h-[60%] -bottom-2 -left-[5%] z-0 text-brand-accent opacity-90" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,50 Q50,100 100,50" stroke="currentColor" strokeWidth="80" fill="none" />
                </svg>
            </span>
            <span translate="no" lang="en" className="notranslate inline-block transform rotate-3 hover:rotate-0 transition-transform duration-300 text-sky-100">Room</span>
          </h1>

          <p className="text-xl md:text-2xl text-sky-50 mb-12 font-medium max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
            The ultimate playground for educators. Create AI-powered classroom games in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center mb-16">
            <Link 
                to="/games" 
                className="group px-8 py-4 bg-white text-sky-700 font-bold text-lg rounded-full shadow-lg hover:shadow-2xl hover:bg-sky-50 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
            >
                <div className="bg-brand-yellow text-slate-900 rounded-full p-1 group-hover:rotate-12 transition-transform">
                    <Play size={16} fill="currentColor" />
                </div>
                Start Playing
            </Link>
            <Link
                to="/live"
                className="group px-8 py-4 bg-brand-yellow text-slate-900 font-bold text-lg rounded-full shadow-lg hover:shadow-2xl hover:bg-yellow-300 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
            >
                <div className="bg-slate-900 text-brand-yellow rounded-full p-1 group-hover:scale-110 transition-transform">
                    <Radio size={16} />
                </div>
                Join Live Quiz
            </Link>
          </div>

          {/* LIVE STATS TICKER */}
          <div className="inline-flex flex-col md:flex-row items-center gap-8 bg-white/10 backdrop-blur-md rounded-3xl p-6 md:px-10 border border-white/20 shadow-xl animate-slide-up">
              <div className="flex items-center gap-2 text-sky-200 uppercase text-xs font-bold tracking-widest mb-2 md:mb-0 md:border-r border-white/20 md:pr-6">
                  <Activity size={16} className="animate-pulse" /> Live Stats
              </div>
              <div className="flex gap-8 md:gap-12">
                  <StatCounter end={stats.games} label="Games Created" />
                  <div className="w-px bg-white/20 h-10 hidden md:block"></div>
                  <StatCounter end={stats.gamesPlayed} label="Games Played" />
              </div>
          </div>

        </div>
      </section>

      {/* Popular Games */}
      <section className="relative py-20 bg-white z-20">
        {/* Wave Divider (Blue hanging down) */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-20 transform -translate-y-[1px]">
             <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[60px] text-brand-blue fill-current">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
            </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-12">
            <h2 className="font-display text-3xl font-bold text-center text-slate-800 mb-12">
                <span className="border-b-4 border-brand-yellow pb-2">Trending Games</span>
            </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {trendingGames.map((game) => (
                    <TrendingGameCard key={game.id} game={game} />
                ))}
            </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white relative z-10">
         <div className="max-w-7xl mx-auto px-4">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                 {[
                     { icon: Clock, title: "Less Prep", desc: "Cut planning time in half with AI generation." },
                     { icon: Smile, title: "More Fun", desc: "Engage students with interactive formats." },
                     { icon: Star, title: "High Quality", desc: "Curriculum-aligned content every time." },
                     { icon: Zap, title: "Instant Use", desc: "No signup required to try basic tools." }
                 ].map((feature, idx) => (
                     <div key={idx} className="text-center group">
                         <div className="w-20 h-20 mx-auto bg-brand-yellow rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-yellow-100 border-2 border-transparent group-hover:border-brand-blue">
                             <feature.icon size={32} className="text-slate-800" />
                         </div>
                         <h3 className="font-display text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                         <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                     </div>
                 ))}
             </div>
         </div>
      </section>

      {/* Testimonials - Parallax Effects */}
      <section className="py-24 bg-brand-blue text-white relative overflow-hidden">
          {/* Animated Decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
               <div className="absolute -top-20 -right-20 opacity-10 text-white"
                    style={{ transform: `translateY(${(scrollY - 2000) * 0.1}px)` }}>
                   <Circle size={400} />
               </div>
               <div className="absolute bottom-20 left-10 opacity-10 text-brand-yellow"
                    style={{ transform: `translateY(${(scrollY - 2200) * -0.15}px) rotate(${scrollY * 0.05}deg)` }}>
                   <Triangle size={200} fill="currentColor" />
               </div>
               <div className="absolute top-1/3 left-10 opacity-10 text-sky-300"
                    style={{ transform: `translateY(${(scrollY - 2000) * 0.05}px) rotate(${scrollY * -0.1}deg)` }}>
                   <Star size={100} fill="currentColor" />
               </div>
               <div className="absolute bottom-1/4 right-20 opacity-5 text-white"
                    style={{ transform: `translateY(${(scrollY - 2000) * -0.08}px) rotate(45deg)` }}>
                   <Square size={150} fill="currentColor" />
               </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 relative z-10">
              <h2 className="font-display text-4xl font-bold text-center text-white mb-4 drop-shadow-md">
                  Reasons why teachers love us
              </h2>
              <p className="text-center text-sky-100 mb-12 text-lg">Join thousands of happy educators transforming their classrooms.</p>
              <TestimonialCarousel />
          </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="font-display text-4xl font-bold text-slate-800 mb-8">Ready to gamify your class?</h2>
              <Link 
                to="/games"
                className="inline-flex items-center px-10 py-5 bg-brand-blue text-white text-xl font-bold rounded-full hover:bg-sky-600 transition-colors shadow-xl hover:shadow-2xl shadow-sky-200"
              >
                  Go to Games <ArrowRight className="ml-3" />
              </Link>
          </div>
      </section>
    </div>
  );
};
