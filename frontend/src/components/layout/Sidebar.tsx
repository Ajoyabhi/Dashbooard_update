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
    switch (user?.user_type) {
      case 'admin':
        return 'ZentexPay';
      case 'agent':
        return 'ZentexPay';
      case 'user':
        return 'ZentexPay';
      default:
        return 'ZentexPay';
    }
  };

  // Check if the current path matches the menu item path
  const isPathActive = (path: string) => {
    // For dashboard paths, require exact match
    if (path === `/${user?.user_type}`) {
      return location.pathname === path;
    }
    // For other paths, check if current path starts with the menu item path
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`w-64 bg-primary-900 text-white flex flex-col h-full transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      {/* Logo */}
      <div className="p-6 border-b border-primary-800">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 bg-white rounded-md flex items-center justify-center">
            <div className="h-11 w-11 text-primary-900">
              {/* {React.createElement(getIconByName('Wallet'), { size: 20 })} */}
              <img src="/images/zentexpay_logo.jpg" alt="ZentexPay Logo" className="w-full h-full" />
            </div>
          </div>
          <span className="text-xl font-medium">{getRoleTitle()}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
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
                    flex items-center px-6 py-3 text-sm
                    ${active
                      ? 'bg-primary-800 text-white border-l-4 border-accent-400'
                      : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span>{item.title}</span>
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
          ZentexPay &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Sidebar;