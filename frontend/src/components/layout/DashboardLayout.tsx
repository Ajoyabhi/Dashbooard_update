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
    <div className={`flex h-screen ${darkMode 
      ? 'bg-neutral-900' 
      : 'bg-gradient-to-br from-neutral-50 via-blue-50/20 to-neutral-50'}`}>
      {/* Sidebar for desktop */}
      <div className={`hidden md:block transition-all duration-300 ease-out ${desktopSidebarOpen ? 'w-72' : 'w-0'}`}>
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
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-out">
        {/* Premium Banking Header */}
        <header className={`${darkMode 
          ? 'bg-neutral-900/95 backdrop-blur-xl border-neutral-800/50' 
          : 'bg-white/95 backdrop-blur-xl border-neutral-200/80'} border-b shadow-banking z-20 relative`}>
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                className="md:hidden p-2.5 rounded-lg text-white hover:opacity-90 transition-all duration-200 shadow-banking" style={{background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'}}
                onClick={toggleSidebar}
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-5 w-5" />
              </button>

              {/* Desktop sidebar toggle button */}
              <button
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-lg hover:opacity-90 text-white transition-all duration-200 shadow-banking" style={{background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'}}
                onClick={toggleDesktopSidebar}
                title={desktopSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${desktopSidebarOpen ? 'rotate-180' : 'rotate-0'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex flex-col">
                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'} font-display`}>
                  {title}
                </h1>
                <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-500'} font-medium`}>
                  Welcome back, {user?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2.5 rounded-lg transition-all duration-200 ${darkMode
                  ? 'bg-neutral-800 text-yellow-400 hover:bg-neutral-700'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  } shadow-soft`}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Notifications */}
              <button className={`relative p-2.5 rounded-lg transition-all duration-200 shadow-soft ${darkMode
                ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                }`}>
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-error-500 ring-2 ring-white animate-pulse"></span>
              </button>

              {/* Premium Profile Menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={toggleProfileMenu}
                  className={`flex items-center space-x-3 cursor-pointer p-2 rounded-lg transition-all duration-200 shadow-soft ${darkMode
                    ? 'bg-neutral-800 hover:bg-neutral-700'
                    : 'bg-neutral-100 hover:bg-neutral-200'
                    }`}
                >
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-banking" style={{background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'}}>
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user?.name || 'User'}
                        className="h-9 w-9 rounded-lg object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                      {user?.name}
                    </p>
                    <p className={`text-xs capitalize ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {user?.role}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'} ${profileMenuOpen ? 'transform rotate-180' : ''}`} />
                </button>

                {/* Premium Profile Dropdown Menu */}
                {profileMenuOpen && (
                  <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-banking-lg backdrop-blur-xl border z-50 transform opacity-100 scale-100 transition-all duration-200 origin-top-right ${darkMode
                      ? 'bg-neutral-900/98 border-neutral-700/50'
                      : 'bg-white border-neutral-200/80'
                    }`}>
                    <div className="p-1" role="menu" aria-orientation="vertical">
                      <div className={`px-3 py-2.5 border-b ${darkMode ? 'border-neutral-700/50' : 'border-neutral-200'
                        }`}>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'
                          }`}>{user?.name}</p>
                        <p className={`text-xs capitalize ${darkMode ? 'text-neutral-400' : 'text-neutral-500'
                          }`}>{user?.role}</p>
                      </div>

                      <button
                        onClick={handleProfileClick}
                        className={`flex items-center w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${darkMode
                            ? 'text-neutral-300 hover:bg-neutral-800'
                            : 'text-neutral-700 hover:bg-neutral-50'
                          }`}
                        role="menuitem"
                      >
                        <UserCircle className="h-4 w-4 mr-3 text-primary-600" />
                        Profile Details
                      </button>

                      <button
                        onClick={handleChangePasswordClick}
                        className={`flex items-center w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${darkMode
                            ? 'text-neutral-300 hover:bg-neutral-800'
                            : 'text-neutral-700 hover:bg-neutral-50'
                          }`}
                        role="menuitem"
                      >
                        <Key className="h-4 w-4 mr-3 text-primary-600" />
                        Change Password
                      </button>

                      <button
                        className={`flex items-center w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${darkMode
                            ? 'text-neutral-300 hover:bg-neutral-800'
                            : 'text-neutral-700 hover:bg-neutral-50'
                          }`}
                        role="menuitem"
                      >
                        <Settings className="h-4 w-4 mr-3 text-neutral-500" />
                        Settings
                      </button>

                      <div className={`border-t mt-1 pt-1 ${darkMode ? 'border-neutral-700/50' : 'border-neutral-200'
                        }`}>
                        <button
                          onClick={logout}
                          className={`flex items-center w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${darkMode
                              ? 'text-error-400 hover:bg-error-900/20'
                              : 'text-error-600 hover:bg-error-50'
                            }`}
                          role="menuitem"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
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
        <main className={`flex-1 overflow-auto p-6 transition-all duration-300 ${darkMode ? 'bg-neutral-900' : 'bg-transparent'}`}>
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;