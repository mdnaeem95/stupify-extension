import React, { useEffect, useState } from 'react';
import { Flame, BookOpen, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { authService } from '@/services';
import { URLS } from '@/shared/constants';
import { User } from '@/shared/types';

const Popup: React.FC = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  // Login form state
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // Subscribe to auth changes
    const unsubscribe = authService.subscribe((state: any) => {
      setAuthState(state);
      console.log('🔄 Auth state updated in Popup:', state);
    });

    return unsubscribe;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      console.log('🔐 Attempting login...', email);
      await authService.login(email, password);
      console.log('✅ Login successful!');
      setShowLoginForm(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      setLoginError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const openDashboard = () => {
    chrome.tabs.create({ url: URLS.DASHBOARD });
  };

  const openSignup = () => {
    chrome.tabs.create({ url: URLS.SIGNUP });
  };

  if (authState.loading) {
    return (
      <div className="w-80 h-96 flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-sm text-primary-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    if (showLoginForm) {
      // Login Form
      return (
        <div className="w-80 bg-gradient-to-br from-primary-50 to-primary-100 p-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Login to Stupify</h2>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  disabled={isLoggingIn}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  disabled={isLoggingIn}
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowLoginForm(false)}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-center text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={openSignup}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Welcome Screen
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
          
          <div className="space-y-2">
            <button
              onClick={() => setShowLoginForm(true)}
              className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              Login
            </button>

            <button
              onClick={openSignup}
              className="w-full px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged In View
  const user = authState.user! as User;
  const isPremium = user?.subscription_tier === 'premium';

  return (
    <div className="w-80 bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.email?.[0].toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {user?.email || 'User'}
              </p>
              {isPremium && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full text-xs font-semibold">
                  ✨ Premium
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3">
        <button
          onClick={openDashboard}
          className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-gray-900">Open Dashboard</span>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </button>

        {!isPremium && (
          <button
            onClick={() => chrome.tabs.create({ url: URLS.UPGRADE })}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5" />
              <span className="text-sm font-medium">Upgrade to Premium</span>
            </div>
            <ExternalLink className="w-4 h-4" />
          </button>
        )}

        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-white border-t border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          Highlight text on any page and right-click <strong>"Simplify with Stupify"</strong>
        </p>
      </div>
    </div>
  );
};

export default Popup;