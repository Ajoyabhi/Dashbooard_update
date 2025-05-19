import React, { useEffect, useState } from 'react';
import { Filter, Download, Search, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { agentMenuItems } from '../../data/mockData';
import Table from '../../components/dashboard/Table';
import { formatDate, formatCurrency } from '../../utils/formatUtils';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface FilterOption {
  label: string;
  value: string;
}

interface WalletRecord {
  transaction_type: string;
  type: string;
  createdAt: string;
  reference_id: string;
  remark: string;
  balance: {
    before: number;
    after: number;
  };
  amount: number;
  status: string;
  userName: string;
}

const AgentWalletReport = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedType, setSelectedType] = React.useState('all');
  const [selectedStatus, setSelectedStatus] = React.useState('all');
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [showFilters, setShowFilters] = React.useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<WalletRecord[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10
  });

  const typeOptions: FilterOption[] = [
    { label: 'All Types', value: 'all' },
    { label: 'Payin', value: 'payin' },
    { label: 'Payout', value: 'payout' },
  ];

  const statusOptions: FilterOption[] = [
    { label: 'All Status', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' },
    { label: 'Payin_qr_generated', value: 'payin_qr_generated' },
  ];

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        type: selectedType !== 'all' ? selectedType : '',
        status: selectedStatus !== 'all' ? selectedStatus : '',
        search: searchTerm,
      });

      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString());
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString());
      }

      const response = await api.get(`/agent/wallet-reports?${params.toString()}`);
      const { transactions, pagination: paginationData } = response.data.data;

      setTransactions(transactions);
      setPagination({
        currentPage: paginationData.currentPage,
        totalPages: paginationData.totalPages,
        totalItems: paginationData.totalItems,
        pageSize: paginationData.pageSize
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedType, selectedStatus, dateRange, searchTerm]);

  const handlePageChange = (page: number) => {
    fetchTransactions(page);
  };

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams({
        type: selectedType !== 'all' ? selectedType : '',
        status: selectedStatus !== 'all' ? selectedStatus : '',
        search: searchTerm,
      });

      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString());
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString());
      }

      const response = await api.get(`/agent/wallet-reports/download?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'wallet-report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const resetFilters = () => {
    setSelectedType('all');
    setSelectedStatus('all');
    setDateRange({ startDate: null, endDate: null });
    setSearchTerm('');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-success-100 text-success-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      case 'failed':
        return 'bg-error-100 text-error-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      header: 'Type',
      accessor: 'type',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'payin' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
          }`}>
          {value}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
      cell: (value: string) => formatDate(value),
    },
    {
      header: 'Reference ID',
      accessor: 'reference_id',
      cell: (value: string) => (
        <span className="font-medium text-primary-600">{value}</span>
      ),
    },
    {
      header: 'Description',
      accessor: 'remark',
    },
    {
      header: 'Open Balance',
      accessor: 'openBalance',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number, row: WalletRecord) => (
        <span className={`font-medium ${row.type === 'payin' ? 'text-success-600' : 'text-error-600'
          }`}>
          {row.type === 'payin' ? '+' : '-'}{formatCurrency(value)}
        </span>
      ),
    },
    {
      header: 'Balance',
      accessor: 'balance',
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
      header: 'Agent Charges',
      accessor: 'agent_charges',
      cell: (value: number) => formatCurrency(value),
    },
  ];

  return (
    <DashboardLayout menuItems={agentMenuItems} title="Wallet Report">
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-medium text-gray-900">Wallet Transactions</h2>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                </button>

                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Report
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-700">Filter Transactions</h3>
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reset Filters
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction Type
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.startDate?.toISOString().split('T')[0] || ''}
                      onChange={(e) => setDateRange({
                        ...dateRange,
                        startDate: e.target.value ? new Date(e.target.value) : null,
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.endDate?.toISOString().split('T')[0] || ''}
                      onChange={(e) => setDateRange({
                        ...dateRange,
                        endDate: e.target.value ? new Date(e.target.value) : null,
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by user, reference ID, or description..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Table */}
            <Table
              columns={columns}
              data={transactions}
              loading={loading}
              pagination={true}
              searchable={false}
              filterable={false}
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentWalletReport;