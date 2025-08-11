import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MenuItem } from '../../types';
import { getIconByName } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  items: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
  onToggle?: () => void; // Add toggle function for larger screens
}

const Sidebar: React.FC<SidebarProps> = ({ items = [], isOpen, onClose, onToggle }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Get role-specific logo text
  const getRoleTitle = () => {
    switch (user?.user_type) {
      case 'admin':
        return 'Admin Portal';
      case 'agent':
        return 'Agent Portal';
      case 'user':
      case 'payin_payout':
        return 'User Portal';
      default:
        return 'ZintexPay';
    }
  };

  // Custom active state logic for NavLink
  const getActiveClassName = (isActive: boolean) => {
    return isActive
      ? 'bg-primary-800 text-white border-l-4 border-accent-400 shadow-lg'
      : 'text-primary-100 hover:bg-primary-800 hover:text-white hover:shadow-md';
  };

  // Custom function to determine if a path should be active
  const isPathActive = (path: string) => {
    const currentPath = location.pathname;
    
    // For dashboard paths, check if it matches the user's dashboard path
    // Users with user_type 'payin_payout' should have dashboard at '/user'
    const dashboardPath = user?.user_type === 'payin_payout' ? '/user' : `/${user?.user_type}`;
    if (path === dashboardPath) {
      return currentPath === path;
    }
    
    // For all other paths, require exact match
    return currentPath === path;
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className={`
          fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 
          transition-all duration-500 ease-in-out
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          md:hidden
        `}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 h-full
        transform transition-all duration-500 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-64 bg-gradient-to-b from-primary-900 to-primary-800 text-white 
        flex flex-col shadow-2xl border-r border-primary-700
        md:${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-primary-700 bg-primary-900/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-accent-400 to-accent-500 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
              <div className="h-6 w-6 text-white">
                {React.createElement(getIconByName('Wallet'), { size: 20 })}
              </div>
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
              {getRoleTitle()}
            </span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-2">
            {(items || []).map((item, index) => {
              const Icon = getIconByName(item.icon);
              const active = isPathActive(item.path);
              
              return (
                <li key={item.path} 
                    className="transform transition-all duration-300"
                    style={{
                      animationDelay: `${index * 75}ms`,
                      animation: isOpen ? 'slideInLeft 0.4s ease-out forwards' : 'none'
                    }}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={`
                      flex items-center px-4 py-3 text-sm rounded-lg mx-2
                      transition-all duration-300 ease-in-out
                      transform hover:scale-[1.02] active:scale-[0.98]
                      ${getActiveClassName(active)}
                    `}
                  >
                    <Icon className={`h-5 w-5 mr-3 transition-all duration-300 ${active ? 'text-accent-300' : 'text-primary-300'}`} />
                    <span className="font-medium">{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto bg-gradient-to-r from-accent-500 to-accent-600 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-primary-700 bg-primary-900/30 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-xs text-primary-300 font-medium">
              ZintexPay &copy; {new Date().getFullYear()}
            </p>
            <p className="text-xs text-primary-400 mt-1">
              Secure Payment Gateway
            </p>
          </div>
        </div>
      </div>

      {/* Add CSS animation to the document head */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `
      }} />
    </>
  );
};

export default Sidebar;