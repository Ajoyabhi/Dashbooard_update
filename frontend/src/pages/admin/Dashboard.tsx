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
  totalRollingReserve?: number;
  totalPayout: number;
  todayPayout: number;
  totalPayin: number;
  todayPayin: number;
  totalProfit: number;
  todayProfit: number;
  totalOutflow?: number;
  totalInflow?: number;
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

interface UserWiseData {
  user_id: number;
  user_name: string;
  user_email: string;
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
    utr: string | null;
    created_at: string;
  }>;
}

interface LastNDaysData {
  date: string;
  payin: {
    total_amount: number;
    total_charges: number;
    total_gst: number;
    total_platform_fee: number;
    transaction_count: number;
    user_wise: UserWiseData[];
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
    user_wise: UserWiseData[];
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
  const [lastNDaysData, setLastNDaysData] = useState<LastNDaysData[]>([]);
  const [selectedDays, setSelectedDays] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashboardResponse, lastNDaysResponse] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get(`/admin/lastNdays-transactions?days=${selectedDays}`)
        ]);

        setDashboardData(dashboardResponse.data.data);
        setLastNDaysData(lastNDaysResponse.data.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedDays]);

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
            title="Rolling Reserve"
            value={(Number(dashboardData?.totalRollingReserve) || 0)}
            icon="ShieldCheck"
            color="warning"
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
            value={(Number(dashboardData?.totalOutflow) || 0)}
            icon="TrendingUp"
            color="secondary"
            darkMode={darkMode}
          />
          <SummaryCard
            title="InFlow Amount"
            value={(Number(dashboardData?.totalInflow
            ) || 0)}
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

        {/* Last N Days Transaction Details */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <h2 className={`text-2xl font-bold font-display ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Last {selectedDays} Days Transaction Details
            </h2>
            <div className="mt-4 lg:mt-0">
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Period:</span>
                <select
                  value={selectedDays}
                  onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                  className={`px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode
                    ? 'bg-neutral-800 text-white border-neutral-600'
                    : 'bg-white text-gray-800 border-gray-300'
                    }`}
                >
                  <option value={3}>3 Days</option>
                  <option value={5}>5 Days</option>
                  <option value={10}>10 Days</option>
                </select>
              </div>
            </div>
          </div>

          {lastNDaysData.map((dayData, index) => (
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
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Active Users:</span>
                      <span className="font-bold">{dayData.payin.user_wise?.length || 0}</span>
                    </div>
                  </div>

                  {/* User-wise Breakdown */}
                  {dayData.payin.user_wise && dayData.payin.user_wise.length > 0 && (
                    <div>
                      <h5 className={`text-sm font-bold mb-3 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                        Users Contributing ({dayData.payin.user_wise.length} user{dayData.payin.user_wise.length > 1 ? 's' : ''}):
                      </h5>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {dayData.payin.user_wise.map((userStat, uIndex) => (
                          <div key={uIndex} className={`rounded-xl p-3 ${darkMode ? 'bg-neutral-800/50 border-neutral-700/50' : 'bg-white/80 border-neutral-200/50'} border backdrop-blur-sm`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-bold text-sm">{userStat.user_name}</div>
                                <div className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>{userStat.user_email}</div>
                              </div>
                              <div className="text-right ml-3">
                                <div className="font-bold gradient-text text-base">{formatCurrency(userStat.total_amount)}</div>
                                <div className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>{userStat.transaction_count} transaction{userStat.transaction_count > 1 ? 's' : ''}</div>
                              </div>
                            </div>
                            <div className={`grid grid-cols-3 gap-2 text-xs pt-2 border-t ${darkMode ? 'border-neutral-700' : 'border-neutral-200'}`}>
                              <div>
                                <div className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Charges</div>
                                <div className="font-semibold">{formatCurrency(userStat.total_charges)}</div>
                              </div>
                              <div>
                                <div className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>GST</div>
                                <div className="font-semibold">{formatCurrency(userStat.total_gst)}</div>
                              </div>
                              <div>
                                <div className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Platform Fee</div>
                                <div className="font-semibold">{formatCurrency(userStat.total_platform_fee)}</div>
                              </div>
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
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-700'}`}>Active Users:</span>
                      <span className="font-bold">{dayData.payout.user_wise?.length || 0}</span>
                    </div>
                  </div>

                  {/* User-wise Breakdown */}
                  {dayData.payout.user_wise && dayData.payout.user_wise.length > 0 && (
                    <div>
                      <h5 className={`text-sm font-bold mb-3 ${darkMode ? 'text-green-200' : 'text-green-800'}`}>
                        Users Contributing ({dayData.payout.user_wise.length} user{dayData.payout.user_wise.length > 1 ? 's' : ''}):
                      </h5>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {dayData.payout.user_wise.map((userStat, uIndex) => (
                          <div key={uIndex} className={`rounded-xl p-3 ${darkMode ? 'bg-neutral-800/50 border-neutral-700/50' : 'bg-white/80 border-neutral-200/50'} border backdrop-blur-sm`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-bold text-sm">{userStat.user_name}</div>
                                <div className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>{userStat.user_email}</div>
                              </div>
                              <div className="text-right ml-3">
                                <div className="font-bold gradient-text text-base">{formatCurrency(userStat.total_amount)}</div>
                                <div className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>{userStat.transaction_count} transaction{userStat.transaction_count > 1 ? 's' : ''}</div>
                              </div>
                            </div>
                            <div className={`grid grid-cols-3 gap-2 text-xs pt-2 border-t ${darkMode ? 'border-neutral-700' : 'border-neutral-200'}`}>
                              <div>
                                <div className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Charges</div>
                                <div className="font-semibold">{formatCurrency(userStat.total_charges)}</div>
                              </div>
                              <div>
                                <div className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>GST</div>
                                <div className="font-semibold">{formatCurrency(userStat.total_gst)}</div>
                              </div>
                              <div>
                                <div className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Platform Fee</div>
                                <div className="font-semibold">{formatCurrency(userStat.total_platform_fee)}</div>
                              </div>
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