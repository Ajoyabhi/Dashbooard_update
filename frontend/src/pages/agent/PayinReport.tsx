import React, { useState } from 'react';
import { Search, Calendar, Download } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { agentMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';
import { toast } from 'react-hot-toast';

// Mock payin transactions
const mockPayinTransactions = [
  {
    _id: 'payin-001',
    order_id: 'ORD-2025-001',
    transaction_id: 'TXN123456',
    utr: 'UTR789012',
    user: {
      name: 'John Smith',
      account_no: '1234567890',
      ifsc: 'HDFC0001234',
      upi_id: 'johnsmith@upi'
    },
    amount: 5000.00,
    charges: {
      admin_charge: 50.00,
      gst: 9.00,
      total_charges: 59.00
    },
    net_amount: 4941.00,
    status: 'completed',
    created_at: '2025-01-15T10:30:00',
    updated_at: '2025-01-15T10:30:00'
  },
  {
    _id: 'payin-002',
    order_id: 'ORD-2025-002',
    transaction_id: 'TXN789012',
    utr: 'UTR345678',
    user: {
      name: 'Sarah Wilson',
      account_no: '0987654321',
      ifsc: 'ICIC0005678',
      upi_id: 'sarahw@upi'
    },
    amount: 2500.00,
    charges: {
      admin_charge: 25.00,
      gst: 4.50,
      total_charges: 29.50
    },
    net_amount: 2470.50,
    status: 'pending',
    created_at: '2025-01-16T14:45:00',
    updated_at: '2025-01-16T14:45:00'
  }
];

export default function PayinReport() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDateSubmit = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Payin transactions fetched successfully');
    } catch (error) {
      toast.error('Failed to fetch payin transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Handle report download
    console.log('Downloading report...');
    toast.success('Report download started');
  };

  // Filter transactions based on search term
  const filteredTransactions = mockPayinTransactions.filter(transaction => {
    const searchString = searchTerm.toLowerCase();
    return (
      transaction.order_id.toLowerCase().includes(searchString) ||
      transaction.transaction_id.toLowerCase().includes(searchString) ||
      transaction.utr.toLowerCase().includes(searchString) ||
      transaction.user.name.toLowerCase().includes(searchString) ||
      transaction.user.account_no.includes(searchString) ||
      transaction.user.ifsc.toLowerCase().includes(searchString) ||
      transaction.user.upi_id.toLowerCase().includes(searchString)
    );
  });

  const columns = [
    {
      header: 'Order ID',
      accessor: 'order_id',
      cell: (value: string) => (
        <span className="font-medium text-primary-600">{value}</span>
      ),
    },
    {
      header: 'Transaction ID',
      accessor: 'transaction_id',
    },
    {
      header: 'UTR',
      accessor: 'utr',
    },
    {
      header: 'Name',
      accessor: 'user.name',
    },
    {
      header: 'A/C No',
      accessor: 'user.account_no',
      cell: (value: string) => (
        <span className="font-mono">{value}</span>
      ),
    },
    {
      header: 'IFSC',
      accessor: 'user.ifsc',
      cell: (value: string) => (
        <span className="font-mono">{value}</span>
      ),
    },
    {
      header: 'UPI ID',
      accessor: 'user.upi_id',
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
      accessor: 'charges.admin_charge',
      cell: (value: number) => (
        <span className="text-gray-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'GST',
      accessor: 'charges.gst',
      cell: (value: number) => (
        <span className="text-gray-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Net Amount',
      accessor: 'net_amount',
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
      accessor: 'created_at',
      cell: (value: string) => formatDate(value),
    },
  ];

  return (
    <DashboardLayout menuItems={agentMenuItems} title="Payin Report">
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
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading
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

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Order ID, Transaction ID, UTR, Name, Account No, IFSC, or UPI ID..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <Table
              columns={columns}
              data={filteredTransactions}
              pagination={true}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}