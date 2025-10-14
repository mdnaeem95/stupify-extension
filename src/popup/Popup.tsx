import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { Flame, BookOpen, Sparkles, Settings, ExternalLink } from 'lucide-react';
import { URLS } from '../../shared/constants';
import { formatNumber } from '../../shared/utils';

interface RecentExplanation {
  question: string;
  complexity: string;
  timestamp: number;
}

const Popup: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { defaultComplexity } = useSettingsStore();
  
  const [stats, setStats] = useState({
    streak: 0,
    questionsToday: 0,
    totalQuestions: 0,
  });
  
  const [recentExplanations, setRecentExplanations] = useState<RecentExplanation[]>([]);

  useEffect(() => {
    // Load stats and recent explanations
    loadData();
  }, [user]);

  const loadData = async () => {
    // TODO: Fetch actual stats from Supabase
    // For now, using mock data
    setStats({
      streak: 7,
      questionsToday: 12,
      totalQuestions: 142,
    });

    setRecentExplanations([
      { question: 'What is React?', complexity: '5yo', timestamp: Date.now() - 3600000 },
      { question: 'Explain DNS', complexity: 'normal', timestamp: Date.now() - 7200000 },
      { question: 'How do rockets work?', complexity: 'advanced', timestamp: Date.now() - 10800000 },
    ]);
  };

  const openDashboard = () => {
    chrome.tabs.create({ url: URLS.DASHBOARD });
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const openLogin = () => {
    chrome.tabs.create({ url: URLS.LOGIN });
  };

  if (isLoading) {
    return (
      <div className="w-80 h-96 flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-sm text-primary-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-80 h-96 flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900">Welcome to Stupify</h2>
          <p className="text-sm text-gray-600">
            Sign in to start getting instant explanations for anything you read online.
          </p>
          
          <button
            onClick={openLogin}
            className="w-full mt-6 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Sign In to Stupify
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            Don't have an account?{' '}
            <button
              onClick={() => chrome.tabs.create({ url: URLS.SIGNUP })}
              className="text-primary-600 hover:text-primary-700 underline"
            >
              Sign up free
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-lg text-gray-900">Stupify</h1>
          </div>
          
          <button
            onClick={openSettings}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        {user?.subscription_tier === 'premium' && (
          <div className="mt-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-white" />
            <span className="text-xs font-semibold text-white">Premium</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-600">Streak</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.streak}</p>
            <p className="text-xs text-gray-500">days</p>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-primary-500" />
              <span className="text-xs text-gray-600">Today</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.questionsToday}</p>
            <p className="text-xs text-gray-500">questions</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Questions</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(stats.totalQuestions)}</p>
        </div>
      </div>

      {/* Recent Explanations */}
      <div className="px-4 pb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent</h3>
        <div className="space-y-2">
          {recentExplanations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No recent explanations yet.
              <br />
              Highlight some text to get started!
            </p>
          ) : (
            recentExplanations.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-3 border border-gray-200 hover:border-primary-300 transition-colors cursor-pointer"
              >
                <p className="text-sm text-gray-900 truncate">{item.question}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500 capitalize">{item.complexity}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={openDashboard}
          className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open Dashboard
        </button>
      </div>

      {/* Quick Tip */}
      <div className="px-4 pb-4">
        <div className="bg-primary-100 rounded-lg p-3 border border-primary-200">
          <p className="text-xs text-primary-800">
            💡 <strong>Tip:</strong> Highlight any text on a webpage and press{' '}
            <code className="bg-white px-1 rounded">Cmd+Shift+S</code> to get an instant explanation!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Popup;