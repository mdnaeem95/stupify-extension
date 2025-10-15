/**
 * Stats Widget Component
 * 
 * Inline stats display for the side panel showing:
 * - Questions asked today/total
 * - Current streak
 * - Topics explored
 * - Favorite complexity
 * - Premium upgrade CTA
 */

import { useState, useEffect } from 'react';
import { Flame, Brain, TrendingUp, Sparkles, Crown, ChevronRight } from 'lucide-react';
import { logger } from '../shared/utils';

interface StatsData {
  today: {
    questions: number;
    limit: number;
  };
  allTime: {
    totalQuestions: number;
    topicsExplored: number;
  };
  streak: {
    current: number;
    longest: number;
  };
  favorite: {
    complexity: '5yo' | 'normal' | 'advanced';
    count: number;
  };
  isPremium: boolean;
}

export function StatsWidget() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      // Load from storage
      const result = await chrome.storage.local.get([
        'daily_usage',
        'stats',
        'user_data',
        'streak',
      ]);

      const today = new Date().toDateString();
      const dailyUsage = result.daily_usage || {};
      const todayQuestions = dailyUsage[today]?.count || 0;
      const userData = result.user_data || {};
      const isPremium = userData.subscriptionTier === 'premium';
      
      setStats({
        today: {
          questions: todayQuestions,
          limit: isPremium ? 9999 : 10,
        },
        allTime: {
          totalQuestions: result.stats?.totalExplanations || 0,
          topicsExplored: result.stats?.topicsExplored || 0,
        },
        streak: {
          current: result.streak?.current || 0,
          longest: result.streak?.longest || 0,
        },
        favorite: {
          complexity: result.stats?.favoriteComplexity || 'normal',
          count: result.stats?.favoriteComplexityCount || 0,
        },
        isPremium,
      });
    } catch (error) {
      logger.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    chrome.runtime.sendMessage({
      type: 'TRACK_EVENT',
      payload: {
        event: 'upgrade_cta_clicked',
        properties: { source: 'stats_widget' },
      },
    });
    
    chrome.tabs.create({
      url: 'https://stupify.ai/pricing',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200 animate-pulse">
        <div className="h-20 bg-white/50 rounded-lg"></div>
      </div>
    );
  }

  if (!stats) return null;

  const usagePercentage = (stats.today.questions / stats.today.limit) * 100;
  const complexityEmoji = {
    '5yo': '🎈',
    'normal': '💡',
    'advanced': '🎓',
  }[stats.favorite.complexity];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-white/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Your Stats</h3>
              <p className="text-xs text-gray-600">
                {stats.today.questions} questions today
              </p>
            </div>
          </div>
          <ChevronRight 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Today's Usage */}
          <div className="bg-white/80 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Today's Questions
              </span>
              <span className="text-sm font-bold text-purple-600">
                {stats.today.questions} / {stats.isPremium ? '∞' : stats.today.limit}
              </span>
            </div>
            {!stats.isPremium && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usagePercentage >= 80 
                      ? 'bg-red-500' 
                      : usagePercentage >= 50 
                      ? 'bg-yellow-500' 
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Streak */}
            <div className="bg-white/80 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-gray-600">Streak</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {stats.streak.current}
                <span className="text-xs text-gray-500 ml-1">days</span>
              </div>
            </div>

            {/* Total Questions */}
            <div className="bg-white/80 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-gray-600">Total</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {stats.allTime.totalQuestions}
              </div>
            </div>

            {/* Topics */}
            <div className="bg-white/80 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-600">Topics</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {stats.allTime.topicsExplored}
              </div>
            </div>

            {/* Favorite Level */}
            <div className="bg-white/80 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-gray-600">Favorite</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {complexityEmoji}
              </div>
            </div>
          </div>

          {/* Premium CTA */}
          {!stats.isPremium && (
            <button
              onClick={handleUpgradeClick}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg p-3 font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Crown className="w-5 h-5" />
              Upgrade to Premium
            </button>
          )}

          {/* View Full Stats */}
          <button
            onClick={() => chrome.tabs.create({ url: 'https://stupify.ai/stats' })}
            className="w-full text-sm text-purple-600 hover:text-purple-700 font-medium py-2"
          >
            View Full Dashboard →
          </button>
        </div>
      )}
    </div>
  );
}