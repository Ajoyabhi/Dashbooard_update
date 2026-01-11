import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Sparkles } from 'lucide-react';
import { getIconByName } from '../../data/mockData';
import { formatCurrency, formatPercentage } from '../../utils/formatUtils';

interface SummaryCardProps {
  title: string;
  value: string | number;
  percentage?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
  isCurrency?: boolean;
  darkMode?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  percentage,
  trend = 'neutral',
  icon,
  color = 'primary',
  isCurrency = true,
  darkMode = false,
}) => {
  const Icon = getIconByName(icon);

  const getColorClasses = () => {
    const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
      'primary': {
        bg: 'bg-gradient-to-br from-primary-50 to-primary-100/50',
        text: 'text-primary-700',
        border: 'border-primary-200/60',
        gradient: 'from-primary-600 to-primary-700'
      },
      'secondary': {
        bg: 'bg-gradient-to-br from-secondary-50 to-secondary-100/50',
        text: 'text-secondary-700',
        border: 'border-secondary-200/60',
        gradient: 'from-secondary-600 to-secondary-700'
      },
      'accent': {
        bg: 'bg-gradient-to-br from-accent-50 to-accent-100/50',
        text: 'text-accent-700',
        border: 'border-accent-200/60',
        gradient: 'from-accent-600 to-accent-700'
      },
      'success': {
        bg: 'bg-gradient-to-br from-success-50 to-success-100/50',
        text: 'text-success-700',
        border: 'border-success-200/60',
        gradient: 'from-success-600 to-success-700'
      },
      'warning': {
        bg: 'bg-gradient-to-br from-warning-50 to-warning-100/50',
        text: 'text-warning-700',
        border: 'border-warning-200/60',
        gradient: 'from-warning-600 to-warning-700'
      },
      'error': {
        bg: 'bg-gradient-to-br from-error-50 to-error-100/50',
        text: 'text-error-700',
        border: 'border-error-200/60',
        gradient: 'from-error-600 to-error-700'
      },
    };

    return colorMap[color] || colorMap.primary;
  };

  const getDarkColorClasses = () => {
    const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
      'primary': {
        bg: 'bg-gradient-to-br from-primary-900/20 to-blue-900/20',
        text: 'text-primary-300',
        border: 'border-primary-700/30',
        gradient: 'from-primary-400 to-blue-400'
      },
      'secondary': {
        bg: 'bg-gradient-to-br from-secondary-900/20 to-purple-900/20',
        text: 'text-secondary-300',
        border: 'border-secondary-700/30',
        gradient: 'from-secondary-400 to-purple-400'
      },
      'accent': {
        bg: 'bg-gradient-to-br from-accent-900/20 to-orange-900/20',
        text: 'text-accent-300',
        border: 'border-accent-700/30',
        gradient: 'from-accent-400 to-orange-400'
      },
      'success': {
        bg: 'bg-gradient-to-br from-success-900/20 to-emerald-900/20',
        text: 'text-success-300',
        border: 'border-success-700/30',
        gradient: 'from-success-400 to-emerald-400'
      },
      'warning': {
        bg: 'bg-gradient-to-br from-warning-900/20 to-yellow-900/20',
        text: 'text-warning-300',
        border: 'border-warning-700/30',
        gradient: 'from-warning-400 to-yellow-400'
      },
      'error': {
        bg: 'bg-gradient-to-br from-error-900/20 to-red-900/20',
        text: 'text-error-300',
        border: 'border-error-700/30',
        gradient: 'from-error-400 to-red-400'
      },
    };

    return colorMap[color] || colorMap.primary;
  };

  const getTrendIcon = () => {
    if (trend === 'up') {
      return <ArrowUpRight className="h-5 w-5 text-success-500" />;
    } else if (trend === 'down') {
      return <ArrowDownRight className="h-5 w-5 text-error-500" />;
    }
    return <TrendingUp className="h-5 w-5 text-neutral-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-success-600';
    if (trend === 'down') return 'text-error-600';
    return 'text-neutral-500';
  };

  const displayValue = isCurrency
    ? formatCurrency(value)
    : value.toLocaleString();

  const colors = darkMode ? getDarkColorClasses() : getColorClasses();

  return (
    <div className={`
      card-premium p-5 border transition-all duration-200 hover:scale-[1.01] animate-fade-in relative overflow-hidden
      ${darkMode ? 'bg-neutral-900/50 backdrop-blur-md border-neutral-800/50' : colors.bg}
      ${colors.border}
    `}>
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${colors.gradient} opacity-5 rounded-full -translate-y-14 translate-x-14`}></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className={`text-xs font-semibold ${darkMode ? 'text-neutral-300' : 'text-neutral-600'} uppercase tracking-wider`}>
            {title}
          </h3>
          <div className={`
            p-2.5 rounded-lg shadow-banking transition-all duration-200
            bg-gradient-to-br ${colors.gradient} text-white
          `}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {/* Value */}
        <div className="mb-3">
          <p className={`text-2xl font-bold font-display ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            {displayValue}
          </p>
        </div>

        {/* Trend indicator */}
        {percentage !== undefined && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-sm font-semibold ${getTrendColor()}`}>
                {formatPercentage(percentage)}
              </span>
            </div>
            <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              from last month
            </span>
            {trend === 'up' && (
              <Sparkles className="h-4 w-4 text-success-500 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;