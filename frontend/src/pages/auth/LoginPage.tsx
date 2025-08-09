import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [user_name, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user_name || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await login(user_name, password);
      if (!success) {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background with gradient overlay */}
      <div className="background-overlay"></div>
      
      {/* Main container */}
      <div className="login-container">
        {/* Left side - Brand section */}
        <div className="brand-section">
          <div className="brand-content">
            <div className="logo-container">
              <img 
                src="/images/zentexpay_logo.jpg" 
                alt="ZentexPay Logo" 
                className="logo"
              />
            </div>
            <h1 className="brand-title">ZentexPay</h1>
            <p className="brand-subtitle">Secure Payment Gateway Solutions</p>
            <div className="brand-features">
              <div className="feature-item">
                <div className="feature-icon">🔒</div>
                <span>Bank-grade Security</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <span>Lightning Fast</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🌐</div>
                <span>Global Reach</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="form-section">
          <div className="form-container">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your ZentexPay account</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="error-message">
                  <svg className="error-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="username" className="form-label">Username</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <input
                    id="username"
                    type="text"
                    className="form-input"
                    value={user_name}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-container">
                  <input type="checkbox" className="checkbox" />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <a href="/forgot-password" className="forgot-link">Forgot Password?</a>
              </div>

              <button
                type="submit"
                className={`login-button ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="form-footer">
              <p>Don't have an account? <a href="/register" className="signup-link">Sign up</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;