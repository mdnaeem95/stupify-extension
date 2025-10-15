// src/onboarding/Onboarding.tsx
import React, { useState } from 'react';
import { Check, Sparkles, Zap, Heart } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Stupify! 👋',
      description: 'Finally, an AI that speaks human. Get simple explanations for anything, anywhere on the web.',
      icon: <Sparkles className="w-12 h-12 text-primary-600" />,
    },
    {
      title: 'Highlight & Learn',
      description: 'Just select any text on any webpage, right-click, and choose "Simplify with Stupify".',
      icon: <Zap className="w-12 h-12 text-primary-600" />,
    },
    {
      title: 'Choose Your Level',
      description: 'Get explanations at 3 levels: Like I\'m 5, Normal, or Advanced. You\'re in control.',
      icon: <Heart className="w-12 h-12 text-primary-600" />,
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    // Mark onboarding as complete
    chrome.storage.local.set({ onboardingComplete: true });
    // Close the tab
    chrome.tabs.getCurrent((tab) => {
      if (tab?.id) {
        chrome.tabs.remove(tab.id);
      }
    });
  };

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
          </div>

          {/* Progress */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === step
                    ? 'w-8 bg-primary-600'
                    : index < step
                    ? 'w-2 bg-primary-600'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            {currentStep.icon}
          </div>

          {/* Content */}
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
            {currentStep.title}
          </h1>
          <p className="text-lg text-gray-600 text-center mb-8">
            {currentStep.description}
          </p>

          {/* Features */}
          {step === 0 && (
            <div className="grid gap-4 mb-8">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Free: 10 questions per day</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Works on any website</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Smart follow-up questions</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              {step === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>

          {/* Skip */}
          {step < steps.length - 1 && (
            <button
              onClick={handleFinish}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Skip tutorial
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
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