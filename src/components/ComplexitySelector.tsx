/**
 * Complexity Selector Component
 * Three-button toggle for 5yo / Normal / Advanced
 */

import { ComplexityLevel } from '@/shared/types';
import React from 'react';

interface ComplexitySelectorProps {
  selected: ComplexityLevel;
  onChange: (level: ComplexityLevel) => void;
  disabled?: boolean;
}

const complexityConfig = {
  '5yo': {
    label: '5yo',
    description: 'Like I\'m 5',
    emoji: '🧸',
    color: 'bg-pink-500 hover:bg-pink-600',
    selectedColor: 'bg-pink-600 ring-pink-500',
  },
  'normal': {
    label: 'Normal',
    description: 'Balanced',
    emoji: '⚖️',
    color: 'bg-primary-500 hover:bg-primary-600',
    selectedColor: 'bg-primary-600 ring-primary-500',
  },
  'advanced': {
    label: 'Advanced',
    description: 'Technical',
    emoji: '🧠',
    color: 'bg-purple-600 hover:bg-purple-700',
    selectedColor: 'bg-purple-700 ring-purple-500',
  },
};

export const ComplexitySelector: React.FC<ComplexitySelectorProps> = ({
  selected,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex gap-2">
      {(Object.keys(complexityConfig) as ComplexityLevel[]).map((level) => {
        const config = complexityConfig[level];
        const isSelected = selected === level;

        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            disabled={disabled}
            className={`
              flex-1 px-3 py-2.5 rounded-lg font-medium text-sm
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                isSelected
                  ? `${config.selectedColor} text-white ring-2 ring-offset-2 shadow-md`
                  : `bg-white text-gray-700 hover:bg-gray-50 border border-gray-200`
              }
            `}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{config.emoji}</span>
              <span className="font-semibold">{config.label}</span>
              <span className="text-xs opacity-75">{config.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};