import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userMenuItems } from '../../data/mockData';
import SummaryCard from '../../components/dashboard/SummaryCard';
import Table from '../../components/dashboard/Table';
import { FaWallet, FaMoneyBillWave, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    settlement_balance: 0,
    wallet_balance: 0,
    today_payin: 0,
    today_payout: 0,
    total_payin: 0,
    total_payout: 0,
    recent_payins: [],
    recent_payouts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/user/dashboard');
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'payment':
        navigate('/user/payout');
        break;
      case 'funds':
        navigate('/user/fund-request');
        break;
      case 'apiKey':
        navigate('/user/developer-settings');
        break;
      default:
        break;
    }
  };

  const summaryCardsData = [
    {
      title: 'Settlement Balance',
      value: `${dashboardData.settlement_balance.toLocaleString()}`,
      icon: 'CreditCard',
      color: 'primary'
    },
    {
      title: 'Wallet Balance',
      value: `${dashboardData.wallet_balance}`,
      icon: "Wallet",
      color: 'secondary'
    },
    {
      title: "Today's Pay-in",
      value: `${dashboardData.today_payin}`,
      icon: "DollarSign",
      color: 'success'
    },
    {
      title: "Today's Payout",
      value: `${dashboardData.today_payout}`,
      icon: "TrendingUp",
      color: 'danger'
    },
    {
      title: 'Total Pay-in',
      value: `${dashboardData.total_payin}`,
      icon: "ArrowUpRight",
      color: 'success'
    },
    {
      title: 'Total Payout',
      value: `${dashboardData.total_payout}`,
      icon: "ArrowDownLeft",
      color: 'error'
    }
  ];

  const transactionColumns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      header: 'User',
      accessor: 'user',
      cell: (value: string) => value
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: string) => `₹${value.toLocaleString()}`
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      header: 'Reference ID',
      accessor: 'reference_id',
      cell: (value: string) => (
        <span className="text-xs font-mono">{value}</span>
      )
    }
  ];

  const payoutColumns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      header: 'User',
      accessor: 'user',
      cell: (value: string) => value
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: string) => `₹${value.toLocaleString()}`
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      header: 'Reference ID',
      accessor: 'reference_id',
      cell: (value: string) => (
        <span className="text-xs font-mono">{value}</span>
      )
    }
  ];

  // Prepare data for charts
  const transactionData = [
    { name: 'Pay-in', value: dashboardData.total_payin },
    { name: 'Payout', value: dashboardData.total_payout }
  ];

  const balanceData = [
    { name: 'Settlement', value: dashboardData.settlement_balance },
    { name: 'Wallet', value: dashboardData.wallet_balance }
  ];

  const todayVsTotalData = [
    { name: 'Pay-in', today: dashboardData.today_payin, total: dashboardData.total_payin },
    { name: 'Payout', today: dashboardData.today_payout, total: dashboardData.total_payout }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <DashboardLayout menuItems={userMenuItems} title="User Dashboard">
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleQuickAction('payment')}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md transition"
              >
                Request Payment
              </button>
              <button
                onClick={() => handleQuickAction('funds')}
                className="w-full bg-secondary-600 hover:bg-secondary-700 text-white py-2 px-4 rounded-md transition"
              >
                Add Funds
              </button>
              <button
                onClick={() => handleQuickAction('apiKey')}
                className="w-full bg-accent-600 hover:bg-accent-700 text-white py-2 px-4 rounded-md transition"
              >
                Generate API Key
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {summaryCardsData.slice(0, 2).map((card, index) => (
            <SummaryCard
              key={index}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {summaryCardsData.slice(2).map((card, index) => (
            <SummaryCard
              key={index + 2}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction Distribution Chart */}
          <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Transaction Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={transactionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {transactionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Balance Distribution Chart */}
          <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Balance Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={balanceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {balanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Today vs Total Comparison Chart */}
        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Today vs Total Transactions</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={todayVsTotalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="today" name="Today" fill="#0088FE" />
                <Bar dataKey="total" name="Total" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
            title="Recent Payin's"
            description="Your latest payin requests"
            columns={transactionColumns}
            data={dashboardData.recent_payins}
            searchable={false}
            filterable={false}
            pagination={false}
          />

          <Table
            title="Recent Payout's"
            description="Your latest payout requests"
            columns={payoutColumns}
            data={dashboardData.recent_payouts}
            searchable={false}
            filterable={false}
            pagination={false}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;