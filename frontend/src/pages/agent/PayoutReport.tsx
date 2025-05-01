import React, { useState } from 'react';
import { Search, Calendar, Download } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { agentMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';

// Mock payout transactions
const mockPayoutTransactions = [
  {
    orderId: 'ORD-2025-001',
    transactionId: 'TXN123456',
    utr: 'UTR789012',
    name: 'John Smith',
    accountNo: '1234567890',
    ifsc: 'HDFC0001234',
    amount: 5000.00,
    charge: 50.00,
    gst: 9.00,
    netAmount: 4941.00,
    status: 'completed',
    date: '2025-01-15T10:30:00',
  },
  {
    orderId: 'ORD-2025-002',
    transactionId: 'TXN789012',
    utr: 'UTR345678',
    name: 'Sarah Wilson',
    accountNo: '0987654321',
    ifsc: 'ICIC0005678',
    amount: 2500.00,
    charge: 25.00,
    gst: 4.50,
    netAmount: 2470.50,
    status: 'pending',
    date: '2025-01-16T14:45:00',
  },
];

const AgentPayoutReport = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDateSubmit = async () => {
    if (!selectedDate) {
      window.showToast('error', 'Please select a date');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.showToast('success', 'Payout transactions fetched successfully');
    } catch (error) {
      window.showToast('error', 'Failed to fetch payout transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Handle report download
    console.log('Downloading report...');
  };

  const columns = [
    {
      header: 'Order ID',
      accessor: 'orderId',
      cell: (value: string) => (
        <span className="font-medium text-primary-600">{value}</span>
      ),
    },
    {
      header: 'Transaction ID',
      accessor: 'transactionId',
    },
    {
      header: 'UTR',
      accessor: 'utr',
    },
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'A/C No',
      accessor: 'accountNo',
      cell: (value: string) => (
        <span className="font-mono">{value}</span>
      ),
    },
    {
      header: 'IFSC',
      accessor: 'ifsc',
      cell: (value: string) => (
        <span className="font-mono">{value}</span>
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
      header: 'Charge',
      accessor: 'charge',
      cell: (value: number) => (
        <span className="text-gray-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'GST',
      accessor: 'gst',
      cell: (value: number) => (
        <span className="text-gray-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Net Amount',
      accessor: 'netAmount',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
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
      header: 'Date',
      accessor: 'date',
      cell: (value: string) => formatDate(value),
    },
  ];

  return (
    <DashboardLayout menuItems={agentMenuItems} title="Payout Report">
      <div className="space-y-6">
        {/* Date Filter */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-xs">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDateSubmit}
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {loading ? 'Loading...' : 'Submit'}
              </button>
              
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <Table
              columns={columns}
              data={mockPayoutTransactions}
              pagination={true}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentPayoutReport;