import React from 'react';
import { ArrowLeft, X, Flag, VolumeX, Volume2, Minimize2, Maximize2, Edit2, Settings } from 'lucide-react';
import { translateInterfaceText as ui, displayTeamName, useInterfaceLanguage } from '../../../utils/interfaceLanguage';

interface TeamScoreboardHeaderProps {
    scores: number[];
    teamNames: string[];
    currentTeam: number;
    isMobileViewport: boolean;
    isFullscreen: boolean;
    isMuted: boolean;
    onOptions?: () => void;
    optionsOnly?: boolean;
    layout?: 'header' | 'sidebar';
    onQuit: () => void;
    onEnd: () => void;
    onToggleMute: () => void;
    onToggleFullscreen: () => void;
    onEditTeam?: (index: number) => void;
    renderScore?: (score: number, index: number) => React.ReactNode;
    footer?: React.ReactNode;
}

export const TeamScoreboardHeader: React.FC<TeamScoreboardHeaderProps> = ({ scores, teamNames, currentTeam, isMobileViewport, isFullscreen, isMuted, onOptions, optionsOnly = false, layout = 'header', onQuit, onEnd, onToggleMute, onToggleFullscreen, onEditTeam, renderScore, footer }) => {
    useInterfaceLanguage();
    const mobileUsesTwoRowHeader = isMobileViewport && scores.length >= 4;
    const mobileHeaderColumns = scores.length >= 5 ? 3 : scores.length === 4 ? 2 : Math.max(scores.length, 1);
    return (
<div className={`team-scoreboard-header ${layout === 'sidebar' ? 'trivia-sidebar-scoreboard' : ''} bg-white ${mobileUsesTwoRowHeader ? 'px-2 py-1.5 h-[110px]' : 'p-2 min-h-[70px]'} sm:p-4 shrink-0 z-[250] shadow-sm border-b border-slate-200 relative sm:min-h-[140px]`}>
                <div className={`flex w-full ${mobileUsesTwoRowHeader ? 'gap-2 items-start' : 'gap-3 sm:gap-4 items-center'}`}>
                    <div className={`${optionsOnly ? 'hidden' : 'flex'} min-w-fit shrink-0 ${mobileUsesTwoRowHeader ? 'gap-1' : 'gap-1.5'} sm:flex-col sm:items-start sm:gap-2 sm:min-w-[64px] ${mobileUsesTwoRowHeader ? 'flex-col items-start' : 'flex-row items-center'}`}>
                        <button 
                            onClick={() => onQuit()} 
                            className="hidden sm:flex w-[140px] justify-center text-slate-500 hover:text-red-600 items-center text-sm bg-slate-100 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-bold border border-slate-200"
                        >
                            <ArrowLeft size={16} className="mr-2" /> {ui(" Quit")}</button>
                        <button
                            onClick={() => onEnd()}
                            className="hidden sm:flex w-[140px] justify-center text-white items-center text-sm bg-rose-700 hover:bg-rose-600 px-4 py-2 rounded-lg transition-colors font-bold border border-rose-800"
                            title={ui("End game now")}
                        >
                            <Flag size={16} className="mr-2" /> {ui(" End Game")}</button>
                        <button
                            onClick={() => onQuit()}
                            className={`sm:hidden ${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center border border-slate-200 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors`}
                            title={ui("Quit")}
                        >
                            <X size={mobileUsesTwoRowHeader ? 14 : 17} />
                        </button>
                        <button
                            onClick={() => onEnd()}
                            className={`sm:hidden ${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center border border-rose-700 bg-rose-700 text-white hover:bg-rose-600 transition-colors`}
                            title={ui("End game now")}
                        >
                            <Flag size={mobileUsesTwoRowHeader ? 12 : 14} />
                        </button>
                        <button 
                            onClick={() => onOptions ? onOptions() : onToggleMute()}
                            className={`sm:hidden ${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center border border-slate-200 bg-slate-100 text-slate-500 hover:text-brand-blue hover:bg-sky-50 transition-colors`}
                            title={onOptions ? ui("Game options") : isMuted ? ui("Unmute") : ui("Mute")}
                            aria-label={onOptions ? ui("Game options") : isMuted ? ui("Unmute") : ui("Mute")}
                        >
                            {onOptions ? <Settings size={isMobileViewport ? (mobileUsesTwoRowHeader ? 14 : 17) : 24} /> : isMuted ? <VolumeX size={mobileUsesTwoRowHeader ? 14 : 17} /> : <Volume2 size={mobileUsesTwoRowHeader ? 14 : 17} />}
                        </button>
                    </div>
                    
                    {/* Scoreboard Cards */}
                    <div data-scoreboard-teams
                        className={isMobileViewport
                            ? `flex-1 grid ${mobileUsesTwoRowHeader ? 'gap-1 content-start' : 'gap-1.5'} items-stretch`
                            : 'flex-1 flex justify-end sm:justify-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar px-1 sm:px-4 items-center'}
                        style={isMobileViewport ? { gridTemplateColumns: `repeat(${mobileHeaderColumns}, minmax(0, 1fr))` } : undefined}
                    >
                        {scores.map((score, idx) => (
                            <button data-scoreboard-card="true" aria-current={currentTeam === idx ? 'true' : undefined} tabIndex={onEditTeam ? 0 : -1} aria-label={`${displayTeamName(teamNames[idx])} ${score}`}
                                key={idx} 
                                onClick={() => onEditTeam?.(idx)}
                                className={`${isMobileViewport ? `${mobileUsesTwoRowHeader ? 'h-[46px]' : 'h-12'} w-full min-w-0 px-2 py-1` : `px-2 py-1 sm:py-3 min-w-[86px] h-12 sm:h-28 ${scores.length >= 4 ? 'sm:min-w-0 sm:flex-1 sm:px-2' : 'sm:min-w-[150px] sm:px-6'}`} rounded-xl text-center transition-all border-b-4 relative group flex flex-col justify-center items-center shadow-sm
                                    ${currentTeam === idx 
                                        ? 'bg-brand-blue border-sky-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
                            >
                                <div data-scoreboard-name className="text-[10px] sm:text-lg uppercase font-bold tracking-wider truncate max-w-full sm:max-w-[130px] mb-0.5 sm:mb-1 flex items-center gap-1">
                                    {displayTeamName(teamNames[idx])}
                                    {currentTeam === idx && <div className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse ml-1"></div>}
                                </div>
                                {renderScore ? renderScore(score, idx) : <strong className={`${mobileUsesTwoRowHeader ? 'text-base' : 'text-lg'} sm:text-5xl font-display leading-none`}>{score}</strong>}
                                
                                {/* Hover Edit Icon */}
                                {onEditTeam && <div className="absolute top-2 right-2 bg-slate-100 text-slate-900 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit2 size={12} />
                                </div>}
                            </button>
                        ))}
                    </div>

                    {footer && <div className="flip-game-sidebar-footer">{footer}</div>}
                    {optionsOnly ? (layout === 'sidebar' ? <div className="trivia-sidebar-controls"><h2 className="font-display text-lg font-bold">{ui('Teams')}</h2></div> : null) : <div className="hidden sm:flex flex-col items-end justify-center min-w-[72px] gap-2">
                        <button 
                            onClick={() => onOptions ? onOptions() : onToggleMute()}
                            className="text-slate-400 hover:text-brand-blue p-3 bg-slate-100 hover:bg-sky-50 rounded-xl transition-colors border border-slate-200"
                            title={onOptions ? ui("Game options") : isMuted ? ui("Unmute") : ui("Mute")}
                            aria-label={onOptions ? ui("Game options") : isMuted ? ui("Unmute") : ui("Mute")}
                        >
                            {onOptions ? <Settings size={isMobileViewport ? (mobileUsesTwoRowHeader ? 14 : 17) : 24} /> : isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                        <button aria-label={isFullscreen ? ui("Exit fullscreen") : ui("Enter fullscreen")} onClick={onToggleFullscreen} className="text-slate-400 hover:text-brand-blue p-3 bg-slate-100 hover:bg-sky-50 rounded-xl transition-colors border border-slate-200">
                            {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                        </button>
                    </div>}
                </div>
            </div>
    );
};
