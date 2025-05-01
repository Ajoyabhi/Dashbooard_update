import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SummaryCard from '../../components/dashboard/SummaryCard';
import Table from '../../components/dashboard/Table';
import { userMenuItems, mockSummaryCardsData, mockTransactions, mockPayouts } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';

const UserDashboard: React.FC = () => {
  // Filter transactions for this user (in a real app, this would come from the API)
  const userTransactions = mockTransactions.slice(0, 3);
  const userPayouts = mockPayouts.slice(0, 2);

  // Transaction columns
  const transactionColumns = [
    {
      header: 'ID',
      accessor: 'id',
      cell: (value: string) => (
        <span className="text-xs font-medium text-gray-600">{value}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Type',
      accessor: 'type',
      cell: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      header: 'Method',
      accessor: 'method',
    },
    {
      header: 'Date',
      accessor: 'date',
      cell: (value: string) => formatDate(value),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
  ];

  // Payout columns
  const payoutColumns = [
    {
      header: 'ID',
      accessor: 'id',
      cell: (value: string) => (
        <span className="text-xs font-medium text-gray-600">{value}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Fee',
      accessor: 'fee',
      cell: (value: number) => (
        <span className="text-gray-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Method',
      accessor: 'method',
    },
    {
      header: 'Date',
      accessor: 'date',
      cell: (value: string) => formatDate(value),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout menuItems={userMenuItems} title="User Dashboard">
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md transition">
                Request Payout
              </button>
              <button className="w-full bg-secondary-600 hover:bg-secondary-700 text-white py-2 px-4 rounded-md transition">
                Add Funds
              </button>
              <button className="w-full bg-accent-600 hover:bg-accent-700 text-white py-2 px-4 rounded-md transition">
                Generate API Key
              </button>
            </div>
          </div>
          
          {/* Summary Cards */}
          {mockSummaryCardsData.slice(0, 2).map((card, index) => (
            <SummaryCard
              key={index}
              title={card.title}
              value={card.value}
              percentage={card.percentage}
              trend={card.trend}
              icon={card.icon}
              color={card.color}
            />
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockSummaryCardsData.slice(2).map((card, index) => (
            <SummaryCard
              key={index + 2}
              title={card.title}
              value={card.value}
              percentage={card.percentage}
              trend={card.trend}
              icon={card.icon}
              color={card.color}
            />
          ))}
        </div>
        
        {/* API Status */}
        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">API Status</h3>
            <div className="flex items-center">
              <div className="h-3 w-3 bg-success-500 rounded-full mr-2"></div>
              <span className="text-sm text-success-700 font-medium">All Systems Operational</span>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200">
              <div className="py-2 px-4 text-sm font-medium text-gray-700">Service</div>
              <div className="py-2 px-4 text-sm font-medium text-gray-700">Status</div>
            </div>
            
            <div className="divide-y divide-gray-200">
              <div className="grid grid-cols-2">
                <div className="py-3 px-4 text-sm text-gray-800">API v1</div>
                <div className="py-3 px-4 text-sm text-success-700 flex items-center">
                  <div className="h-2 w-2 bg-success-500 rounded-full mr-2"></div>
                  Operational
                </div>
              </div>
              
              <div className="grid grid-cols-2">
                <div className="py-3 px-4 text-sm text-gray-800">API v2</div>
                <div className="py-3 px-4 text-sm text-success-700 flex items-center">
                  <div className="h-2 w-2 bg-success-500 rounded-full mr-2"></div>
                  Operational
                </div>
              </div>
              
              <div className="grid grid-cols-2">
                <div className="py-3 px-4 text-sm text-gray-800">Webhooks</div>
                <div className="py-3 px-4 text-sm text-success-700 flex items-center">
                  <div className="h-2 w-2 bg-success-500 rounded-full mr-2"></div>
                  Operational
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Table
            title="Recent Transactions"
            description="Your latest transactions"
            columns={transactionColumns}
            data={userTransactions}
            pagination={false}
          />
          
          <Table
            title="Recent Payouts"
            description="Your latest payout requests"
            columns={payoutColumns}
            data={userPayouts}
            pagination={false}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserDashboard;