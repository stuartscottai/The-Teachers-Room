import React from 'react';
import { Settings } from 'lucide-react';
import { translateInterfaceText as ui } from '../../../utils/interfaceLanguage';
import './game-menu-button.css';

export function GameMenuButton({ onClick, mobileOnly=false }: { onClick: () => void; mobileOnly?:boolean }) {
    return <button data-game-menu data-mobile-only={mobileOnly||undefined} className="game-menu-button" onClick={onClick} aria-label={ui('Game options')} aria-haspopup="dialog">
        <Settings size={22} aria-hidden="true" /><span>{ui('Menu')}</span>
    </button>;
}
