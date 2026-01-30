import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getMenuItems } from '../../utils/menuItems';
import { useAuth } from '../../context/AuthContext';
import SummaryCard from '../../components/dashboard/SummaryCard';
import Table from '../../components/dashboard/Table';
import { FaWallet, FaMoneyBillWave, FaArrowUp, FaArrowDown } from 'react-icons/fa';
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
    recent_payins: [] as any[],
    recent_payouts: [] as any[]
  });
  const [lastNDaysData, setLastNDaysData] = useState<any[]>([]);
  const [selectedDays, setSelectedDays] = useState(5);
  const [weeklyPerformanceData, setWeeklyPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastNDaysLoading, setLastNDaysLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchLastNDaysData();
    fetchWeeklyPerformanceData();
  }, []);

  useEffect(() => {
    fetchLastNDaysData();
  }, [selectedDays]);

  const fetchDashboardData = async () => {
    try {
      const response_data = await api.get('/user/dashboard');
      if (response_data.data.success) {
        const data_value = response_data.data.data || {};

        setDashboardData({
          settlement_balance: data_value.settlement_balance || 0,
          wallet_balance: data_value.wallet_balance || 0,
          today_payin: data_value.today_payin || 0,
          today_payout: data_value.today_payout || 0,
          total_payin: data_value.total_payin || 0,
          total_payout: data_value.total_payout || 0,
          recent_payins: Array.isArray(data_value.recent_payins) ? data_value.recent_payins : [],
          recent_payouts: Array.isArray(data_value.recent_payouts) ? data_value.recent_payouts : []
        });
      } else {
        // If success is false, ensure arrays are set
        setDashboardData(prev => ({
          ...prev,
          recent_payins: [],
          recent_payouts: []
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty arrays on error to prevent Table errors
      setDashboardData(prev => ({
        ...prev,
        recent_payins: [],
        recent_payouts: []
      }));
    } finally {
      setLoading(false);
    }
  };

  const fetchLastNDaysData = async () => {
    try {
      setLastNDaysLoading(true);
      const response = await api.get(`/user/lastNdays-transactions?days=${selectedDays}`);
      console.log(`📊 Last N Days API Response (${selectedDays} days):`, response.data);
      console.log(`📊 Cache Status:`, response.headers['x-cache'] || 'UNKNOWN');
      
      if (response.data.success) {
        // Ensure data is an array before setting it
        const data = response.data.data;
        console.log(`📊 Last N Days Data (${selectedDays} days):`, data);
        console.log(`📊 Data is array:`, Array.isArray(data));
        console.log(`📊 Data length:`, Array.isArray(data) ? data.length : 0);
        
        const processedData = Array.isArray(data) ? data : [];
        setLastNDaysData(processedData);
      } else {
        console.warn('⚠️ API returned success: false', response.data);
        // If success is false, set empty array
        setLastNDaysData([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching last N days data:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Set empty array on error to prevent map errors
      setLastNDaysData([]);
    } finally {
      setLastNDaysLoading(false);
    }
  };

  const fetchWeeklyPerformanceData = async () => {
    try {
      setWeeklyLoading(true);
      const response = await api.get('/user/lastNdays-transactions?days=7');
      if (response.data.success) {
        // Ensure data is an array before mapping
        const data = response.data.data;
        if (Array.isArray(data)) {
          // Format data for the performance chart
          const formattedData = data.map((day: any, index: number) => ({
            day: day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }) : 'N/A',
            payin: day.payin?.total_amount || 0,
            payout: day.payout?.total_amount || 0,
            balance: (day.payin?.total_amount || 0) - (day.payout?.total_amount || 0) // Calculate balance
          }));
          setWeeklyPerformanceData(formattedData);
        } else {
          setWeeklyPerformanceData([]);
        }
      } else {
        setWeeklyPerformanceData([]);
      }
    } catch (error) {
      console.error('Error fetching weekly performance data:', error);
      // Set empty array on error to prevent map errors
      setWeeklyPerformanceData([]);
    } finally {
      setWeeklyLoading(false);
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
      title: "Today's Pay-in (Net)",
      value: `${dashboardData.today_payin || 0}`,
      icon: "DollarSign",
      color: 'success'
    },
    {
      title: "Today's Payout (Net)",
      value: `${dashboardData.today_payout || 0}`,
      icon: "TrendingUp",
      color: 'danger'
    },
    {
      title: 'Total Pay-in (Net)',
      value: `${dashboardData.total_payin || 0}`,
      icon: "ArrowUpRight",
      color: 'success'
    },
    {
      title: 'Total Payout (Net)',
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

  // Use real weekly performance data instead of dummy data
  const weeklyTrendData = weeklyPerformanceData.length > 0 ? weeklyPerformanceData : [
    { day: 'Mon', payin: 0, payout: 0, balance: 0 },
    { day: 'Tue', payin: 0, payout: 0, balance: 0 },
    { day: 'Wed', payin: 0, payout: 0, balance: 0 },
    { day: 'Thu', payin: 0, payout: 0, balance: 0 },
    { day: 'Fri', payin: 0, payout: 0, balance: 0 },
    { day: 'Sat', payin: 0, payout: 0, balance: 0 },
    { day: 'Sun', payin: 0, payout: 0, balance: 0 }
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

  // Format last N days data for charts - ensure lastNDaysData is an array
  const lastNDaysChartData = (Array.isArray(lastNDaysData) ? lastNDaysData : []).map((day: any) => ({
    date: day.date ? new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
    payin: day.payin?.total_amount || 0,
    payout: day.payout?.total_amount || 0,
    payinCount: day.payin?.transaction_count || 0,
    payoutCount: day.payout?.transaction_count || 0,
    payinCharges: day.payin?.total_charges || 0,
    payoutCharges: day.payout?.total_charges || 0
  }));

  // Calculate totals for last N days - ensure lastNDaysData is an array
  const lastNDaysTotals = (Array.isArray(lastNDaysData) ? lastNDaysData : []).reduce((totals: any, day: any) => ({
    totalPayin: totals.totalPayin + (day.payin?.total_amount || 0),
    totalPayout: totals.totalPayout + (day.payout?.total_amount || 0),
    totalPayinCount: totals.totalPayinCount + (day.payin?.transaction_count || 0),
    totalPayoutCount: totals.totalPayoutCount + (day.payout?.transaction_count || 0),
    totalPayinCharges: totals.totalPayinCharges + (day.payin?.total_charges || 0),
    totalPayoutCharges: totals.totalPayoutCharges + (day.payout?.total_charges || 0),
    totalPayinGstPlatform: totals.totalPayinGstPlatform + (day.payin?.total_gst_platform || 0)
  }), {
    totalPayin: 0,
    totalPayout: 0,
    totalPayinCount: 0,
    totalPayoutCount: 0,
    totalPayinCharges: 0,
    totalPayoutCharges: 0,
    totalPayinGstPlatform: 0
  });

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
                  onClick={() => navigate('/user')}
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
                {/* Last N Days Transaction Overview */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center">
                  📊 Last {selectedDays} Days Transaction Overview
                </h3>
                <p className="text-indigo-100 text-sm">Your transaction activity over the selected period</p>
              </div>
              <div className="mt-4 lg:mt-0">
                <div className="flex items-center space-x-2">
                  <span className="text-white text-sm font-medium">Period:</span>
                  <select
                    value={selectedDays}
                    onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                    className="bg-white text-gray-800 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value={3}>3 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={10}>10 Days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            {lastNDaysLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading transaction data...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-sm font-medium">Total Pay-in</p>
                        <p className="text-2xl font-bold text-blue-800">₹{lastNDaysTotals.totalPayin.toLocaleString()}</p>
                        <p className="text-blue-600 text-xs">{lastNDaysTotals.totalPayinCount} transactions</p>
                      </div>
                      <FaArrowUp className="text-blue-500 text-2xl" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-sm font-medium">Total Payout</p>
                        <p className="text-2xl font-bold text-green-800">₹{lastNDaysTotals.totalPayout.toLocaleString()}</p>
                        <p className="text-green-600 text-xs">{lastNDaysTotals.totalPayoutCount} transactions</p>
                      </div>
                      <FaArrowDown className="text-green-500 text-2xl" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-600 text-sm font-medium">Pay-in Charges</p>
                        <p className="text-2xl font-bold text-purple-800">₹{lastNDaysTotals.totalPayinCharges.toLocaleString()}</p>
                        <p className="text-purple-600 text-xs">Total fees</p>
                      </div>
                      <FaMoneyBillWave className="text-purple-500 text-2xl" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-600 text-sm font-medium">Payout Charges</p>
                        <p className="text-2xl font-bold text-orange-800">₹{lastNDaysTotals.totalPayoutCharges.toLocaleString()}</p>
                        <p className="text-orange-600 text-xs">Total fees</p>
                      </div>
                      <FaWallet className="text-orange-500 text-2xl" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-teal-600 text-sm font-medium">Payin(GST+Platform)</p>
                        <p className="text-2xl font-bold text-teal-800">₹{lastNDaysTotals.totalPayinGstPlatform.toLocaleString()}</p>
                        <p className="text-teal-600 text-xs">GST & Platform fees</p>
                      </div>
                      <FaMoneyBillWave className="text-teal-500 text-2xl" />
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lastNDaysChartData}>
                      <defs>
                        <linearGradient id="last5DaysPayinGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="last5DaysPayoutGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis
                        dataKey="date"
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
                        fill="url(#last5DaysPayinGradient)"
                        strokeWidth={2}
                        name="Pay-in"
                      />
                      <Area
                        type="monotone"
                        dataKey="payout"
                        stackId="1"
                        stroke="#10B981"
                        fill="url(#last5DaysPayoutGradient)"
                        strokeWidth={2}
                        name="Payout"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Daily Breakdown */}
                <div className={`grid grid-cols-1 gap-4 ${selectedDays <= 5 ? 'md:grid-cols-5' : selectedDays <= 10 ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'}`}>
                  {(Array.isArray(lastNDaysData) ? lastNDaysData : []).map((day: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 text-sm mb-3">
                        {day.date ? new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-600 text-xs">Pay-in:</span>
                          <span className="text-blue-800 font-medium text-xs">₹{(day.payin?.total_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-600 text-xs">Payout:</span>
                          <span className="text-green-800 font-medium text-xs">₹{(day.payout?.total_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs">Transactions:</span>
                          <span className="text-gray-800 font-medium text-xs">{(day.payin?.transaction_count || 0) + (day.payout?.transaction_count || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-teal-600 text-xs">Payin(GST+Platform):</span>
                          <span className="text-teal-800 font-medium text-xs">₹{(day.payin?.total_gst_platform || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Charts */}
          <div className="xl:col-span-2 space-y-8">
            {/* Performance Overview */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  📊 Performance Overview (Last 7 Days)
                </h3>
                <p className="text-purple-100 text-sm">Your transaction performance over the past week</p>
              </div>
              <div className="p-6">
                {weeklyLoading ? (
                  <div className="flex items-center justify-center h-80">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading performance data...</p>
                    </div>
                  </div>
                ) : (
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
                )}
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
        {/* <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
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
        </div> */}

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