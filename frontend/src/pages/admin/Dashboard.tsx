import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SummaryCard from '../../components/dashboard/SummaryCard';
import Table from '../../components/dashboard/Table';
import StatCard from '../../components/dashboard/StatCard';
import { getMenuItems } from '../../utils/menuItems';
import { useAuth } from '../../context/AuthContext';
import { mockSummaryCardsData, mockTransactions, mockPayouts, mockFundRequests } from '../../data/mockData';
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
  totaloutflow?: number;
  totalinflow?: number;
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

interface Last5DaysData {
  date: string;
  payin: {
    total_amount: number;
    total_charges: number;
    total_gst: number;
    total_platform_fee: number;
    transaction_count: number;
    transactions: Array<{
      reference_id: string;
      amount: number;
      charges: number;
      gst: number;
      platform_fee: number;
      user_name: string;
      user_email: string;
      created_at: string;
    }>;
  };
  payout: {
    total_amount: number;
    total_charges: number;
    total_gst: number;
    total_platform_fee: number;
    transaction_count: number;
    transactions: Array<{
      reference_id: string;
      amount: number;
      charges: number;
      gst: number;
      platform_fee: number;
      user_name: string;
      user_email: string;
      created_at: string;
    }>;
  };
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [last5DaysData, setLast5DaysData] = useState<Last5DaysData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const dashboardResponse = await api.get('/admin/dashboard');
        setDashboardData(dashboardResponse.data.data);
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
        <span className={`text-xs font-bold ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
          {value}
        </span>
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
        <span className="font-bold gradient-text">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Type',
      accessor: 'type',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${value === 'Payout'
          ? 'bg-gradient-to-r from-success-100 to-emerald-100 text-success-700'
          : 'bg-gradient-to-r from-error-100 to-red-100 text-error-700'
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
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(value)}`}>
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
        <span className={`text-xs font-bold ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
          {value}
        </span>
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
        <span className="font-bold gradient-text">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Fee',
      accessor: 'fee',
      cell: (value: number) => (
        <span className={`${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
          {formatCurrency(value)}
        </span>
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
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(value)}`}>
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
        <span className={`text-xs font-bold ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
          {value}
        </span>
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
        <span className="font-bold gradient-text">{formatCurrency(value)}</span>
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
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(value)}`}>
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
              <button className="text-xs btn-success px-3 py-1">
                Approve
              </button>
              <button className="text-xs btn-error px-3 py-1">
                Reject
              </button>
            </>
          )}
          {row.status !== 'pending' && (
            <button className="text-xs bg-neutral-500 hover:bg-neutral-600 text-white px-3 py-1 rounded-xl" disabled>
              Processed
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout menuItems={getMenuItems(user?.user_type || 'admin')} title="Admin Dashboard">
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <SummaryCard
            title="Total Users"
            value={(Number(dashboardData?.totalUsers) || 0)}
            icon="users"
            color="primary"
            darkMode={darkMode}
          />
          <SummaryCard
            title="Total Balance"
            value={(Number(dashboardData?.totalBalance) || 0)}
            icon="Wallet"
            color="success"
            darkMode={darkMode}
          />
          <SummaryCard
            title="Total Payin"
            value={(Number(dashboardData?.totalPayin) || 0)}
            icon="TrendingDown"
            color="warning"
            darkMode={darkMode}
          />
          <SummaryCard
            title="Total Payout"
            value={(Number(dashboardData?.totalPayout) || 0)}
            icon="TrendingUp"
            color="error"
            darkMode={darkMode}
          />
          <SummaryCard
            title="Today's Payin"
            value={(Number(dashboardData?.todayPayin) || 0)}
            icon="TrendingDown"
            color="warning"
            darkMode={darkMode}
          />
          <SummaryCard
            title="Today's Payout"
            value={(Number(dashboardData?.todayPayout) || 0)}
            icon="TrendingUp"
            color="error"
            darkMode={darkMode}
          />
          <SummaryCard
            title="Total Profit"
            value={(Number(dashboardData?.totalProfit) || 0)}
            icon="TrendingUp"
            color="success"
            darkMode={darkMode}
          />
          <SummaryCard
            title="Today's Profit"
            value={(Number(dashboardData?.todayProfit) || 0)}
            icon="TrendingUp"
            color="accent"
            darkMode={darkMode}
          />
          <SummaryCard
            title="OutFlow Amount"
            value={(Number(dashboardData?.totaloutflow) || 0)}
            icon="TrendingUp"
            color="secondary"
            darkMode={darkMode}
          />
          <SummaryCard
            title="InFlow Amount"
            value={(Number(dashboardData?.totalinflow) || 0)}
            icon="TrendingUp"
            color="primary"
            darkMode={darkMode}
          />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            darkMode={darkMode}
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
            darkMode={darkMode}
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
            darkMode={darkMode}
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
            darkMode={darkMode}
          />
        </div>

        {/* Last 5 Days Transaction Details */}
        <div className="space-y-6">
          <h2 className={`text-2xl font-bold font-display ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Last 5 Days Transaction Details
          </h2>

          {last5DaysData.map((dayData, index) => (
            <div key={index} className={`card-hover p-6 ${darkMode ? 'bg-neutral-900/50 backdrop-blur-md border-neutral-800/50' : 'bg-white/80 backdrop-blur-md border-neutral-200/50'} border rounded-2xl shadow-soft`}>
              <h3 className={`text-lg font-bold font-display mb-6 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {new Date(dayData.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payin Section */}
                <div className={`rounded-2xl p-6 ${darkMode ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50/80 border-blue-200/50'} border backdrop-blur-sm`}>
                  <h4 className={`text-lg font-bold font-display mb-4 ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                    Payin Transactions
                  </h4>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Total Amount:</span>
                      <span className="font-bold gradient-text">{formatCurrency(dayData.payin.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Total Charges:</span>
                      <span className="font-bold">{formatCurrency(dayData.payin.total_charges)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Total GST:</span>
                      <span className="font-bold">{formatCurrency(dayData.payin.total_gst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Platform Fee:</span>
                      <span className="font-bold">{formatCurrency(dayData.payin.total_platform_fee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Transaction Count:</span>
                      <span className="font-bold">{dayData.payin.transaction_count}</span>
                    </div>
                  </div>

                  {dayData.payin.transactions.length > 0 && (
                    <div>
                      <h5 className={`text-sm font-bold mb-3 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Transaction Details:</h5>
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {dayData.payin.transactions.map((transaction, tIndex) => (
                          <div key={tIndex} className={`rounded-xl p-3 text-xs ${darkMode ? 'bg-neutral-800/50 border-neutral-700/50' : 'bg-white/80 border-neutral-200/50'} border backdrop-blur-sm`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold">{transaction.user_name}</span>
                              <span className="gradient-text">{formatCurrency(transaction.amount)}</span>
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                              Ref: {transaction.reference_id} | Charges: {formatCurrency(transaction.charges)} | GST: {formatCurrency(transaction.gst)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Payout Section */}
                <div className={`rounded-2xl p-6 ${darkMode ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50/80 border-green-200/50'} border backdrop-blur-sm`}>
                  <h4 className={`text-lg font-bold font-display mb-4 ${darkMode ? 'text-green-300' : 'text-green-900'}`}>
                    Payout Transactions
                  </h4>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-700'}`}>Total Amount:</span>
                      <span className="font-bold gradient-text">{formatCurrency(dayData.payout.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-700'}`}>Total Charges:</span>
                      <span className="font-bold">{formatCurrency(dayData.payout.total_charges)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-700'}`}>Total GST:</span>
                      <span className="font-bold">{formatCurrency(dayData.payout.total_gst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-700'}`}>Platform Fee:</span>
                      <span className="font-bold">{formatCurrency(dayData.payout.total_platform_fee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-700'}`}>Transaction Count:</span>
                      <span className="font-bold">{dayData.payout.transaction_count}</span>
                    </div>
                  </div>

                  {dayData.payout.transactions.length > 0 && (
                    <div>
                      <h5 className={`text-sm font-bold mb-3 ${darkMode ? 'text-green-200' : 'text-green-800'}`}>Transaction Details:</h5>
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {dayData.payout.transactions.map((transaction, tIndex) => (
                          <div key={tIndex} className={`rounded-xl p-3 text-xs ${darkMode ? 'bg-neutral-800/50 border-neutral-700/50' : 'bg-white/80 border-neutral-200/50'} border backdrop-blur-sm`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold">{transaction.user_name}</span>
                              <span className="gradient-text">{formatCurrency(transaction.amount)}</span>
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                              Ref: {transaction.reference_id} | Charges: {formatCurrency(transaction.charges)} | GST: {formatCurrency(transaction.gst)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;