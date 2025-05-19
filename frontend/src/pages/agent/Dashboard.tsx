import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SummaryCard from '../../components/dashboard/SummaryCard';
import Table from '../../components/dashboard/Table';
import { agentMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';
import api from '../../utils/axios';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardData {
  total_users: number;
  balances: {
    wallet: number;
    settlement: number;
  };
  profits: {
    today: {
      payin: number;
      payout: number;
    };
    total: {
      payin: number;
      payout: number;
    };
  };
  recent_transactions: {
    payin: Array<{
      reference_id: string;
      amount: number;
      status: string;
      gateway_response: {
        utr: string;
      };
      createdAt: string;
    }>;
    payout: Array<{
      reference_id: string;
      amount: number;
      status: string;
      gateway_response: {
        utr: string;
      };
      createdAt: string;
    }>;
  };
}

const AgentDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/agent/dashboard');
        setDashboardData(response.data.data);
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
      accessor: 'reference_id',
      cell: (value: string) => (
        <span className="text-sm font-medium text-primary-600">{value}</span>
      ),
    },
    {
      header: 'Merchant Name',
      accessor: 'user.name',
      cell: (value: string) => (
        <span className="text-sm font-medium text-gray-600">{value}</span>
      ),
    },
    {
      header: 'User Name',
      accessor: 'beneficiary_details.beneficiary_name',
      cell: (value: string) => (
        <span className="font-medium text-gray-600">{value}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => (
        <span className="font-medium text-sm text-success-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Type',
      accessor: 'type',
      cell: () => (
        <span className="capitalize">Payin</span>
      ),
    },
    {
      header: 'Date',
      accessor: 'createdAt',
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
      accessor: 'reference_id',
      cell: (value: string) => (
        <span className="text-sm font-medium text-primary-600">{value}</span>
      ),
    },
    {
      header: 'Merchant Name',
      accessor: 'user.name',
      cell: (value: string) => (
        <span className="text-sm font-medium text-gray-600">{value}</span>
      ),
    },
    {
      header: 'User Name',
      accessor: 'beneficiary_details.beneficiary_name',
      cell: (value: string) => (
        <span className="font-medium text-gray-600">{value}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => (
        <span className="font-medium text-sm text-success-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Type',
      accessor: 'type',
      cell: () => (
        <span className="capitalize">Payout</span>
      ),
    },
    {
      header: 'Date',
      accessor: 'createdAt',
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

  // Summary cards data
  const summaryCardsData = [
    {
      title: "Total Users",
      value: dashboardData?.total_users || 0,
      percentage: 0,
      trend: "up" as const,
      icon: "users",
      color: "blue"
    },
    {
      title: "Total WalletBalance",
      value: dashboardData?.balances.wallet || 0,
      percentage: 0,
      trend: "up" as const,
      icon: "wallet",
      color: "green"
    },
    {
      title: "Total Settlement Balance",
      value: dashboardData?.balances.settlement || 0,
      percentage: 0,
      trend: "up" as const,
      icon: "wallet",
      color: "green"
    },
    {
      title: "Total Payin Profit",
      value: dashboardData?.profits.today.payin || 0,
      percentage: 0,
      trend: "up" as const,
      icon: "profit",
      color: "purple"
    },
    {
      title: "Total Payout Profit",
      value: dashboardData?.profits.today.payout || 0,
      percentage: 0,
      trend: "up" as const,
      icon: "profit",
      color: "purple"
    },
    {
      title: "Total Payin Profit",
      value: dashboardData?.profits.total.payin || 0,
      percentage: 0,
      trend: "up" as const,
      icon: "profit",
      color: "purple"
    },
    {
      title: "Total Payout Profit",
      value: dashboardData?.profits.total.payout || 0,
      percentage: 0,
      trend: "up" as const,
      icon: "profit",
      color: "purple"
    }
  ];

  // Chart data for balance distribution
  const balanceDistributionData = {
    labels: ['Wallet Balance', 'Settlement Balance'],
    datasets: [
      {
        data: [
          dashboardData?.balances.wallet || 0,
          dashboardData?.balances.settlement || 0,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',  // Blue for wallet
          'rgba(75, 192, 192, 0.6)',  // Teal for settlement
        ],
        borderColor: [
          'rgb(54, 162, 235)',
          'rgb(75, 192, 192)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for profit distribution
  const profitDistributionData = {
    labels: ['Payin Profit', 'Payout Profit'],
    datasets: [
      {
        data: [
          dashboardData?.profits.total.payin || 0,
          dashboardData?.profits.total.payout || 0,
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(255, 99, 132)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for transaction volume
  const transactionVolumeData = {
    labels: ['Payin', 'Payout'],
    datasets: [
      {
        label: 'Transaction Volume',
        data: [
          dashboardData?.recent_transactions.payin.length || 0,
          dashboardData?.recent_transactions.payout.length || 0,
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
      },
    ],
  };

  if (loading) {
    return (
      <DashboardLayout menuItems={agentMenuItems} title="Agent Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading dashboard data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout menuItems={agentMenuItems} title="Agent Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">{error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout menuItems={agentMenuItems} title="Agent Dashboard">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaryCardsData.map((card, index) => (
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balance Distribution */}
          <div className="bg-white rounded-lg shadow-card border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Balance Distribution</h3>
            <Pie
              data={balanceDistributionData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: 'Wallet vs Settlement Balance',
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const label = context.label || '';
                        const value = context.raw as number;
                        return `${label}: ${formatCurrency(value)}`;
                      }
                    }
                  }
                },
              }}
            />
          </div>

          {/* Profit Distribution */}
          <div className="bg-white rounded-lg shadow-card border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Profit Distribution</h3>
            <Doughnut
              data={profitDistributionData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: 'Total Profit Distribution',
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const label = context.label || '';
                        const value = context.raw as number;
                        return `${label}: ${formatCurrency(value)}`;
                      }
                    }
                  }
                },
              }}
            />
          </div>

          {/* Transaction Volume */}
          <div className="bg-white rounded-lg shadow-card border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Transaction Volume</h3>
            <Bar
              data={transactionVolumeData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: 'Recent Transaction Volume',
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Table
            title="Recent Payins"
            searchable={false}
            filterable={false}
            columns={transactionColumns}
            data={dashboardData?.recent_transactions.payin || []}
            pagination={false}
          />

          <Table
            title="Recent Payouts"
            searchable={false}
            filterable={false}
            columns={payoutColumns}
            data={dashboardData?.recent_transactions.payout || []}
            pagination={false}
          />
        </div>

        {/* Support Tickets */}
        {/* <div className="bg-white rounded-lg shadow-card border border-gray-200 p-6">
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
        </div> */}
      </div>
    </DashboardLayout>
  );
};

export default AgentDashboard;