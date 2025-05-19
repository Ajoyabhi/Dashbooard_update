import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css'; // We'll create this file next

const LoginPage: React.FC = () => {
  const [user_name, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Add focus effects for input fields
  useEffect(() => {
    const inputs = document.querySelectorAll(".input");

    const addFocus = (e: Event) => {
      const parent = (e.target as HTMLElement).parentNode?.parentNode as HTMLElement;
      parent?.classList.add("focus");
    };

    const removeFocus = (e: Event) => {
      const parent = (e.target as HTMLElement).parentNode?.parentNode as HTMLElement;
      if ((e.target as HTMLInputElement).value === "") {
        parent?.classList.remove("focus");
      }
    };

    inputs.forEach(input => {
      input.addEventListener("focus", addFocus);
      input.addEventListener("blur", removeFocus);
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener("focus", addFocus);
        input.removeEventListener("blur", removeFocus);
      });
    };
  }, []);

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
    <div className="login-container">
      <img className="wave" src="/images/wave.png" alt="wave" />
      <div className="container">
        <div className="img">
          <img src="/images/log.svg" alt="background" />
        </div>
        <div className="login-content">
          <form onSubmit={handleSubmit}>
            <img src="/images/avatar.svg" alt="avatar" />
            <h2 className="title">Welcome</h2>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="input-div one">
              <div className="i">
                <i className="fas fa-user"></i>
              </div>
              <div className="div">
                <h5>Username</h5>
                <input
                  type="text"
                  className="input"
                  value={user_name}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-div pass">
              <div className="i">
                <i className="fas fa-lock"></i>
              </div>
              <div className="div">
                <h5>Password</h5>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <a href="/forgot-password" className="forgot-link">Forgot Password?</a>
            <button
              type="submit"
              className={`btn ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;