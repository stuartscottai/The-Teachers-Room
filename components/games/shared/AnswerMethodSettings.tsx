import React, { useId } from 'react';
import { AnswerMethod } from '../../../types';
import { translateInterfaceText as ui, useInterfaceLanguage } from '../../../utils/interfaceLanguage';

export const AnswerMethodSelect: React.FC<{ value?: AnswerMethod; onChange: (method: AnswerMethod) => void }> = ({ value, onChange }) => {
  useInterfaceLanguage();
  const id = useId();
  return <div>
    <label htmlFor={id} className="mb-2 block text-sm font-bold text-slate-700">{ui("Answer method")}</label>
    <select id={id} value={value === 'write' ? 'write' : 'say'} onChange={event => onChange(event.target.value as AnswerMethod)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800">
      <option value="say">{ui("Say it")}</option>
      <option value="write">{ui("Write it")}</option>
    </select>
    <p className="mt-1 text-xs text-slate-500">{ui("Applies to all Gap Fill and Open Ended questions in this game. You can change it in game setup before playing.")}</p>
  </div>;
};
