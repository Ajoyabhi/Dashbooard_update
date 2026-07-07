import React, { useState, useEffect } from 'react';
import { Download, Filter, Search, X, Send, RefreshCw, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import DownloadPopup, { DownloadFilters } from '../../components/ui/DownloadPopup';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';
import { FilterOption, DateRange } from '../../types';

interface UserOption {
  id: number;
  name: string;
  email: string;
  mobile: string;
  displayText: string;
}

// Define PayoutRecord type
interface PayoutRecord {
  _id: string;
  transaction_id: string;
  reference_id: string;
  user: {
    name: string;
    email: string;
    mobile: string;
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
  status: string;
  gateway_response: {
    utr: string;
    status: string;
    message: string;
  };
  remark: string;
  createdAt: string;
  updatedAt: string;
}

const statusOptions: FilterOption[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Pending', value: 'pending' },
  // { label: 'Processing', value: 'processing' },
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
];

export default function PayoutReport() {
  const [searchTerm, setSearchTerm] = useState('');
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
  const [transactions, setTransactions] = useState<PayoutRecord[]>([]);
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
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<Record<string, { live_status: string; mapped_status: string; differs: boolean }>>({});

  const handleResendWebhook = async (referenceId: string) => {
    if (!window.confirm(`Resend the payout callback for ${referenceId}?`)) return;
    setResendingId(referenceId);
    try {
      const response = await api.post(`/admin/payout/${referenceId}/resend-webhook`);
      toast.success(response.data?.message || 'Webhook resent successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to resend webhook');
    } finally {
      setResendingId(null);
    }
  };

  const handleCheckStatus = async (referenceId: string) => {
    setCheckingId(referenceId);
    try {
      const response = await api.get(`/admin/payout-transactions/${referenceId}/check-status`);
      const { live_status, mapped_status, differs } = response.data;
      setCheckResults((prev) => ({ ...prev, [referenceId]: { live_status, mapped_status, differs } }));
      toast.success(`Gateway status: ${live_status}${differs ? ' (differs — can update)' : ''}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to check status');
    } finally {
      setCheckingId(null);
    }
  };

  const handleSyncStatus = async (referenceId: string, mappedStatus: string) => {
    if (!window.confirm(`Update ${referenceId} to "${mappedStatus}"? This will refund on failure and notify the merchant.`)) return;
    setSyncingId(referenceId);
    try {
      const response = await api.post(`/admin/payout-transactions/${referenceId}/sync-status`);
      if (response.data?.success) {
        toast.success(response.data?.message || 'Transaction updated');
        setCheckResults((prev) => { const next = { ...prev }; delete next[referenceId]; return next; });
        fetchTransactions();
      } else {
        toast.error(response.data?.message || 'Nothing to update');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setSyncingId(null);
    }
  };

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
        pageSize: pageSize.toString(),
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

      const response = await api.get(`/admin/payout-transactions?${params}`);
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
      console.error('Error fetching payout transactions:', error);
      // Handle error (show toast notification, etc.)
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions when filters or pagination changes
  useEffect(() => {
    fetchTransactions();
  }, [currentPage, pageSize, selectedStatus, selectedUser, dateRange, searchTerm]);

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
      if (filters.user) params.append('user', filters.user);

      // Make API call to download report
      const response = await api.get(`/admin/payout-transactions/download?${params}`, {
        responseType: 'blob', // Important for file downloads
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payout-report-${new Date().toISOString().split('T')[0]}.xlsx`);
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
      header: 'Reference ID',
      accessor: 'reference_id',
      cell: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      header: 'User',
      accessor: 'user',
      cell: (value: PayoutRecord['user']) => (
        <div>
          <div className="font-medium">{value.name}</div>
          <div className="text-sm text-gray-500">{value.email}</div>
        </div>
      ),
    },
    {
      header: 'Beneficiary',
      accessor: 'beneficiary_details',
      cell: (value: PayoutRecord['beneficiary_details']) => (
        <div>
          <div className="font-medium">{value.beneficiary_name}</div>
          <div className="text-sm text-gray-500">{value.account_number}</div>
          <div className="text-xs text-gray-400">{value.bank_name}</div>
        </div>
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
      cell: (value: PayoutRecord['charges']) => (
        <div>
          <div className="text-sm">Admin: {formatCurrency(value.admin_charge)}</div>
          <div className="text-sm">Agent: {formatCurrency(value.agent_charge)}</div>
          <div className="font-medium">Total: {formatCurrency(value.total_charges)}</div>
        </div>
      ),
    },
    {
      header: 'UTR',
      accessor: 'gateway_response',
      cell: (value: PayoutRecord['gateway_response']) => (
        <span className="font-mono text-sm">{value.utr || 'N/A'}</span>
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
    {
      header: 'Check Status',
      accessor: 'status',
      cell: (value: string, row: PayoutRecord) => {
        const canCheck = value === 'pending' || value === 'processing';
        if (!canCheck) return <span className="text-xs text-gray-400">—</span>;
        const checked = checkResults[row.reference_id];
        return (
          <div className="flex flex-col items-start gap-1">
            <button
              onClick={() => handleCheckStatus(row.reference_id)}
              disabled={checkingId === row.reference_id}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 whitespace-nowrap transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${checkingId === row.reference_id ? 'animate-spin' : ''}`} />
              {checkingId === row.reference_id ? 'Checking…' : 'Check Status'}
            </button>
            {checked && (
              <span className={`text-xs font-medium ${checked.differs ? 'text-amber-600' : 'text-green-600'}`}>
                Gateway: {checked.live_status}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Sync',
      accessor: 'status',
      cell: (value: string, row: PayoutRecord) => {
        const canCheck = value === 'pending' || value === 'processing';
        const checked = checkResults[row.reference_id];
        if (!canCheck || !checked) return <span className="text-xs text-gray-400">—</span>;
        if (!checked.differs) return <span className="text-xs text-green-600">In sync</span>;
        return (
          <button
            onClick={() => handleSyncStatus(row.reference_id, checked.mapped_status)}
            disabled={syncingId === row.reference_id}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 whitespace-nowrap transition-colors disabled:opacity-50"
          >
            <RotateCw className={`h-3 w-3 ${syncingId === row.reference_id ? 'animate-spin' : ''}`} />
            {syncingId === row.reference_id ? 'Updating…' : `Update to ${checked.mapped_status}`}
          </button>
        );
      },
    },
    {
      header: 'Actions',
      accessor: 'status',
      cell: (value: string, row: PayoutRecord) => {
        const canResend = value === 'completed' || value === 'failed';
        if (!canResend) return <span className="text-xs text-gray-400">—</span>;
        return (
          <button
            onClick={() => handleResendWebhook(row.reference_id)}
            disabled={resendingId === row.reference_id}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 whitespace-nowrap transition-colors disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            {resendingId === row.reference_id ? 'Resending…' : 'Resend Webhook'}
          </button>
        );
      },
    },
  ];

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Payout Report">
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-medium text-gray-900">Payout Transactions</h2>

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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        title="Download Payout Report"
        statusOptions={statusOptions}
        loading={downloadLoading}
      />
    </DashboardLayout>
  );
}