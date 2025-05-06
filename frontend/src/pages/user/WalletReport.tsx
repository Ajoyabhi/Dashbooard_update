import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { userMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';
import { WalletRecord, FilterOption, DateRange } from '../../types';
import { Download, Filter, Search, X } from 'lucide-react';
import api from '../../utils/axios';

const UserWalletReport = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedType, setSelectedType] = React.useState('all');
  const [selectedStatus, setSelectedStatus] = React.useState('all');
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [showFilters, setShowFilters] = React.useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<WalletRecord[]>([]);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const typeOptions: FilterOption[] = [
    { label: 'All Types', value: 'all' },
    { label: 'Credit', value: 'credit' },
    { label: 'Debit', value: 'debit' },
  ];

  const statusOptions: FilterOption[] = [
    { label: 'All Status', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' },
  ];

  // Fetch transactions with pagination and filters
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        type: selectedType,
        status: selectedStatus,
        search: searchTerm,
      });

      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString());
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString());
      }

      const response = await api.get(`/user/wallet_reports?${params}`);
      const { transactions, pagination: paginationData } = response.data.data;

      setTransactions(transactions);
      setPagination({
        totalItems: paginationData.totalItems,
        totalPages: paginationData.totalPages,
        currentPage: paginationData.currentPage,
        pageSize: paginationData.pageSize,
        hasNextPage: paginationData.hasNextPage,
        hasPrevPage: paginationData.hasPrevPage,
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Handle error (show toast notification, etc.)
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions when filters or pagination changes
  useEffect(() => {
    fetchTransactions();
  }, [currentPage, pageSize, selectedType, selectedStatus, dateRange, searchTerm]);

  const handleDownload = () => {
    console.log('Downloading report with filters:', {
      type: selectedType,
      status: selectedStatus,
      dateRange,
      searchTerm,
    });
  };

  const resetFilters = () => {
    setSelectedType('all');
    setSelectedStatus('all');
    setDateRange({ startDate: null, endDate: null });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const columns = [
    {
      header: 'Type',
      accessor: 'transaction_type',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'credit' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
          }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      cell: (value: string) => formatDate(value),
    },
    {
      header: 'Order ID',
      accessor: 'transaction_id',
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
      accessor: 'balance.before',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number, row: WalletRecord) => (
        <span className={`font-medium ${row.transaction_type === 'credit' ? 'text-success-600' : 'text-error-600'
          }`}>
          {row.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(value)}
        </span>
      ),
    },
    {
      header: 'Wallet Balance',
      accessor: 'balance.after',
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
  ];

  return (
    <DashboardLayout menuItems={userMenuItems} title="Wallet Report">
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
                  placeholder="Search by user, order ID, or description..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Table */}
            <Table
              columns={columns}
              data={transactions}
              pagination={true}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserWalletReport;