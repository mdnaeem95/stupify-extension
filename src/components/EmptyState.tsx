/**
 * Empty State Component
 * Shows helpful instructions when no text is selected
 */

import React from 'react';
import { MousePointerClick, Command } from 'lucide-react';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
        <MousePointerClick className="w-8 h-8 text-primary-600" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Select Text to Get Started
      </h2>

      <p className="text-sm text-gray-600 mb-6 max-w-sm">
        Highlight any text on this page and we'll explain it simply.
      </p>

      <div className="space-y-3 w-full max-w-xs">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-bold">1</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Select Text</p>
              <p className="text-xs text-gray-500">Highlight any text on the page</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-bold">2</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Right-Click</p>
              <p className="text-xs text-gray-500">Choose "Simplify with Stupify"</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Command className="w-4 h-4 text-primary-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Or Use Shortcut</p>
              <p className="text-xs text-gray-500">
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                  Cmd+Shift+S
                </code>{' '}
                (Mac) or{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                  Ctrl+Shift+S
                </code>{' '}
                (Windows)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};