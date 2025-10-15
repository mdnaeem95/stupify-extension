/**
 * Enhanced Onboarding Flow
 * 
 * Interactive 3-step tutorial with:
 * - Feature highlights
 * - Visual demonstrations
 * - Skip option
 * - Completion tracking
 */

import React, { useState } from 'react';
import { Check, Sparkles, Zap, Target, MousePointer2, MessageSquare, Trophy, X } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const [step, setStep] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const steps = [
    {
      title: 'Welcome to Stupify! 👋',
      description: 'Finally, an AI that speaks human. Get simple explanations for anything, anywhere on the web.',
      icon: <Sparkles className="w-16 h-16 text-purple-600" />,
      features: [
        { icon: <Zap className="w-5 h-5" />, text: '10 free questions per day', color: 'blue' },
        { icon: <Target className="w-5 h-5" />, text: 'Works on any website', color: 'purple' },
        { icon: <MessageSquare className="w-5 h-5" />, text: 'Smart follow-up questions', color: 'pink' },
      ],
    },
    {
      title: 'Three Ways to Ask',
      description: 'Pick the method that works best for you. All three are super easy!',
      icon: <MousePointer2 className="w-16 h-16 text-purple-600" />,
      interactive: true,
      demos: [
        {
          method: 'Right-Click',
          steps: ['1. Select any text', '2. Right-click', '3. Choose "Simplify with Stupify"'],
          icon: '🖱️',
        },
        {
          method: 'Keyboard',
          steps: ['1. Select any text', '2. Press Ctrl+Shift+S', '3. Get instant explanation'],
          icon: '⌨️',
        },
        {
          method: 'Toolbar',
          steps: ['1. Click the extension icon', '2. Type your question', '3. Hit enter'],
          icon: '🔧',
        },
      ],
    },
    {
      title: 'Choose Your Level',
      description: 'Get explanations that match your knowledge level. You\'re always in control!',
      icon: <Trophy className="w-16 h-16 text-purple-600" />,
      levels: [
        {
          name: '5-Year-Old',
          emoji: '🎈',
          description: 'Super simple, like you\'re 5',
          example: '"Gravity makes things fall down because Earth pulls on them!"',
        },
        {
          name: 'Normal',
          emoji: '💡',
          description: 'Clear and conversational',
          example: '"Gravity is a force that attracts objects with mass toward each other."',
        },
        {
          name: 'Advanced',
          emoji: '🎓',
          description: 'Technical and detailed',
          example: '"Gravity is described by Einstein\'s general relativity as spacetime curvature."',
        },
      ],
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    // Mark onboarding as complete with timestamp
    await chrome.storage.local.set({ 
      onboarding: {
        completed: true,
        completedAt: Date.now(),
        stepsCompleted: step + 1,
      }
    });
    
    // Track completion
    chrome.runtime.sendMessage({
      type: 'TRACK_EVENT',
      payload: {
        event: 'onboarding_completed',
        properties: { steps_completed: step + 1 },
      },
    });

    // Close the tab
    chrome.tabs.getCurrent((tab) => {
      if (tab?.id) {
        chrome.tabs.remove(tab.id);
      }
    });
  };

  const handleSkip = async () => {
    // Track skip
    chrome.runtime.sendMessage({
      type: 'TRACK_EVENT',
      payload: {
        event: 'onboarding_skipped',
        properties: { at_step: step },
      },
    });

    await chrome.storage.local.set({ 
      onboarding: {
        completed: true,
        skipped: true,
        skippedAt: step,
      }
    });

    // Close the tab
    chrome.tabs.getCurrent((tab) => {
      if (tab?.id) {
        chrome.tabs.remove(tab.id);
      }
    });
  };

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Skip Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleSkip}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white/60 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
            Skip tutorial
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-3xl">S</span>
            </div>
          </div>

          {/* Progress */}
          <div className="flex justify-center gap-2 mb-10">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === step
                    ? 'w-10 bg-purple-600'
                    : index < step
                    ? 'w-2 bg-purple-600'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6 animate-bounce">
            {currentStep.icon}
          </div>

          {/* Content */}
          <h1 className="text-4xl font-bold text-gray-900 text-center mb-4">
            {currentStep.title}
          </h1>
          <p className="text-xl text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            {currentStep.description}
          </p>

          {/* Step 1: Features */}
          {step === 0 && currentStep.features && (
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              {currentStep.features.map((feature, index) => (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className={`
                    p-6 rounded-2xl border-2 transition-all cursor-default
                    ${hoveredFeature === index 
                      ? `border-${feature.color}-500 bg-${feature.color}-50 shadow-lg scale-105` 
                      : 'border-gray-200 bg-white'
                    }
                  `}
                >
                  <div className={`w-12 h-12 rounded-xl bg-${feature.color}-100 flex items-center justify-center text-${feature.color}-600 mb-3`}>
                    {feature.icon}
                  </div>
                  <p className="text-gray-700 font-medium">{feature.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Interactive Demos */}
          {step === 1 && currentStep.demos && (
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {currentStep.demos.map((demo, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all"
                >
                  <div className="text-5xl mb-4 text-center">{demo.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                    {demo.method}
                  </h3>
                  <div className="space-y-2">
                    {demo.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Complexity Levels */}
          {step === 2 && currentStep.levels && (
            <div className="space-y-4 mb-10">
              {currentStep.levels.map((level, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-4xl">{level.emoji}</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{level.name}</h3>
                      <p className="text-sm text-gray-600">{level.description}</p>
                    </div>
                  </div>
                  <div className="bg-white/80 p-4 rounded-xl border border-purple-200">
                    <p className="text-sm text-gray-700 italic">{level.example}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all text-lg"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all text-lg shadow-lg hover:shadow-xl"
            >
              {step === steps.length - 1 ? '🚀 Get Started' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Made with 💜 by{' '}
          <a
            href="https://stupify.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 font-semibold"
          >
            Stupify
          </a>
        </p>
      </div>
    </div>
  );
};