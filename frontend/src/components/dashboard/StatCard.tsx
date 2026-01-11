import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  chartData: { name: string; value: number }[];
  color: string;
  trendValue?: number;
  trendLabel?: string;
  darkMode?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  chartData,
  color = '#3B82F6',
  trendValue,
  trendLabel,
  darkMode = false,
}) => {
  const getGradientId = () => `gradient-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const gradientId = getGradientId();

  const getTrendIcon = () => {
    if (trendValue === undefined) return <Activity className="h-4 w-4" />;
    return trendValue >= 0
      ? <TrendingUp className="h-4 w-4 text-success-500" />
      : <TrendingDown className="h-4 w-4 text-error-500" />;
  };

  const getTrendColor = () => {
    if (trendValue === undefined) return 'text-neutral-500';
    return trendValue >= 0 ? 'text-success-600' : 'text-error-600';
  };

  const getTrendBgColor = () => {
    if (trendValue === undefined) return 'bg-neutral-100 text-neutral-600';
    return trendValue >= 0
      ? 'bg-gradient-to-r from-success-100 to-emerald-100 text-success-700'
      : 'bg-gradient-to-r from-error-100 to-red-100 text-error-700';
  };

  return (
    <div className={`
      card-premium p-5 border transition-all duration-200 hover:scale-[1.01] animate-fade-in relative overflow-hidden
      ${darkMode ? 'bg-neutral-900/50 backdrop-blur-md border-neutral-800/50' : 'bg-white border-neutral-200/60'}
    `}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-primary-500/5 to-primary-600/5 rounded-full -translate-y-18 translate-x-18"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-base font-bold font-display ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            {title}
          </h3>
          {trendValue !== undefined && (
            <div className={`
              flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-soft
              ${getTrendBgColor()}
            `}>
              {getTrendIcon()}
              <span className={getTrendColor()}>
                {trendValue >= 0 ? '+' : ''}{trendValue}%
              </span>
              {trendLabel && (
                <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-5">
          <p className={`text-2xl font-bold font-display ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            {value}
          </p>
        </div>

        {/* Chart */}
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={darkMode ? '#374151' : '#e5e7eb'}
                opacity={0.3}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                axisLine={false}
                tickLine={false}
                hide
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={`
                        p-3 rounded-xl shadow-large border backdrop-blur-md
                        ${darkMode ? 'bg-neutral-800/90 border-neutral-700 text-white' : 'bg-white/90 border-neutral-200 text-neutral-900'}
                      `}>
                        <p className="font-semibold text-sm">
                          {payload[0].payload.name}
                        </p>
                        <p className="text-lg font-bold" style={{ color }}>
                          ₹{payload[0].value?.toLocaleString()}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{
                  stroke: color,
                  strokeWidth: 2,
                  strokeDasharray: "5 5"
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                dot={{
                  fill: color,
                  strokeWidth: 2,
                  r: 4,
                  stroke: darkMode ? '#1f2937' : '#ffffff'
                }}
                activeDot={{
                  r: 6,
                  stroke: color,
                  strokeWidth: 2,
                  fill: darkMode ? '#1f2937' : '#ffffff'
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatCard;