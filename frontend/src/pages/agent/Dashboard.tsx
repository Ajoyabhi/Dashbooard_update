import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SummaryCard from '../../components/dashboard/SummaryCard';
import Table from '../../components/dashboard/Table';
import { agentMenuItems, mockSummaryCardsData, mockTransactions, mockPayouts } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';

const AgentDashboard: React.FC = () => {
  // Filter transactions for this agent (in a real app, this would come from the API)
  const agentTransactions = mockTransactions.slice(0, 4);
  const agentPayouts = mockPayouts.slice(0, 3);

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
    <DashboardLayout menuItems={agentMenuItems} title="Agent Dashboard">
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
        
        {/* Client Management */}
        <div className="bg-white rounded-lg shadow-card border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Client Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <div className="text-3xl font-bold text-primary-700 mb-1">12</div>
              <div className="text-sm text-primary-900">Active Clients</div>
            </div>
            
            <div className="p-4 bg-success-50 rounded-lg border border-success-200">
              <div className="text-3xl font-bold text-success-700 mb-1">3</div>
              <div className="text-sm text-success-900">New This Month</div>
            </div>
            
            <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
              <div className="text-3xl font-bold text-warning-700 mb-1">2</div>
              <div className="text-sm text-warning-900">Pending Approval</div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md transition">
              Manage Clients
            </button>
          </div>
        </div>
        
        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Table
            title="Recent Transactions"
            description="Latest client transactions"
            columns={transactionColumns}
            data={agentTransactions}
            pagination={false}
          />
          
          <Table
            title="Recent Payouts"
            description="Latest payout requests"
            columns={payoutColumns}
            data={agentPayouts}
            pagination={false}
          />
        </div>
        
        {/* Support Tickets */}
        <div className="bg-white rounded-lg shadow-card border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Support Tickets</h3>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
              <div className="py-2 px-4 text-sm font-medium text-gray-700">ID</div>
              <div className="py-2 px-4 text-sm font-medium text-gray-700">Subject</div>
              <div className="py-2 px-4 text-sm font-medium text-gray-700">Status</div>
              <div className="py-2 px-4 text-sm font-medium text-gray-700">Last Updated</div>
            </div>
            
            <div className="divide-y divide-gray-200">
              <div className="grid grid-cols-4">
                <div className="py-3 px-4 text-sm text-gray-600">#4263</div>
                <div className="py-3 px-4 text-sm text-gray-800">Payment not received</div>
                <div className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                    In Progress
                  </span>
                </div>
                <div className="py-3 px-4 text-sm text-gray-600">2 hours ago</div>
              </div>
              
              <div className="grid grid-cols-4">
                <div className="py-3 px-4 text-sm text-gray-600">#4260</div>
                <div className="py-3 px-4 text-sm text-gray-800">API integration help</div>
                <div className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                    Resolved
                  </span>
                </div>
                <div className="py-3 px-4 text-sm text-gray-600">1 day ago</div>
              </div>
              
              <div className="grid grid-cols-4">
                <div className="py-3 px-4 text-sm text-gray-600">#4255</div>
                <div className="py-3 px-4 text-sm text-gray-800">Account verification</div>
                <div className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
                    Urgent
                  </span>
                </div>
                <div className="py-3 px-4 text-sm text-gray-600">2 days ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentDashboard;