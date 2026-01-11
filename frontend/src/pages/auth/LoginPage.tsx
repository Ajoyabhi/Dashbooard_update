import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';

const LoginPage: React.FC = () => {
  const [user_name, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user_name || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('LoginPage: Attempting login with credentials:', { user_name });
      const success = await login(user_name, password);

      if (!success) {
        setError('Invalid username or password. Please check your credentials and try again.');
      } else {
        console.log('LoginPage: Login successful, navigation will be handled by AuthContext');
      }
    } catch (err: any) {
      console.error('LoginPage: Login error:', err);

      if (err.response) {
        const errorMessage = err.response.data?.message || err.response.data?.error || 'Server error occurred';
        setError(`Login failed: ${errorMessage}`);
      } else if (err.request) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-neutral-50 via-blue-50/40 to-neutral-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Geometric Shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl animate-pulse-slow animation-delay-500"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-100/30 rounded-full blur-3xl animate-pulse-slow animation-delay-1000"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(to right, #2563eb 1px, transparent 1px), linear-gradient(to bottom, #2563eb 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[480px] relative z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-40 h-40 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-xl mb-6 transform hover:scale-105 transition-transform duration-300">
            <img
              src="/images/payvex_logo_.png"
              alt="PayVex"
              className="w-40 h-40 p-1.5"
            />
          </div>
          <h1 className="text-4xl font-bold font-display text-neutral-900 mb-2 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            PayVex
          </h1>
          <p className="text-neutral-600 font-medium">Welcome back to your dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-neutral-200/60 p-8 sm:p-10 relative overflow-hidden">
          {/* Decorative Corner Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-transparent rounded-bl-full"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary-500/10 to-transparent rounded-tr-full"></div>

          <div className="relative z-10">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Sign In</h2>
              <p className="text-sm text-neutral-600">Enter your credentials to access your account</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-error-50 border-l-4 border-error-500 rounded-lg flex items-start gap-3 animate-slide-down">
                <div className="w-5 h-5 bg-error-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-error-700 text-sm flex-1">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-neutral-700">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className={`h-5 w-5 transition-colors ${
                      user_name ? 'text-primary-600' : 'text-neutral-400 group-focus-within:text-primary-600'
                    }`} />
                  </div>
                  <input
                    type="text"
                    value={user_name}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all duration-200 font-medium"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-neutral-700">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 transition-colors ${
                      password ? 'text-primary-600' : 'text-neutral-400 group-focus-within:text-primary-600'
                    }`} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all duration-200 font-medium"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                  loading
                    ? 'bg-neutral-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-8 flex items-center">
              <div className="flex-1 border-t border-neutral-200"></div>
              <span className="px-4 text-sm text-neutral-500 font-medium">Quick Access</span>
              <div className="flex-1 border-t border-neutral-200"></div>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-3 rounded-xl bg-neutral-50 hover:bg-primary-50 transition-colors cursor-pointer group">
                <Shield className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 mb-1.5 transition-colors" />
                <span className="text-xs font-medium text-neutral-600 group-hover:text-primary-700">Secure</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-neutral-50 hover:bg-primary-50 transition-colors cursor-pointer group">
                <Zap className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 mb-1.5 transition-colors" />
                <span className="text-xs font-medium text-neutral-600 group-hover:text-primary-700">Fast</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-neutral-50 hover:bg-primary-50 transition-colors cursor-pointer group">
                <TrendingUp className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 mb-1.5 transition-colors" />
                <span className="text-xs font-medium text-neutral-600 group-hover:text-primary-700">Reliable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-neutral-600">
            Don't have an account?{' '}
            <button className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              Contact Support
            </button>
          </p>
        </div>

        {/* Floating Decorations */}
        <div className="absolute -top-10 -right-10 w-20 h-20 text-primary-200/30 animate-float pointer-events-none hidden lg:block">
          <Sparkles className="w-full h-full" />
        </div>
        <div className="absolute -bottom-10 -left-10 w-16 h-16 text-primary-200/30 animate-float animation-delay-500 pointer-events-none hidden lg:block">
          <Sparkles className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
