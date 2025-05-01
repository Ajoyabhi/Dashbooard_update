import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, AuthState } from '../types';
import api from '../utils/axios';

interface AuthContextType extends AuthState {
  login: (user_name: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAllowed: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthProvider: Checking stored authentication...');
    // Check for stored authentication
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        console.log('AuthProvider: Found stored credentials, parsing...');
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        console.log('AuthProvider: Successfully restored user session');
      } catch (error) {
        console.error('AuthProvider: Failed to parse stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } else {
      console.log('AuthProvider: No stored credentials found');
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (user_name: string, password: string): Promise<boolean> => {
    console.log('AuthContext: Attempting login for user:', user_name);
    try {
      console.log('AuthContext: Sending login request to backend...');
      const response = await api.post('/auth/login', { user_name, password });
      const data = response.data;

      if (!data.token || !data.user) {
        console.error('AuthContext: Invalid response format:', data);
        throw new Error('Invalid response from server');
      }

      console.log('AuthContext: Login successful, storing credentials...');
      console.log('AuthContext: User data:', data.user);

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Set auth token for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      setAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Determine the correct route based on user_type
      let redirectPath = '/';

      if (!data.user.user_type || data.user.user_type === '') {
        console.log('AuthContext: User type is empty, redirecting to user dashboard');
        redirectPath = '/user';
      } else if (data.user.user_type === 'admin') {
        console.log('AuthContext: User is admin, redirecting to admin dashboard');
        redirectPath = '/admin';
      } else if (data.user.user_type === 'agent') {
        console.log('AuthContext: User is agent, redirecting to agent dashboard');
        redirectPath = '/agent';
      } else {
        console.log(`AuthContext: User type "${data.user.user_type}" mapped to user dashboard`);
        redirectPath = '/user';
      }

      console.log('AuthContext: Redirecting to:', redirectPath);
      navigate(redirectPath);
      return true;
    } catch (error: any) {
      console.error('AuthContext: Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return false;
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out user...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    navigate('/login');
    console.log('AuthContext: User logged out successfully');
  };

  const isAllowed = (role: UserRole): boolean => {
    if (!authState.isAuthenticated || !authState.user) {
      console.log('AuthContext: User not authenticated or no user data');
      return false;
    }

    console.log('AuthContext: Checking permissions for role:', role);
    console.log('AuthContext: Current user type:', authState.user.user_type);

    switch (role) {
      case 'admin':
        return authState.user.user_type === 'admin';
      case 'agent':
        return authState.user.user_type === 'agent';
      case 'user':
        return authState.user.user_type !== 'admin' && authState.user.user_type !== 'agent';
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        isAllowed,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};