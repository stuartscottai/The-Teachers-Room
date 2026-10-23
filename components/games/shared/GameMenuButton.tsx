import React from 'react';
import { Settings } from 'lucide-react';
import { translateInterfaceText as ui } from '../../../utils/interfaceLanguage';
import './game-menu-button.css';

export function GameMenuButton({ onClick }: { onClick: () => void }) {
    return <button data-game-menu className="game-menu-button" onClick={onClick} aria-label={ui('Game options')} aria-haspopup="dialog">
        <Settings size={22} aria-hidden="true" /><span>{ui('Menu')}</span>
    </button>;
}
