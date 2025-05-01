import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SummaryCard from '../../components/dashboard/SummaryCard';
import Table from '../../components/dashboard/Table';
import StatCard from '../../components/dashboard/StatCard';
import { adminMenuItems, mockSummaryCardsData, mockTransactions, mockPayouts, mockFundRequests } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';

const AdminDashboard: React.FC = () => {
  // Chart data for stat cards
  const transactionChartData = [
    { name: 'Jan', value: 1200 },
    { name: 'Feb', value: 1800 },
    { name: 'Mar', value: 1600 },
    { name: 'Apr', value: 2200 },
    { name: 'May', value: 1900 },
    { name: 'Jun', value: 2800 },
    { name: 'Jul', value: 2400 },
  ];
  
  const payoutChartData = [
    { name: 'Jan', value: 800 },
    { name: 'Feb', value: 1200 },
    { name: 'Mar', value: 900 },
    { name: 'Apr', value: 1400 },
    { name: 'May', value: 1100 },
    { name: 'Jun', value: 1800 },
    { name: 'Jul', value: 1500 },
  ];

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
      header: 'User',
      accessor: 'user',
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
      header: 'User',
      accessor: 'userName',
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

  // Fund request columns
  const fundRequestColumns = [
    {
      header: 'ID',
      accessor: 'id',
      cell: (value: string) => (
        <span className="text-xs font-medium text-gray-600">{value}</span>
      ),
    },
    {
      header: 'User',
      accessor: 'userName',
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
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
    {
      header: 'Action',
      accessor: 'id',
      cell: (value: string, row: any) => (
        <div className="flex space-x-2">
          {row.status === 'pending' && (
            <>
              <button
                className="text-xs bg-success-500 hover:bg-success-600 text-white px-2 py-1 rounded"
              >
                Approve
              </button>
              <button
                className="text-xs bg-error-500 hover:bg-error-600 text-white px-2 py-1 rounded"
              >
                Reject
              </button>
            </>
          )}
          {row.status !== 'pending' && (
            <button
              className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
              disabled
            >
              Processed
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Admin Dashboard">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockSummaryCardsData.map((card, index) => (
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
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Total Transactions"
            value={formatCurrency(10872.50)}
            chartData={transactionChartData}
            color="#3B82F6"
            trendValue={12.8}
            trendLabel="vs last month"
          />
          <StatCard
            title="Total Payouts"
            value={formatCurrency(5436.25)}
            chartData={payoutChartData}
            color="#059669"
            trendValue={-4.3}
            trendLabel="vs last month"
          />
        </div>
        
        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Table
            title="Recent Transactions"
            description="Latest payment transactions"
            columns={transactionColumns}
            data={mockTransactions.slice(0, 5)}
            pagination={false}
          />
          
          <Table
            title="Recent Payouts"
            description="Latest payout requests"
            columns={payoutColumns}
            data={mockPayouts}
            pagination={false}
          />
        </div>
        
        <div>
          <Table
            title="Fund Requests"
            description="Recent fund requests from users"
            columns={fundRequestColumns}
            data={mockFundRequests}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;