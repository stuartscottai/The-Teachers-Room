import React from 'react';
import { WorksheetConfig } from '../../types';
import { Info } from 'lucide-react';

interface WorksheetConfigSidebarProps {
  config: WorksheetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WorksheetConfig>>;
}

export const DifficultyLevelSelector: React.FC<WorksheetConfigSidebarProps> = ({
  config,
  setConfig,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-700 mb-1">
        Difficulty Level
      </label>
      <select
        value={config.difficultyLevel || 'medium'}
        onChange={(e) =>
          setConfig({
            ...config,
            difficultyLevel: e.target.value as 'easy' | 'medium' | 'hard' | 'mixed',
          })
        }
        className="w-full p-2 rounded border border-slate-200 bg-white text-sm focus:ring-1 focus:ring-teal-400 outline-none"
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
        <option value="mixed">Mixed (Progressive)</option>
      </select>
      <p className="text-xs text-slate-500 mt-1">
        <Info size={10} className="inline mr-1" />
        Adjusts vocabulary complexity and question difficulty
      </p>
    </div>
  );
};

export const AnswerKeyToggle: React.FC<WorksheetConfigSidebarProps> = ({
  config,
  setConfig,
}) => {
  return (
    <div className="mb-4">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.generateAnswerKey || false}
          onChange={(e) =>
            setConfig({
              ...config,
              generateAnswerKey: e.target.checked,
            })
          }
          className="mt-1"
        />
        <div>
          <span className="block text-xs font-bold text-slate-700">
            Generate Answer Key
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Includes complete answers at the end of the worksheet
          </p>
        </div>
      </label>
    </div>
  );
};

export const HeaderToggle: React.FC<WorksheetConfigSidebarProps> = ({
  config,
  setConfig,
}) => {
  return (
    <div className="mb-4">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.includeHeader || false}
          onChange={(e) =>
            setConfig({
              ...config,
              includeHeader: e.target.checked,
            })
          }
          className="mt-1"
        />
        <div>
          <span className="block text-xs font-bold text-slate-700">
            Include Name & Date Header
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Adds Name and Date fields at the top of the worksheet
          </p>
        </div>
      </label>
    </div>
  );
};

export const LayoutModeSelector: React.FC<WorksheetConfigSidebarProps> = ({
  config,
  setConfig,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-700 mb-1">
        Layout Mode
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => setConfig({ ...config, layout: 'single' })}
          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
            config.layout === 'single'
              ? 'bg-teal-100 text-teal-700 border-2 border-teal-500'
              : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
          }`}
        >
          Single Column
        </button>
        <button
          onClick={() => setConfig({ ...config, layout: 'columns' })}
          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
            config.layout === 'columns'
              ? 'bg-teal-100 text-teal-700 border-2 border-teal-500'
              : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
          }`}
        >
          Two Columns
        </button>
      </div>
    </div>
  );
};
