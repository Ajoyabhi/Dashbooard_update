import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getMenuItems } from '../../utils/menuItems';
import { useAuth } from '../../context/AuthContext';
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
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      value: `${dashboardData.settlement_balance || 0}`,
      icon: 'CreditCard',
      color: 'primary'
    },
    {
      title: 'Wallet Balance',
      value: `${dashboardData.wallet_balance || 0}`,
      icon: "Wallet",
      color: 'secondary'
    },
    {
      title: "Today's Pay-in",
      value: `${dashboardData.today_payin || 0}`,
      icon: "DollarSign",
      color: 'success'
    },
    {
      title: "Today's Payout",
      value: `${dashboardData.today_payout || 0}`,
      icon: "TrendingUp",
      color: 'danger'
    },
    {
      title: 'Total Pay-in',
      value: `${dashboardData.total_payin || 0}`,
      icon: "ArrowUpRight",
      color: 'success'
    },
    {
      title: 'Total Payout',
      value: `${dashboardData.total_payout || 0}`,
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

  // Enhanced data for new chart patterns
  const transactionData = [
    { name: 'Pay-in', value: dashboardData.total_payin || 0 },
    { name: 'Payout', value: dashboardData.total_payout || 0 }
  ];

  const balanceData = [
    { name: 'Settlement', value: dashboardData.settlement_balance || 0 },
    { name: 'Wallet', value: dashboardData.wallet_balance || 0 }
  ];

  // New chart data patterns
  const performanceData = [
    { metric: 'Pay-in Success', value: 95, fullMark: 100 },
    { metric: 'Payout Speed', value: 88, fullMark: 100 },
    { metric: 'API Response', value: 99, fullMark: 100 },
    { metric: 'Uptime', value: 99.9, fullMark: 100 },
    { metric: 'Security Score', value: 98, fullMark: 100 },
    { metric: 'User Satisfaction', value: 92, fullMark: 100 }
  ];

  const weeklyTrendData = [
    { day: 'Mon', payin: 12000, payout: 8000, balance: 4000 },
    { day: 'Tue', payin: 15000, payout: 12000, balance: 3000 },
    { day: 'Wed', payin: 18000, payout: 14000, balance: 4000 },
    { day: 'Thu', payin: 22000, payout: 16000, balance: 6000 },
    { day: 'Fri', payin: 25000, payout: 18000, balance: 7000 },
    { day: 'Sat', payin: 20000, payout: 15000, balance: 5000 },
    { day: 'Sun', payin: 16000, payout: 12000, balance: 4000 }
  ];

  const transactionFlowData = [
    { name: 'Jan', payin: 4000, payout: 2400, amt: 2400 },
    { name: 'Feb', payin: 3000, payout: 1398, amt: 2210 },
    { name: 'Mar', payin: 2000, payout: 9800, amt: 2290 },
    { name: 'Apr', payin: 2780, payout: 3908, amt: 2000 },
    { name: 'May', payin: 1890, payout: 4800, amt: 2181 },
    { name: 'Jun', payin: 2390, payout: 3800, amt: 2500 },
    { name: 'Jul', payin: 3490, payout: 4300, amt: 2100 }
  ];

  const COLORS = {
    primary: ['#3B82F6', '#1D4ED8', '#1E40AF'],
    secondary: ['#10B981', '#059669', '#047857'],
    accent: ['#F59E0B', '#D97706', '#B45309'],
    danger: ['#EF4444', '#DC2626', '#B91C1C'],
    purple: ['#8B5CF6', '#7C3AED', '#6D28D9'],
    pink: ['#EC4899', '#DB2777', '#BE185D']
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: ₹{entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <DashboardLayout menuItems={getMenuItems(user?.user_type || 'user')} title="User Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout menuItems={getMenuItems(user?.user_type || 'user')} title="User Dashboard">
      <div className="space-y-8">
        {/* Hero Section with Welcome Message */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 border border-blue-100">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user?.name || 'User'}! 👋
                </h1>
                <p className="text-lg text-gray-600">
                  Here's what's happening with your account today
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleQuickAction('payment')}
                  className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <FaArrowUp className="mr-2" />
                  Request Payment
                </button>
                <button
                  onClick={() => handleQuickAction('funds')}
                  className="inline-flex items-center px-6 py-3 bg-secondary-600 hover:bg-secondary-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <FaMoneyBillWave className="mr-2" />
                  Add Funds
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCardsData.map((card, index) => (
            <div key={index} className="group">
              <SummaryCard
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
              />
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Charts */}
          <div className="xl:col-span-2 space-y-8">
            {/* Performance Overview */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  📊 Performance Overview
                </h3>
              </div>
              <div className="p-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weeklyTrendData}>
                      <defs>
                        <linearGradient id="payinGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        wrapperStyle={{ outline: 'none' }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Area
                        type="monotone"
                        dataKey="payin"
                        stackId="1"
                        stroke="#3B82F6"
                        fill="url(#payinGradient)"
                        strokeWidth={2}
                        name="Pay-in"
                      />
                      <Area
                        type="monotone"
                        dataKey="payout"
                        stackId="1"
                        stroke="#10B981"
                        fill="url(#payoutGradient)"
                        strokeWidth={2}
                        name="Payout"
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="#F59E0B"
                        strokeWidth={3}
                        dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2 }}
                        name="Balance"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Transaction Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    🥧 Transaction Distribution
                  </h3>
                </div>
                <div className="p-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={transactionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {transactionData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? COLORS.primary[0] : COLORS.secondary[0]}
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => `₹${value?.toLocaleString()}`}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    ⚡ System Performance
                  </h3>
                </div>
                <div className="p-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={performanceData}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                        />
                        <Radar
                          name="Performance"
                          dataKey="value"
                          stroke="#8B5CF6"
                          fill="#8B5CF6"
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          wrapperStyle={{ outline: 'none' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar Content */}
          <div className="space-y-6">
            {/* API Status Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center">
                  🟢 API Status
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-800">All Systems Operational</span>
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">API v1</span>
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Online</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">API v2</span>
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Online</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Webhooks</span>
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Online</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center">
                  ⚡ Quick Actions
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <button
                    onClick={() => handleQuickAction('apiKey')}
                    className="w-full bg-accent-600 hover:bg-accent-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                  >
                    🔑 Generate API Key
                  </button>
                  <button
                    onClick={() => handleQuickAction('funds')}
                    className="w-full bg-secondary-600 hover:bg-secondary-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                  >
                    💰 Add Funds
                  </button>
                  <button
                    onClick={() => handleQuickAction('payment')}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                  >
                    📱 Request Payment
                  </button>
                </div>
              </div>
            </div>

            {/* Balance Distribution */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center">
                  💳 Balance Distribution
                </h3>
              </div>
              <div className="p-6">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={balanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {balanceData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? COLORS.purple[0] : COLORS.pink[0]}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `₹${value?.toLocaleString()}`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Transaction Flow */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center">
              📈 Monthly Transaction Flow
            </h3>
          </div>
          <div className="p-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transactionFlowData}>
                  <defs>
                    <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899" stopOpacity={1} />
                      <stop offset="100%" stopColor="#DB2777" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="payin"
                    fill="url(#barGradient1)"
                    radius={[4, 4, 0, 0]}
                    name="Pay-in"
                  />
                  <Bar
                    dataKey="payout"
                    fill="url(#barGradient2)"
                    radius={[4, 4, 0, 0]}
                    name="Payout"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                💰 Recent Payin's
              </h3>
              <p className="text-blue-100 text-sm">Your latest payin requests</p>
            </div>
            <div className="p-0">
              <Table
                title=""
                description=""
                columns={transactionColumns}
                data={dashboardData.recent_payins}
                searchable={false}
                filterable={false}
                pagination={false}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                💸 Recent Payout's
              </h3>
              <p className="text-green-100 text-sm">Your latest payout requests</p>
            </div>
            <div className="p-0">
              <Table
                title=""
                description=""
                columns={payoutColumns}
                data={dashboardData.recent_payouts}
                searchable={false}
                filterable={false}
                pagination={false}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;