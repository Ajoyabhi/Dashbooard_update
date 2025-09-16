import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MenuItem } from '../../types';
import { getIconByName } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown } from 'lucide-react';

interface SidebarProps {
  items: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
  onToggle?: () => void;
  darkMode?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ items = [], isOpen, onClose, onToggle, darkMode = false }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
        return 'PayzuTech';
    }
  };

  // Custom active state logic for NavLink
  const getActiveClassName = (isActive: boolean) => {
    if (darkMode) {
      return isActive
        ? 'bg-gradient-to-r from-primary-600/20 to-secondary-600/20 text-white border-l-4 border-accent-400 shadow-glow backdrop-blur-md'
        : 'text-neutral-300 hover:bg-gradient-to-r hover:from-neutral-800/50 hover:to-neutral-700/50 hover:text-white hover:shadow-soft backdrop-blur-sm';
    }
    return isActive
      ? 'bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-800 border-l-4 border-accent-500 shadow-soft'
      : 'text-neutral-600 hover:bg-gradient-to-r hover:from-primary-50 hover:to-secondary-50 hover:text-primary-700 hover:shadow-soft';
  };

  // Custom function to determine if a path should be active
  const isPathActive = (path: string) => {
    const currentPath = location.pathname;

    // For dashboard paths, check if it matches the user's dashboard path
    const dashboardPath = user?.user_type === 'payin_payout' ? '/user' : `/${user?.user_type}`;
    if (path === dashboardPath) {
      return currentPath === path;
    }

    // For all other paths, require exact match
    return currentPath === path;
  };

  // Check if any child path is active
  const hasActiveChild = (item: MenuItem) => {
    if (!item.children) return false;
    return item.children.some(child => child.path && isPathActive(child.path));
  };

  // Toggle dropdown expansion
  const toggleDropdown = (itemTitle: string) => {
    setExpandedItems(prev =>
      prev.includes(itemTitle)
        ? prev.filter(title => title !== itemTitle)
        : [...prev, itemTitle]
    );
  };

  // Check if dropdown is expanded
  const isDropdownExpanded = (itemTitle: string) => {
    return expandedItems.includes(itemTitle);
  };

  // Auto-expand dropdown if any child is active
  useEffect(() => {
    const currentPath = location.pathname;
    const newExpandedItems: string[] = [];

    items.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child =>
          child.path && isPathActive(child.path)
        );
        if (hasActiveChild && !expandedItems.includes(item.title)) {
          newExpandedItems.push(item.title);
        }
      }
    });

    if (newExpandedItems.length > 0) {
      setExpandedItems(prev => [...prev, ...newExpandedItems]);
    }
  }, [location.pathname, items]);

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-40 
          transition-all duration-700 ease-in-out
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          md:hidden
        `}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 h-full
        transform transition-all duration-700 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-72 ${darkMode ? 'bg-neutral-900/95 backdrop-blur-xl border-neutral-800' : 'bg-white/95 backdrop-blur-xl border-neutral-200'} 
        border-r shadow-large
        flex flex-col
        md:${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className={`p-8 border-b ${darkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-white/50'} backdrop-blur-sm`}>
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-glow transform hover:scale-105 transition-all duration-300">
              <div className="h-7 w-7 text-white">
                {React.createElement(getIconByName('Wallet'), { size: 24 })}
              </div>
            </div>
            <div className="flex flex-col">
              <span className={`text-xl font-bold font-display ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {getRoleTitle()}
              </span>
              <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-600'} font-medium`}>
                Secure Payment Gateway
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4">
          <ul className="space-y-2">
            {(items || []).map((item, index) => {
              const Icon = getIconByName(item.icon);
              const active = item.path ? isPathActive(item.path) : false;
              const hasActiveChildPath = hasActiveChild(item);
              const isExpanded = isDropdownExpanded(item.title);

              return (
                <li key={item.path || item.title}
                  className="transform transition-all duration-500"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: isOpen ? 'slideInLeft 0.6s ease-out forwards' : 'none'
                  }}>

                  {/* Main menu item */}
                  {item.path && !item.children ? (
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      className={`
                        flex items-center px-6 py-4 text-sm rounded-2xl mx-2 font-medium
                        transition-all duration-500 ease-in-out
                        transform hover:scale-[1.02] active:scale-[0.98]
                        ${getActiveClassName(active)}
                      `}
                    >
                      <Icon className={`h-5 w-5 mr-4 transition-all duration-300 ${active
                        ? darkMode ? 'text-accent-300' : 'text-accent-600'
                        : darkMode ? 'text-neutral-400' : 'text-neutral-500'
                        }`} />
                      <span className="font-semibold flex-1">{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto bg-gradient-to-r from-accent-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-soft">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ) : (
                    <div
                      className={`
                        flex items-center px-6 py-4 text-sm rounded-2xl mx-2 font-medium
                        transition-all duration-500 ease-in-out
                        transform hover:scale-[1.02] active:scale-[0.98]
                        ${item.children
                          ? `cursor-pointer ${hasActiveChildPath || isExpanded
                            ? darkMode
                              ? 'bg-gradient-to-r from-primary-600/20 to-secondary-600/20 text-white border-l-4 border-accent-400 shadow-glow backdrop-blur-md'
                              : 'bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-800 border-l-4 border-accent-500 shadow-soft'
                            : darkMode
                              ? 'text-neutral-300 hover:bg-gradient-to-r hover:from-neutral-800/50 hover:to-neutral-700/50 hover:text-white hover:shadow-soft backdrop-blur-sm'
                              : 'text-neutral-600 hover:bg-gradient-to-r hover:from-primary-50 hover:to-secondary-50 hover:text-primary-700 hover:shadow-soft'
                          }`
                          : getActiveClassName(active)
                        }
                      `}
                      onClick={() => {
                        if (item.children) {
                          toggleDropdown(item.title);
                        }
                      }}
                    >
                      <Icon className={`h-5 w-5 mr-4 transition-all duration-300 ${active || hasActiveChildPath || isExpanded
                        ? darkMode ? 'text-accent-300' : 'text-accent-600'
                        : darkMode ? 'text-neutral-400' : 'text-neutral-500'
                        }`} />
                      <span className="font-semibold flex-1">{item.title}</span>

                      {item.children && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''
                            } ${hasActiveChildPath || isExpanded
                              ? darkMode ? 'text-accent-300' : 'text-accent-600'
                              : darkMode ? 'text-neutral-400' : 'text-neutral-500'
                            }`}
                        />
                      )}

                      {item.badge && (
                        <span className="ml-auto bg-gradient-to-r from-accent-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-soft">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dropdown children */}
                  {item.children && (
                    <div className={`
                      overflow-hidden transition-all duration-300 ease-in-out
                      ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                    `}>
                      <ul className="mt-2 ml-6 space-y-1">
                        {item.children.map((child, childIndex) => {
                          const ChildIcon = getIconByName(child.icon);
                          const childActive = child.path ? isPathActive(child.path) : false;

                          return (
                            <li key={child.path}>
                              <NavLink
                                to={child.path || '#'}
                                onClick={onClose}
                                className={`
                                  flex items-center px-4 py-3 text-sm rounded-xl font-medium
                                  transition-all duration-300 ease-in-out
                                  transform hover:scale-[1.02] active:scale-[0.98]
                                  ${getActiveClassName(childActive)}
                                `}
                              >
                                <ChildIcon className={`h-4 w-4 mr-3 transition-all duration-300 ${childActive
                                  ? darkMode ? 'text-accent-300' : 'text-accent-600'
                                  : darkMode ? 'text-neutral-400' : 'text-neutral-500'
                                  }`} />
                                <span className="font-medium">{child.title}</span>
                                {child.badge && (
                                  <span className="ml-auto bg-gradient-to-r from-accent-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-soft">
                                    {child.badge}
                                  </span>
                                )}
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className={`p-6 border-t ${darkMode ? 'border-neutral-800 bg-neutral-900/30' : 'border-neutral-200 bg-white/30'} backdrop-blur-sm`}>
          <div className="text-center space-y-2">
            <div className={`w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow`}>
              <div className="h-6 w-6 text-white">
                {React.createElement(getIconByName('Wallet'), { size: 20 })}
              </div>
            </div>
            <p className={`text-xs font-bold ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
              PayzuTech &copy; {new Date().getFullYear()}
            </p>
            <p className={`text-xs ${darkMode ? 'text-neutral-500' : 'text-neutral-500'}`}>
              Powered by Advanced Technology
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
              transform: translateX(-40px);
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