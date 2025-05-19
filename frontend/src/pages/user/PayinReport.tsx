import React, { useState, useEffect } from 'react';
import { Search, Calendar, Download, Filter, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { userMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';
import api from '../../utils/axios';

interface PayinRecord {
  _id: string;
  transaction_id: string;
  user: {
    id: string;
    user_id: string;
    name: string;
    email: string;
    mobile: string;
    userType: string;
  };
  amount: number;
  charges: {
    admin_charge: number;
    agent_charge: number;
    total_charges: number;
  };
  beneficiary_details: {
    account_number: string;
    account_ifsc: string;
    bank_name: string;
    beneficiary_name: string;
  };
  reference_id: string;
  status: string;
  gateway_response: {
    reference_id: string;
    status: string;
    message: string;
    raw_response: any;
    utr?: string;
  };
  metadata: {
    requested_ip: string;
  };
  remark: string;
  created_by: string;
  created_by_model: string;
  createdAt: string;
  updatedAt: string;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface FilterOption {
  label: string;
  value: string;
}

export default function PayinReport() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [transactions, setTransactions] = useState<PayinRecord[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

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
        status: selectedStatus,
        search: searchTerm,
      });

      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString());
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString());
      }

      const response = await api.get(`/user/payin_reports?${params}`);
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
      window.showToast('error', 'Failed to fetch payin transactions');
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedStatus('all');
    setDateRange({ startDate: null, endDate: null });
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Fetch transactions when filters or pagination changes
  useEffect(() => {
    fetchTransactions();
  }, [currentPage, pageSize, selectedStatus, dateRange, searchTerm]);

  const handleDownload = () => {
    console.log('Downloading report with filters:', {
      status: selectedStatus,
      dateRange,
      searchTerm,
    });
  };

  const columns = [
    {
      header: 'Order ID',
      accessor: 'reference_id',
      cell: (value: string) => (
        <span className="font-medium text-primary-600">{value}</span>
      ),
    },
    // {
    //   header: 'Transaction ID',
    //   accessor: 'transaction_id',
    //   cell: (value: string) => (
    //     <span className="font-mono">{value}</span>
    //   ),
    // },
    {
      header: 'UTR',
      accessor: 'gateway_response',
      cell: (value: any) => (
        <span className="font-mono">{value.utr || '-'}</span>
      ),
    },
    {
      header: 'Merchant Name',
      accessor: 'user',
      cell: (value: any) => (
        <span className="font-mono">{value.name}</span>
      ),
    },
    {
      header: 'Name',
      accessor: 'beneficiary_details',
      cell: (value: any) => (
        <span className="font-mono">{value.beneficiary_name}</span>
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
      accessor: 'charges',
      cell: (value: any) => (
        <span className="text-gray-600">{formatCurrency(value.admin_charge)}</span>
      ),
    },
    // {
    //   header: 'GST',
    //   accessor: 'charges',
    //   cell: (value: any) => (
    //     <span className="text-gray-600">{formatCurrency(value.gst)}</span>
    //   ),
    // },
    {
      header: 'Net Amount',
      accessor: 'amount',
      cell: (value: number, row: PayinRecord) => (
        <span className="font-medium">{formatCurrency(value - row.charges.admin_charge)}</span>
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
      accessor: 'createdAt',
      cell: (value: string) => formatDate(value),
    },
  ];

  return (
    <DashboardLayout menuItems={userMenuItems} title="Payin Report">
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-medium text-gray-900">Payin Transactions</h2>

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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  placeholder="Search by Order ID, Transaction ID, UTR, Name, Account No, IFSC, or UPI ID..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Table */}
            <div className="mt-6">
              <Table
                columns={columns}
                data={transactions}
                pagination={true}
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}