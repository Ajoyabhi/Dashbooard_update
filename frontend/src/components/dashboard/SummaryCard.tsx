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
        bg: 'bg-gradient-to-br from-primary-50 to-blue-50',
        text: 'text-primary-700',
        border: 'border-primary-200',
        gradient: 'from-primary-500 to-blue-500'
      },
      'secondary': {
        bg: 'bg-gradient-to-br from-secondary-50 to-purple-50',
        text: 'text-secondary-700',
        border: 'border-secondary-200',
        gradient: 'from-secondary-500 to-purple-500'
      },
      'accent': {
        bg: 'bg-gradient-to-br from-accent-50 to-orange-50',
        text: 'text-accent-700',
        border: 'border-accent-200',
        gradient: 'from-accent-500 to-orange-500'
      },
      'success': {
        bg: 'bg-gradient-to-br from-success-50 to-emerald-50',
        text: 'text-success-700',
        border: 'border-success-200',
        gradient: 'from-success-500 to-emerald-500'
      },
      'warning': {
        bg: 'bg-gradient-to-br from-warning-50 to-yellow-50',
        text: 'text-warning-700',
        border: 'border-warning-200',
        gradient: 'from-warning-500 to-yellow-500'
      },
      'error': {
        bg: 'bg-gradient-to-br from-error-50 to-red-50',
        text: 'text-error-700',
        border: 'border-error-200',
        gradient: 'from-error-500 to-red-500'
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
      card-hover p-6 border transition-all duration-500 transform hover:scale-[1.02] animate-fade-in
      ${darkMode ? 'bg-neutral-900/50 backdrop-blur-md border-neutral-800/50' : colors.bg}
      ${colors.border}
    `}>
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors.gradient} opacity-5 rounded-full -translate-y-16 translate-x-16`}></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-sm font-semibold ${darkMode ? 'text-neutral-300' : 'text-neutral-600'} uppercase tracking-wide`}>
            {title}
          </h3>
          <div className={`
            p-3 rounded-2xl shadow-soft transform hover:scale-110 transition-all duration-300
            bg-gradient-to-br ${colors.gradient} text-white
          `}>
            <Icon className="h-6 w-6" />
          </div>
        </div>

        {/* Value */}
        <div className="mb-4">
          <p className={`text-3xl font-bold font-display ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
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