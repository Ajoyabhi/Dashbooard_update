import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, User, Bell, LogOut, ChevronDown, Key, UserCircle } from 'lucide-react';
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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true); // For desktop sidebar toggle
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleDesktopSidebar = () => {
    setDesktopSidebarOpen(!desktopSidebarOpen);
  };

  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <div className={`hidden md:block transition-all duration-500 ease-out ${desktopSidebarOpen ? 'w-64' : 'w-0'}`}>
        <Sidebar 
          items={menuItems} 
          isOpen={desktopSidebarOpen} 
          onClose={() => {}} 
          onToggle={toggleDesktopSidebar}
        />
      </div>

      {/* Sidebar for mobile */}
      <div className="md:hidden">
        <Sidebar 
          items={menuItems} 
          isOpen={sidebarOpen} 
          onClose={toggleSidebar} 
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-out">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <button
                className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200"
                onClick={toggleSidebar}
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" />
              </button>
              
              {/* Desktop sidebar toggle button */}
              <button
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 mr-3"
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
              
              <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700 focus:outline-none relative transition-colors duration-200">
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-error-500 ring-2 ring-white"></span>
              </button>
              
              <div className="relative">
                <button 
                  onClick={toggleProfileMenu}
                  className="flex items-center space-x-2 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user?.name || 'User'} 
                        className="h-8 w-8 rounded-full" 
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                  <div className="hidden md:block text-sm">
                    <p className="font-medium text-gray-700">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${profileMenuOpen ? 'transform rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <button
                        onClick={handleProfileClick}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                        role="menuitem"
                      >
                        <UserCircle className="h-5 w-5 mr-2 text-gray-500" />
                        Profile Details
                      </button>
                      <button
                        onClick={handleChangePasswordClick}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                        role="menuitem"
                      >
                        <Key className="h-5 w-5 mr-2 text-gray-500" />
                        Change Password
                      </button>
                      <button
                        onClick={logout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                        role="menuitem"
                      >
                        <LogOut className="h-5 w-5 mr-2 text-gray-500" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;