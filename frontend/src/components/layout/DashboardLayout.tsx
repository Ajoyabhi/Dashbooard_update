import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, User, Bell, LogOut, ChevronDown, Key, UserCircle, Settings, Moon, Sun } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { MenuItem } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  menuItems: MenuItem[];
  title: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  menuItems,
  title
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleDesktopSidebar = () => {
    setDesktopSidebarOpen(!desktopSidebarOpen);
  };

  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setProfileMenuOpen(false);
  };

  const handleChangePasswordClick = () => {
    navigate('/change-password');
    setProfileMenuOpen(false);
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-neutral-900' : 'bg-gradient-to-br from-neutral-50 via-blue-50/30 to-purple-50/30'}`}>
      {/* Sidebar for desktop */}
      <div className={`hidden md:block transition-all duration-700 ease-out ${desktopSidebarOpen ? 'w-72' : 'w-0'}`}>
        <Sidebar
          items={menuItems}
          isOpen={desktopSidebarOpen}
          onClose={() => { }}
          onToggle={toggleDesktopSidebar}
          darkMode={darkMode}
        />
      </div>

      {/* Sidebar for mobile */}
      <div className="md:hidden">
        <Sidebar
          items={menuItems}
          isOpen={sidebarOpen}
          onClose={toggleSidebar}
          darkMode={darkMode}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-700 ease-out">
        {/* Header */}
        <header className={`${darkMode ? 'bg-neutral-900/80 backdrop-blur-md border-neutral-800' : 'bg-white/80 backdrop-blur-md border-neutral-200'} border-b shadow-lg z-20 relative`}>
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                className="md:hidden p-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-soft"
                onClick={toggleSidebar}
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-5 w-5" />
              </button>

              {/* Desktop sidebar toggle button */}
              <button
                className="hidden md:flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-soft"
                onClick={toggleDesktopSidebar}
                title={desktopSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                <svg
                  className={`w-6 h-6 transition-transform duration-500 ${desktopSidebarOpen ? 'rotate-180' : 'rotate-0'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex flex-col">
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'} font-display`}>
                  {title}
                </h1>
                <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-600'} font-medium`}>
                  Welcome back, {user?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-3 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-soft ${darkMode
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                  : 'bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-700'
                  }`}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Notifications */}
              <button className={`relative p-3 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-soft ${darkMode
                ? 'bg-gradient-to-r from-neutral-800 to-neutral-700 text-neutral-300 hover:text-white'
                : 'bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-600 hover:text-neutral-900'
                }`}>
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-gradient-to-r from-error-500 to-pink-500 ring-2 ring-white animate-pulse"></span>
              </button>

              {/* Profile Menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={toggleProfileMenu}
                  className={`flex items-center space-x-3 cursor-pointer p-3 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-soft ${darkMode
                    ? 'bg-gradient-to-r from-neutral-800 to-neutral-700 hover:from-neutral-700 hover:to-neutral-600'
                    : 'bg-gradient-to-r from-neutral-100 to-neutral-200 hover:from-neutral-200 hover:to-neutral-300'
                    }`}
                >
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white shadow-soft">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user?.name || 'User'}
                        className="h-10 w-10 rounded-2xl object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                      {user?.name}
                    </p>
                    <p className={`text-xs capitalize ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      {user?.role}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'} ${profileMenuOpen ? 'transform rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {profileMenuOpen && (
                  <div className={`absolute right-0 mt-3 w-64 rounded-2xl shadow-xl backdrop-blur-xl border z-50 transform opacity-100 scale-100 transition-all duration-200 origin-top-right ${darkMode
                      ? 'bg-neutral-900/95 border-neutral-700/30'
                      : 'bg-white/95 border-white/30'
                    }`}>
                    <div className="p-2" role="menu" aria-orientation="vertical">
                      <div className={`px-4 py-3 border-b ${darkMode ? 'border-neutral-700' : 'border-neutral-100'
                        }`}>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'
                          }`}>{user?.name}</p>
                        <p className={`text-xs capitalize ${darkMode ? 'text-neutral-400' : 'text-neutral-600'
                          }`}>{user?.role}</p>
                      </div>

                      <button
                        onClick={handleProfileClick}
                        className={`flex items-center w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 ${darkMode
                            ? 'text-neutral-300 hover:bg-gradient-to-r hover:from-primary-900/50 hover:to-secondary-900/50'
                            : 'text-neutral-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-secondary-50'
                          }`}
                        role="menuitem"
                      >
                        <UserCircle className="h-5 w-5 mr-3 text-primary-500" />
                        Profile Details
                      </button>

                      <button
                        onClick={handleChangePasswordClick}
                        className={`flex items-center w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 ${darkMode
                            ? 'text-neutral-300 hover:bg-gradient-to-r hover:from-primary-900/50 hover:to-secondary-900/50'
                            : 'text-neutral-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-secondary-50'
                          }`}
                        role="menuitem"
                      >
                        <Key className="h-5 w-5 mr-3 text-secondary-500" />
                        Change Password
                      </button>

                      <button
                        className={`flex items-center w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 ${darkMode
                            ? 'text-neutral-300 hover:bg-gradient-to-r hover:from-accent-900/50 hover:to-orange-900/50'
                            : 'text-neutral-700 hover:bg-gradient-to-r hover:from-accent-50 hover:to-orange-50'
                          }`}
                        role="menuitem"
                      >
                        <Settings className="h-5 w-5 mr-3 text-accent-500" />
                        Settings
                      </button>

                      <div className={`border-t mt-2 pt-2 ${darkMode ? 'border-neutral-700' : 'border-neutral-100'
                        }`}>
                        <button
                          onClick={logout}
                          className={`flex items-center w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 ${darkMode
                              ? 'text-error-400 hover:bg-gradient-to-r hover:from-error-900/50 hover:to-red-900/50'
                              : 'text-error-600 hover:bg-gradient-to-r hover:from-error-50 hover:to-red-50'
                            }`}
                          role="menuitem"
                        >
                          <LogOut className="h-5 w-5 mr-3" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className={`flex-1 overflow-auto p-6 transition-all duration-500 ${darkMode ? 'bg-neutral-900' : 'bg-transparent'}`}>
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;