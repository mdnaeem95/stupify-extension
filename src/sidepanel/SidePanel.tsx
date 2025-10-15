/**
 * Side Panel Component
 * Main interface for displaying explanations
 * Day 4: Side Panel UI
 */

import React, { useEffect } from 'react';
import { ComplexitySelector } from '../components/ComplexitySelector';
import { StreamingResponse } from '../components/StreamingResponse';
import { FollowUpQuestions } from '../components/FollowUpQuestions';
import { ActionButtons } from '../components/ActionButtons';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { useSidePanelStore } from '@/stores/useSidePanelStore';
import { FollowUpQuestion } from '@/shared/sidepanel';

export const SidePanel: React.FC = () => {
  const {
    selectedText,
    complexity,
    explanation,
    followUpQuestions,
    isCollapsed,
    setComplexity,
    startExplanation,
    markFollowUpClicked,
    toggleCollapse,
  } = useSidePanelStore();

  // Listen for messages from content script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'OPEN_SIDE_PANEL') {
        // This will be handled by the store when we integrate API
        console.log('Opening side panel with text:', message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleExplain = () => {
    if (!selectedText) return;
    
    startExplanation();
    
    // TODO: Call API in Day 5
    // For now, simulate with mock data
    console.log('Starting explanation for:', selectedText.text);
  };

  const handleRetry = () => {
    handleExplain();
  };

  const handleFollowUpClick = (question: FollowUpQuestion) => {
    markFollowUpClicked(question.id);
    // TODO: Trigger new explanation with follow-up question
    console.log('Follow-up clicked:', question.question);
  };

  const handleOpenInApp = () => {
    window.open('https://stupify.ai/chat', '_blank');
  };

  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900">Stupify</h1>
            </div>
            <span className="text-xs text-gray-500">v1.0.0</span>
          </div>

          {/* Complexity Selector */}
          <ComplexitySelector
            selected={complexity}
            onChange={setComplexity}
            disabled={explanation.isLoading || explanation.isStreaming}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* No text selected - Empty State */}
          {!selectedText && <EmptyState />}

          {/* Text selected - Show explanation */}
          {selectedText && (
            <>
              {/* Selected Text Preview */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <button
                  onClick={toggleCollapse}
                  className="w-full px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">
                        {getDomain(selectedText.url)}
                      </span>
                    </div>
                    <p className={`text-sm text-gray-700 ${isCollapsed ? 'line-clamp-2' : ''}`}>
                      {selectedText.text}
                    </p>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
              </div>

              {/* Explanation Section */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                {explanation.error ? (
                  <ErrorState error={explanation.error} onRetry={handleRetry} />
                ) : explanation.response || explanation.isLoading ? (
                  <StreamingResponse
                    text={explanation.response}
                    isStreaming={explanation.isStreaming}
                    isLoading={explanation.isLoading}
                  />
                ) : (
                  <div className="text-center py-8">
                    <button
                      onClick={handleExplain}
                      className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Explain This
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {explanation.completed && explanation.response && (
                <ActionButtons
                  response={explanation.response}
                  onOpenInApp={handleOpenInApp}
                />
              )}

              {/* Follow-up Questions */}
              {followUpQuestions.length > 0 && (
                <FollowUpQuestions
                  questions={followUpQuestions}
                  onQuestionClick={handleFollowUpClick}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-3">
        <p className="text-xs text-center text-gray-500">
          Made with 💜 by{' '}
          <a
            href="https://stupify.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Stupify
          </a>
        </p>
      </div>
    </div>
  );
};