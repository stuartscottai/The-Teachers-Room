import React, {useId} from 'react';
import { PlayfulSelect } from '../PlayfulSelect';
import type {TriviaStyle} from '../../types';
import {PICKABLE_TRIVIA_STYLES,TRIVIA_STYLE_LABELS,normalizeTriviaStyle} from '../../utils/triviaStyles';
import {translateInterfaceText as ui} from '../../utils/interfaceLanguage';
import './trivia-style-picker.css';

export function TriviaStylePreview({style}:{style:TriviaStyle}){
 return <span className={`trivia-style-preview preview-${style}`} aria-hidden="true">
   <span className="trivia-preview-top"><i/><i/><i/><b>100</b></span>
   <span className="trivia-preview-board"><i>1</i><i>2</i><i>3</i></span>
 </span>;
}
export function TriviaStylePicker({value,onChange}:{value:TriviaStyle;onChange:(style:TriviaStyle)=>void}){
 const id=useId();
 // A saved seasonal style remains visible even after it leaves the new-game picker.
 const choices=PICKABLE_TRIVIA_STYLES.includes(value)?PICKABLE_TRIVIA_STYLES:[...PICKABLE_TRIVIA_STYLES,value];
 return <div className="workspace-setup-field-group trivia-style-picker">
  <label htmlFor={id} className="workspace-section-title mb-2 block text-sm font-bold">{ui('Game style')}</label>
  <div className="trivia-style-control">
   <TriviaStylePreview style={value}/>
   <PlayfulSelect id={id} aria-label={ui('Game style')} value={value} menuMinWidth={320} menuMaxHeight={430} onChange={event=>onChange(normalizeTriviaStyle(event.target.value))}
     renderOption={choice=><span className="trivia-style-choice"><TriviaStylePreview style={normalizeTriviaStyle(choice.value)}/><b>{choice.label}</b></span>}>
     {choices.map(style=><option key={style} value={style}>{ui(TRIVIA_STYLE_LABELS[style])}</option>)}
   </PlayfulSelect>
  </div>
 </div>;
}
