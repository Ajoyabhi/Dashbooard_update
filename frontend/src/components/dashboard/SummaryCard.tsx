import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
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
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  percentage,
  trend = 'neutral',
  icon,
  color = 'primary',
  isCurrency = true,
}) => {
  const Icon = getIconByName(icon);
  
  const getColorClasses = () => {
    const colorMap: Record<string, string> = {
      'primary': 'bg-primary-50 text-primary-700 border-primary-200',
      'secondary': 'bg-secondary-50 text-secondary-700 border-secondary-200',
      'accent': 'bg-accent-50 text-accent-700 border-accent-200',
      'success': 'bg-success-50 text-success-700 border-success-200',
      'warning': 'bg-warning-50 text-warning-700 border-warning-200',
      'error': 'bg-error-50 text-error-700 border-error-200',
    };
    
    return colorMap[color] || colorMap.primary;
  };
  
  const getTrendIcon = () => {
    if (trend === 'up') {
      return <ArrowUpRight className="h-4 w-4 text-success-500" />;
    } else if (trend === 'down') {
      return <ArrowDownRight className="h-4 w-4 text-error-500" />;
    }
    return <TrendingUp className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-success-600';
    if (trend === 'down') return 'text-error-600';
    return 'text-gray-500';
  };
  
  const displayValue = isCurrency 
    ? formatCurrency(value)
    : value.toLocaleString();

  return (
    <div className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className={`p-2 rounded-full ${getColorClasses()}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      
      <div className="mb-2">
        <p className="text-2xl font-bold">{displayValue}</p>
      </div>
      
      {percentage !== undefined && (
        <div className="flex items-center">
          {getTrendIcon()}
          <span className={`text-xs font-medium ml-1 ${getTrendColor()}`}>
            {formatPercentage(percentage)}
          </span>
          <span className="text-xs text-gray-500 ml-1">from last month</span>
        </div>
      )}
    </div>
  );
};

export default SummaryCard;