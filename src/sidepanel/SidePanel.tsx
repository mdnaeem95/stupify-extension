/**
 * Side Panel Component
 * Main interface for displaying explanations
 * Day 5: Fully Integrated with API Services
 */
import React, { useEffect, useState, useRef } from 'react';
import { ComplexitySelector } from '../components/ComplexitySelector';
import { StreamingResponse } from '../components/StreamingResponse';
import { FollowUpQuestions } from '../components/FollowUpQuestions';
import { ActionButtons } from '../components/ActionButtons';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { Globe, ChevronDown, ChevronUp, LogIn } from 'lucide-react';
import { useSidePanelStore } from '@/stores/useSidePanelStore';
import { FollowUpQuestion } from '@/shared/sidepanel';
import {
  authService,
  rateLimiter,
  streamWithRetry,
  createStreamCanceller,
  followUpService,
  cacheService,
} from '../services';

export const SidePanel: React.FC = () => {
  const {
    selectedText,
    complexity,
    explanation,
    followUpQuestions,
    isCollapsed,
    setComplexity,
    startExplanation,
    streamResponse,
    completeExplanation,
    setError,
    setFollowUpQuestions,
    markFollowUpClicked,
    toggleCollapse,
    setSelectedText,
  } = useSidePanelStore();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(10);
  const [isPremium, setIsPremium] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const cancellerRef = useRef<{ cancel: () => void } | null>(null);

  // Auth state
  useEffect(() => {
    const unsubscribe = authService.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setIsPremium(state.user?.subscription_tier === 'premium');
    });

    authService.checkAuthStatus();

    return unsubscribe;
  }, []);

  // Usage tracking
  useEffect(() => {
    const unsubscribe = rateLimiter.subscribe((state) => {
      setUsageRemaining(state.remaining);
    });

    return unsubscribe;
  }, []);

  // Offline detection
  useEffect(() => {
    // const unsubscribe = offlineDetector.subscribe((offline) => {
    //   setIsOffline(offline);
    // });

    // return unsubscribe;
    setIsOffline(false);
  }, []);

  // Listen for messages from content script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'OPEN_SIDE_PANEL') {
        console.log('Opening side panel with text:', message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  };

  const handleExplain = async () => {
    if (!selectedText) return;

    // Check if user can ask
    if (!rateLimiter.canAsk()) {
      setError('Daily limit reached! Upgrade for unlimited questions.');
      return;
    }

    const question = selectedText.text;

    // Reset state
    startExplanation();

    // Check cache first
    const cached = await cacheService.get(question, complexity);
    if (cached) {
      console.log('✅ Using cached response');
      
      // Stream the cached response character by character for effect
      const words = cached.answer.split(' ');
      let currentText = '';
      
      for (const word of words) {
        currentText += (currentText ? ' ' : '') + word;
        streamResponse(word + ' ');
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      completeExplanation();
      
      // Generate follow-ups
      generateFollowUps(question, cached.answer);
      return;
    }

    // Create canceller
    const canceller = createStreamCanceller();
    cancellerRef.current = canceller;

    try {
      let fullResponse = '';

      // Stream response
      await streamWithRetry(
        question,
        complexity,
        [],
        {
          signal: canceller.signal,
          onToken: (token) => {
            fullResponse += token;
            streamResponse(token);
          },
          onComplete: async (final) => {
            completeExplanation();
            
            // Cache the response
            await cacheService.add(question, final, complexity);
            
            // Record usage
            await rateLimiter.recordQuestion();
            
            // Generate follow-ups
            generateFollowUps(question, final);
          },
          onError: (error) => {
            setError(error.message || 'Failed to get explanation');
            console.error('❌ Stream error:', error);
          },
        }
      );
    } catch (error: any) {
      setError(error.message || 'Failed to get explanation');
      console.error('❌ Ask error:', error);
    }
  };

  // Check for pending explanation on load
  useEffect(() => {
    const checkPendingExplanation = async () => {
      try {
        const { pendingExplanation } = await chrome.storage.local.get('pendingExplanation');
        
        if (pendingExplanation?.text) {
          const text = pendingExplanation.text;
          console.log('📝 Found pending explanation:', text.substring(0, 50) + '...');
          
          // Set the text in state
          setSelectedText(text);
          await chrome.storage.local.remove('pendingExplanation');
          
          // Auto-start explanation
          setTimeout(async () => {
            // Check rate limit
            if (!rateLimiter.canAsk()) {
              setError('Daily limit reached! Upgrade for unlimited questions.');
              return;
            }

            // Start explanation (no arguments!)
            startExplanation();
            
            try {
              const canceller = createStreamCanceller();
              cancellerRef.current = canceller;

              // Correct function signature: (question, complexity, history, options, retries)
              await streamWithRetry(
                text,                    // question
                complexity,              // complexity level
                [],                      // conversation history (empty for now)
                {                        // StreamOptions object
                  onToken: (token) => streamResponse(token),
                  onComplete: () => {
                    completeExplanation();
                    cancellerRef.current = null;
                  },
                  onError: (error) => {
                    setError(error.message);
                    cancellerRef.current = null;
                  },
                  signal: canceller.signal,
                },
                2                        // max retries (optional)
              );
            } catch (error: any) {
              console.error('❌ Stream error:', error);
              setError(error.message || 'Failed to get explanation');
            }
          }, 500);
        }
      } catch (error) {
        console.error('❌ Error checking pending explanation:', error);
      }
    };

    checkPendingExplanation();
  }, []);

  const generateFollowUps = async (question: string, answer: string) => {
    try {
      const followUps = await followUpService.generate({
        question,
        answer,
        complexityLevel: complexity,
      });
      
      // Convert to store format
      const formattedFollowUps = followUps.map(f => ({
        id: f.id,
        question: f.text,
        category: f.category,
        clicked: false,
      }));
      
      setFollowUpQuestions(formattedFollowUps);
    } catch (error) {
      console.error('❌ Failed to generate follow-ups:', error);
    }
  };

  const handleRetry = () => {
    handleExplain();
  };

  const handleFollowUpClick = (question: FollowUpQuestion) => {
    markFollowUpClicked(question.id);
    
    // Set the follow-up as new selected text and trigger explanation
    setSelectedText({
      text: question.question,
      url: selectedText?.url || '',
      domain: selectedText?.domain || 'Follow-up',
      timestamp: Date.now(),
    });
    
    // Trigger new explanation
    setTimeout(() => handleExplain(), 100);
  };

  const handleCancelStream = () => {
    if (cancellerRef.current) {
      cancellerRef.current.cancel();
      cancellerRef.current = null;
    }
  };

  const handleLogin = async () => {
    try {
      setError('null');
      
      // Open compact OAuth popup
      const loginUrl = `${process.env.VITE_API_URL || 'https://stupify.app'}/login?ref=extension&mode=popup`;
      
      const popup = window.open(
        loginUrl,
        'Stupify Login',
        'width=450,height=650,menubar=no,toolbar=no,location=no,status=no'
      );

      // Poll for auth completion
      const checkAuth = setInterval(async () => {
        try {
          // Check if popup was closed
          if (popup?.closed) {
            clearInterval(checkAuth);
            
            // Check auth status
            const authState = await authService.checkAuthStatus();
            
            if (authState.isAuthenticated) {
              // Success! Reload side panel
              window.location.reload();
            } else {
              setError('Login cancelled or failed');
            }
          }
        } catch (error) {
          clearInterval(checkAuth);
          console.error('Auth check error:', error);
        }
      }, 1000); // Check every second

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkAuth);
        if (popup && !popup.closed) {
          popup.close();
          setError('Login timeout');
        }
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      setError('Login failed. Please try again.');
    }
  };

  const handleOpenInApp = () => {
    window.open('https://stupify.app/chat', '_blank');
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
            
            <div className="flex items-center gap-3">
              {isOffline && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                  Offline
                </span>
              )}
              
              {!isAuthenticated ? (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">
                    {isPremium ? (
                      <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded font-medium text-xs">
                        ∞ Premium
                      </span>
                    ) : (
                      <span className="text-gray-700 font-medium">
                        {usageRemaining} left
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
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
                      data-testid="explain-button"
                      disabled={!rateLimiter.canAsk()}
                      className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rateLimiter.canAsk() ? 'Explain This' : 'Daily Limit Reached'}
                    </button>
                    {!rateLimiter.canAsk() && (
                      <button
                        onClick={() => window.open('https://stupify.app/pricing', '_blank')}
                        className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Upgrade for unlimited questions →
                      </button>
                    )}
                  </div>
                )}
                
                {/* Cancel button for streaming */}
                {explanation.isStreaming && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={handleCancelStream}
                      className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Cancel
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
            href="https://stupify.app"
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