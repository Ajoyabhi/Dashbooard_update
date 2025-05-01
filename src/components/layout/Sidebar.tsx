import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MenuItem } from '../../types';
import { getIconByName } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  items: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ items = [], isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Get role-specific logo text
  const getRoleTitle = () => {
    switch (user?.role) {
      case 'admin':
        return 'Admin Portal';
      case 'agent':
        return 'Agent Portal';
      case 'user':
        return 'User Portal';
      default:
        return 'PayGate';
    }
  };

  // Check if the current path matches the menu item path exactly
  const isPathActive = (path: string) => {
    // For dashboard paths, require exact match
    if (path === `/${user?.role}`) {
      return location.pathname === path;
    }
    // For other paths, check for exact match
    return location.pathname === path;
  };

  return (
    <div className={`w-64 bg-primary-900 text-white flex flex-col h-full transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      {/* Logo */}
      <div className="p-6 border-b border-primary-800">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-white rounded-md flex items-center justify-center">
            <div className="h-6 w-6 text-primary-900">
              {React.createElement(getIconByName('Wallet'), { size: 20 })}
            </div>
          </div>
          <span className="text-xl font-medium">{getRoleTitle()}</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {(items || []).map((item) => {
            const Icon = getIconByName(item.icon);
            const active = isPathActive(item.path);
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center px-6 py-3 text-sm transition-all duration-200 ease-in-out
                    relative overflow-hidden
                    ${active
                      ? 'text-white bg-primary-800'
                      : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                    }
                  `}
                >
                  {/* Active indicator */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 bg-accent-400 transition-transform duration-200 ease-in-out ${
                      active ? 'translate-x-0' : '-translate-x-full'
                    }`}
                  />
                  
                  <Icon className={`h-5 w-5 mr-3 transition-colors duration-200 ${
                    active ? 'text-accent-400' : 'text-primary-100'
                  }`} />
                  
                  <span className="transition-colors duration-200">{item.title}</span>
                  
                  {item.badge && (
                    <span className="ml-auto bg-accent-500 text-white text-xs px-2 py-0.5 rounded-full">
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
      <div className="p-4 border-t border-primary-800 text-xs text-primary-300">
        <p className="text-center">
          ZintexPay &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Sidebar;