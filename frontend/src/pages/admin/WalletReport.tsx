import React, { useState, useEffect } from 'react';
import { Download, Filter, Search, X } from 'lucide-react';
import api from '../../utils/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import DownloadPopup, { DownloadFilters } from '../../components/ui/DownloadPopup';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';
import { WalletRecord, FilterOption, DateRange } from '../../types';

interface UserOption {
  id: number;
  name: string;
  email: string;
  mobile: string;
  displayText: string;
}

const typeOptions: FilterOption[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Payout', value: 'payout' },
  { label: 'Refund', value: 'refund' },
  { label: 'Payin', value: 'payin' },
];

const statusOptions: FilterOption[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
];

export default function WalletReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [showFilters, setShowFilters] = useState(false);
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
  
  // Download popup state
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Users for dropdown
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Fetch users for dropdown
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await api.get('/admin/users-dropdown');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

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

      if (selectedUser) {
        params.append('user', selectedUser);
      }
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString());
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString());
      }

      const response = await api.get(`/admin/wallet-transactions?${params}`);
      const { pagination: paginationData, transactions } = response.data.data;

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
  }, [currentPage, pageSize, selectedType, selectedStatus, selectedUser, dateRange, searchTerm]);

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDownload = () => {
    setShowDownloadPopup(true);
  };

  const handleDownloadSubmit = async (filters: DownloadFilters) => {
    try {
      setDownloadLoading(true);
      
      // Build query parameters for download
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.user) params.append('user', filters.user);

      // Make API call to download report
      const response = await api.get(`/admin/wallet-transactions/download?${params}`, {
        responseType: 'blob', // Important for file downloads
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wallet-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Close popup and show success message
      setShowDownloadPopup(false);
      window.showToast('success', 'Report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading report:', error);
      window.showToast('error', 'Failed to download report');
    } finally {
      setDownloadLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedUser('');
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
    setPagination(prev => ({
      ...prev,
      pageSize: newPageSize,
      currentPage: 1
    }));
  };

  const columns = [
    {
      header: 'Transaction ID',
      accessor: 'transaction_id',
      cell: (value: string) => (
        <span className="font-medium text-primary-600">{value}</span>
      ),
    },
    {
      header: 'Type',
      accessor: 'transaction_type',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'payout' ? 'bg-error-100 text-error-800' :
          value === 'deposit' ? 'bg-success-100 text-success-800' :
            'bg-warning-100 text-warning-800'
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
      header: 'User',
      accessor: 'user',
      cell: (value: WalletRecord['user']) => (
        <div>
          <div className="font-medium">{value.name}</div>
          <div className="text-sm text-gray-500">{value.email}</div>
        </div>
      ),
    },
    {
      header: 'Merchant',
      accessor: 'merchant_details',
      cell: (value: WalletRecord['merchant_details']) => (
        <span className="font-medium">{value.merchant_name}</span>
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
      header: 'Charges',
      accessor: 'charges',
      cell: (value: WalletRecord['charges']) => (
        <div>
          <div className="text-sm">Admin: {formatCurrency(value.admin_charge)}</div>
        </div>
      ),
    },
    {
      header: 'Balance',
      accessor: 'balance',
      cell: (value: WalletRecord['balance']) => (
        <div>
          <div className="text-sm">Before: {formatCurrency(value.before)}</div>
          <div className="font-medium">After: {formatCurrency(value.after)}</div>
        </div>
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
    <DashboardLayout menuItems={adminMenuItems} title="Wallet Report">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
                      User
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      disabled={usersLoading}
                    >
                      <option value="">All Users</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.displayText}
                        </option>
                      ))}
                    </select>
                    {usersLoading && (
                      <p className="mt-1 text-xs text-gray-500">Loading users...</p>
                    )}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search transactions..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <Table
              columns={columns}
              data={transactions}
              pagination={true}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              totalPages={pagination.totalPages}
              currentPage={pagination.currentPage}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              searchable={true}
              filterable={false}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Download Popup */}
      <DownloadPopup
        isOpen={showDownloadPopup}
        onClose={() => setShowDownloadPopup(false)}
        onDownload={handleDownloadSubmit}
        title="Download Wallet Report"
        statusOptions={statusOptions}
        typeOptions={typeOptions}
        loading={downloadLoading}
      />
    </DashboardLayout>
  );
}