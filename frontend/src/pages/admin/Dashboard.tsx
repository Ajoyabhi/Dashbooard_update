import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SummaryCard from '../../components/dashboard/SummaryCard';
import Table from '../../components/dashboard/Table';
import StatCard from '../../components/dashboard/StatCard';
import { adminMenuItems, mockSummaryCardsData, mockTransactions, mockPayouts, mockFundRequests } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';
import api from '../../utils/axios';
interface DashboardData {
  totalUsers: number;
  totalBalance: number;
  totalPayout: number;
  todayPayout: number;
  totalPayin: number;
  todayPayin: number;
  totalProfit: number;
  todayProfit: number;
  last7DaysData: Array<{
    date: string;
    payout: number;
    payin: number;
    profit: number;
  }>;
  recentPayoutTransactions: Array<{
    transaction_id: string;
    amount: number;
    status: string;
    reference_id: string;
    created_at: string;
    user_name: string;
    user_email: string;
    beneficiary_name: string;
    account_number: string;
    bank_name: string;
    total_charges: number;
    remark: string;
  }>;
}


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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/admin/dashboard');
        setDashboardData(response.data.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'Payout' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
          }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
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
      accessor: 'method'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <SummaryCard
            title="Total Users"
            value={(Number(dashboardData?.totalUsers) || 0)}
            icon="users"
            color="blue"
          />
          <SummaryCard
            title="Total Balance"
            value={(Number(dashboardData?.totalBalance) || 0)}
            icon="Wallet"
            color="success"
          />
          <SummaryCard
            title="Total Payin"
            value={(Number(dashboardData?.totalPayin) || 0)}
            icon="TrendingDown"
            color="warning"
          />
          <SummaryCard
            title="Total Payout"
            value={(Number(dashboardData?.totalPayout) || 0)}
            icon="TrendingUp"
            color="error"
          />
          <SummaryCard
            title="Today's Payin"
            value={(Number(dashboardData?.todayPayin) || 0)}
            icon="TrendingDown"
            color="warning"
          />
          <SummaryCard
            title="Today's Payout"
            value={(Number(dashboardData?.todayPayout) || 0)}
            icon="TrendingUp"
            color="error"
          />
          <SummaryCard
            title="Total Profit"
            value={(Number(dashboardData?.totalProfit) || 0)}
            icon="TrendingUp"
            color="purple"
          />
          <SummaryCard
            title="Today's Profit"
            value={(Number(dashboardData?.todayProfit) || 0)}
            icon="TrendingUp"
            color="orange"
          />
          <SummaryCard
            title="OutFlow Amount"
            value={(Number(dashboardData?.totaloutflow) || 0)}
            icon="TrendingUp"
            color="purple"
          />
          <SummaryCard
            title="InFlow Amount"
            value={(Number(dashboardData?.totalinflow) || 0)}
            icon="TrendingUp"
            color="orange"
          />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Payin Overview"
            value={formatCurrency(Number(dashboardData?.totalPayin) || 0)}
            chartData={dashboardData?.last7DaysData.map(item => ({
              name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              value: Number(item.payin) || 0
            })) || []}
            color="#3B82F6"
            trendValue={Number((((Number(dashboardData?.todayPayin) || 0) / (Number(dashboardData?.totalPayin) || 1)) * 100).toFixed(2))}
            trendLabel="vs 7 days"
          />
          <StatCard
            title="Payout Overview"
            value={formatCurrency(Number(dashboardData?.totalPayout) || 0)}
            chartData={dashboardData?.last7DaysData.map(item => ({
              name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              value: Number(item.payout) || 0
            })) || []}
            color="#059669"
            trendValue={Number((((Number(dashboardData?.todayPayout) || 0) / (Number(dashboardData?.totalPayout) || 1)) * 100).toFixed(2))}
            trendLabel="vs 7 days"
          />
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Table
            title="Recent Transactions"
            filterable={false}
            columns={transactionColumns}
            data={dashboardData?.recentPayoutTransactions.map(transaction => ({
              id: transaction.transaction_id,
              user: transaction.user_name,
              amount: transaction.amount,
              type: 'Payout',
              date: transaction.created_at,
              status: transaction.status
            })) || []}
            pagination={false}
          />

          <Table
            title="Recent Payouts"
            columns={payoutColumns}
            filterable={false}
            data={dashboardData?.recentPayoutTransactions.map(transaction => ({
              id: transaction.transaction_id,
              userName: transaction.user_name,
              amount: transaction.amount,
              fee: transaction.total_charges,
              method: transaction.bank_name,
              date: transaction.created_at,
              status: transaction.status
            })) || []}
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