import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  chartData: { name: string; value: number }[];
  color: string;
  trendValue?: number;
  trendLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  chartData,
  color = '#3B82F6',
  trendValue,
  trendLabel,
}) => {
  const getGradientId = () => `gradient-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const gradientId = getGradientId();

  return (
    <div className="bg-white rounded-lg shadow-card p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-medium text-gray-700">{title}</h3>
        {trendValue !== undefined && (
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
            trendValue >= 0 
              ? 'bg-success-100 text-success-800' 
              : 'bg-error-100 text-error-800'
          }`}>
            {trendValue >= 0 ? '+' : ''}{trendValue}%
            {trendLabel && <span className="ml-1 text-gray-500">{trendLabel}</span>}
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <p className="text-2xl font-bold">{value}</p>
      </div>
      
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-2 border border-gray-200 shadow-sm rounded text-xs">
                      <p className="font-medium">{`${payload[0].payload.name}: ${payload[0].value}`}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatCard;