import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Shield,
  CreditCard,
  TrendingUp,
  Globe,
  Banknote,
  ArrowRight,
  Star,
  Award,
  Zap,
  ShieldCheck
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
      // If successful, the AuthContext will handle navigation automatically
    } catch (err: any) {
      console.error('LoginPage: Login error:', err);

      if (err.response) {
        // Server responded with error
        const errorMessage = err.response.data?.message || err.response.data?.error || 'Server error occurred';
        setError(`Login failed: ${errorMessage}`);
      } else if (err.request) {
        // Network error
        setError('Network error. Please check your internet connection and try again.');
      } else {
        // Other error
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Image Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/images/landing.png')`
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-indigo-900/70 to-purple-900/80"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-16 h-16 text-white/20 animate-float">
            <CreditCard className="w-full h-full" />
          </div>
          <div className="absolute top-40 right-32 w-12 h-12 text-white/15 animate-float animation-delay-200">
            <TrendingUp className="w-full h-full" />
          </div>
          <div className="absolute bottom-32 left-32 w-14 h-14 text-white/15 animate-float animation-delay-400">
            <Banknote className="w-full h-full" />
          </div>

          {/* Gradient Orbs */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-indigo-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse-slow animation-delay-500"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="max-w-lg">
            {/* Logo */}
            <div className="relative mb-8 flex justify-center">
              <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-6 transform hover:scale-105 transition-all duration-500 p-2">
                <img
                  src="/images/AccuzPay_logo.png"
                  alt="AccuzPay Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Brand Content */}
            <div className="space-y-6 mb-8">
              {/* <h1 className="text-4xl font-bold font-display leading-tight">
                AccuzPay
              </h1> */}
              <p className="text-xl text-blue-100 font-medium">
                Premium Banking & Payment Solutions
              </p>
              <p className="text-base text-gray-300 leading-relaxed">
                Experience the future of financial technology with our secure, lightning-fast payment gateway designed for modern businesses.
              </p>
            </div>

            {/* Premium Features */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">Bank-Grade Security</h3>
                  <p className="text-sm text-blue-100">256-bit encryption & fraud protection</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">Lightning Fast</h3>
                  <p className="text-sm text-blue-100">Process payments in milliseconds</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">Global Reach</h3>
                  <p className="text-sm text-blue-100">Accept payments worldwide</p>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <p className="text-sm text-gray-300 mb-4 text-center">Trusted by 50,000+ businesses globally</p>
              <div className="flex justify-center space-x-4">
                <div className="flex items-center space-x-2 px-3 py-2 bg-white/10 rounded-lg">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-white font-medium">PCI DSS</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-2 bg-white/10 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-white font-medium">SSL</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-2 bg-white/10 rounded-lg">
                  <Star className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-white font-medium">ISO 27001</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
        {/* Mobile Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5"></div>
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-gradient-to-r from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-blue-300/5 to-indigo-300/5 rounded-full blur-2xl animate-pulse animation-delay-500"></div>
        </div>

        {/* Floating Banking Icons for Mobile */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute top-20 left-8 w-8 h-8 text-blue-400/20 animate-bounce">
            <CreditCard className="w-full h-full" />
          </div>
          <div className="absolute top-32 right-12 w-6 h-6 text-indigo-400/20 animate-bounce animation-delay-300">
            <Shield className="w-full h-full" />
          </div>
          <div className="absolute bottom-40 left-12 w-7 h-7 text-purple-400/20 animate-bounce animation-delay-700">
            <Banknote className="w-full h-full" />
          </div>
          <div className="absolute bottom-20 right-8 w-6 h-6 text-blue-400/20 animate-bounce animation-delay-1000">
            <TrendingUp className="w-full h-full" />
          </div>
        </div>
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-6 sm:mb-8 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl mb-3 sm:mb-4 p-2 sm:p-3 border border-white/20">
              <img
                src="/images/AccuzPay_logo.png"
                alt="AccuzPay Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">AccuzPay</h1>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">Secure Banking Platform</p>
          </div>

          {/* Form Container */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-white/20 relative overflow-hidden">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 pointer-events-none"></div>
            {/* Form Header */}
            <div className="text-center mb-6 sm:mb-8 relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                Welcome Back
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Sign in to your AccuzPay account
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl flex items-center space-x-3 relative z-10">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">!</span>
                </div>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 relative z-10">
              {/* Username Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={user_name}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 text-sm sm:text-base"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 text-sm sm:text-base"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
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
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 sm:py-4 px-6 rounded-xl sm:rounded-2xl font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base ${loading
                  ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-xl'
                  } flex items-center justify-center space-x-2`}
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

            {/* Form Footer */}
            <div className="mt-6 sm:mt-8 text-center relative z-10">
              <p className="text-xs sm:text-sm text-gray-600">
                Don't have an account?{' '}
                <button className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Contact Sales
                </button>
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-4 sm:mt-6 text-center relative z-10">
            <div className="flex justify-center space-x-3 sm:space-x-6 text-xs text-gray-600">
              <div className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/30">
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                <span className="font-medium text-xs sm:text-sm">Secure</span>
              </div>
              <div className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/30">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                <span className="font-medium text-xs sm:text-sm">Fast</span>
              </div>
              <div className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/30">
                <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                <span className="font-medium text-xs sm:text-sm">Global</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;