import React, { createContext, useContext } from 'react';
import type { TeamScoreboardHeader } from './TeamScoreboardHeader';

export type FlipGameHeaderProps = React.ComponentProps<typeof TeamScoreboardHeader> & {
 headerRef?:React.Ref<HTMLDivElement>;confirmActions?:boolean;
};
export type FlipGameControls = Pick<FlipGameHeaderProps,'isMuted'|'isFullscreen'|'onToggleMute'|'onToggleFullscreen'|'onQuit'|'onEnd'|'confirmActions'>;
type PresentationState = {
 host:HTMLElement|null;controls:React.MutableRefObject<FlipGameControls|null>;
 paused:React.MutableRefObject<boolean>;setMounted:React.Dispatch<React.SetStateAction<boolean>>;
 setCount:React.Dispatch<React.SetStateAction<number>>;showMenu:()=>void;
 refresh:React.Dispatch<React.SetStateAction<number>>;
};

// Keep the provider/consumer identity shared even while Vite replaces modules.
// Recreating this context in the component module let a stale consumer silently
// render the old top scoreboard instead of using the current sidebar provider.
export const FlipGamePresentationContext:React.Context<PresentationState|null> =
 import.meta.hot?.data.flipGamePresentationContext ?? createContext<PresentationState|null>(null);
if(import.meta.hot)import.meta.hot.data.flipGamePresentationContext=FlipGamePresentationContext;
const neverPaused={current:false};
export const useGameMenuPause=()=>useContext(FlipGamePresentationContext)?.paused??neverPaused;
