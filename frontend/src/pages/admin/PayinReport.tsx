import React, { useState, useEffect } from 'react';
import { Download, Filter, Search, X, RefreshCw, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
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

interface PayinRecord {
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
    beneficiary_name: string;
    beneficiary_email: string;
    beneficiary_phone: string;
  };
  status: string;
  gateway_response: {
    utr: string;
    status: string;
    message: string;
  };
  metadata?: {
    callback_received_at?: string;
    gateway_name?: string;
  };
  remark: string;
  createdAt: string;
  updatedAt: string;
}

interface StatusBreakdownEntry {
  count: number;
  totalAmount: number;
}

interface CollectionSummary {
  totalCount: number;
  totalAmount: number;
  statusBreakdown: Record<string, StatusBreakdownEntry>;
}

interface StatusCheckResult {
  paymentStatus: string;
  utr?: string | null;
  payerVpa?: string | null;
  npciTxnId?: string | null;
  hdfc_status?: string | null;
  ap_transaction_id?: string | null;
  amount?: number;
  reference_id?: string;
}

const statusOptions: FilterOption[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Payin QR Generated', value: 'payin_qr_generated' },
];

const gatewayOptions: FilterOption[] = [
  { label: 'All Gateways', value: 'all' },
  { label: 'Unpay', value: 'Unpay' },
  { label: 'Spay', value: 'Spay' },
  { label: 'SpayIcici', value: 'SpayIcici' },
  { label: 'HDFC', value: 'HDFC' },
  { label: 'AirPay', value: 'AirPay' },
  { label: 'Razorpay', value: 'Razorpay' },
];

export default function PayinReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGateway, setSelectedGateway] = useState('all');
  const [selectedUser, setSelectedUser] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<PayinRecord[]>([]);
  const [pagination, setPagination] = useState({
    totalItems: 0, totalPages: 0, currentPage: 1,
    pageSize: 10, hasNextPage: false, hasPrevPage: false,
  });
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Collection summary (aggregated total amount + count for current filters)
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Status check modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);
  const [statusCheckResult, setStatusCheckResult] = useState<StatusCheckResult | null>(null);
  const [statusCheckError, setStatusCheckError] = useState<string | null>(null);
  const [checkedReferenceId, setCheckedReferenceId] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);

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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        status: selectedStatus,
        search: searchTerm,
      });
      if (selectedGateway && selectedGateway !== 'all') params.append('gateway', selectedGateway);
      if (selectedUser) params.append('user', selectedUser);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate.toISOString());
      if (dateRange.endDate) params.append('endDate', dateRange.endDate.toISOString());

      const response = await api.get(`/admin/payin-transactions?${params}`);
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
      console.error('Error fetching payin transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const params = new URLSearchParams({ status: selectedStatus });
      if (selectedGateway && selectedGateway !== 'all') params.append('gateway', selectedGateway);
      if (selectedUser) params.append('user', selectedUser);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate.toISOString());
      if (dateRange.endDate) params.append('endDate', dateRange.endDate.toISOString());

      const response = await api.get(`/admin/payin-transactions/summary?${params}`);
      setSummary(response.data.data);
    } catch (error) {
      console.error('Error fetching payin collection summary:', error);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [currentPage, pageSize, selectedStatus, selectedGateway, selectedUser, dateRange, searchTerm]);
  // Summary only depends on the filters, not on pagination
  useEffect(() => { fetchSummary(); }, [selectedStatus, selectedGateway, selectedUser, dateRange]);
  useEffect(() => { fetchUsers(); }, []);

  // Format a Date into the value expected by <input type="datetime-local"> (local time)
  const toLocalInputValue = (d: Date | null) => {
    if (!d) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleCheckStatus = async (referenceId: string) => {
    setCheckedReferenceId(referenceId);
    setStatusModalOpen(true);
    setStatusCheckLoading(true);
    setStatusCheckResult(null);
    setStatusCheckError(null);
    try {
      const response = await api.get(`/admin/payin-transactions/${referenceId}/check-status`);
      setStatusCheckResult(response.data.transaction);
    } catch (err: any) {
      setStatusCheckError(err?.response?.data?.message || 'Failed to check status');
    } finally {
      setStatusCheckLoading(false);
    }
  };

  const handleResendWebhook = async (referenceId: string) => {
    if (!window.confirm(`Resend the payin callback for ${referenceId}?`)) return;
    setResendingId(referenceId);
    try {
      const response = await api.post(`/admin/payin/${referenceId}/resend-webhook`);
      toast.success(response.data?.message || 'Webhook resent successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to resend webhook');
    } finally {
      setResendingId(null);
    }
  };

  const handleDownload = () => setShowDownloadPopup(true);

  const handleDownloadSubmit = async (filters: DownloadFilters) => {
    try {
      setDownloadLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.user) params.append('user', filters.user);

      const response = await api.get(`/admin/payin-transactions/download?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payin-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
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
    setSelectedGateway('all');
    setSelectedUser('');
    setDateRange({ startDate: null, endDate: null });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    setPagination(prev => ({ ...prev, pageSize: newPageSize, currentPage: 1 }));
  };

  const getGatewayStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'success' || s === 'completed' || s === 'paid') return 'text-green-600 bg-green-50';
    if (s === 'failed' || s === 'failure') return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const columns = [
    {
      header: 'Transaction ID',
      accessor: 'transaction_id',
      cell: (value: string) => <span className="font-medium text-primary-600">{value}</span>,
    },
    {
      header: 'Reference ID',
      accessor: 'reference_id',
      cell: (value: string) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      header: 'User',
      accessor: 'user',
      cell: (value: PayinRecord['user']) => (
        <div>
          <div className="font-medium">{value.name}</div>
          <div className="text-sm text-gray-500">{value.email}</div>
        </div>
      ),
    },
    {
      header: 'Beneficiary',
      accessor: 'beneficiary_details',
      cell: (value: PayinRecord['beneficiary_details']) => (
        <div>
          <div className="font-medium">{value.beneficiary_name}</div>
          <div className="text-sm text-gray-500">{value.beneficiary_email}</div>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    {
      header: 'Charges',
      accessor: 'charges',
      cell: (value: PayinRecord['charges']) => (
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
      cell: (value: PayinRecord['gateway_response']) => (
        <span className="font-mono text-sm">{value.utr || 'N/A'}</span>
      ),
    },
    {
      header: 'Gateway',
      accessor: 'metadata',
      cell: (value: PayinRecord['metadata']) => {
        const gw = value?.gateway_name;
        const colorMap: Record<string, string> = {
          Unpay:     'bg-violet-100 text-violet-700',
          Spay:      'bg-blue-100 text-blue-700',
          SpayIcici: 'bg-indigo-100 text-indigo-700',
          HDFC:      'bg-sky-100 text-sky-700',
          AirPay:    'bg-emerald-100 text-emerald-700',
          Razorpay:  'bg-amber-100 text-amber-700',
        };
        const cls = gw ? (colorMap[gw] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-400';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
            {gw || '—'}
          </span>
        );
      },
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
      header: 'Timeline',
      accessor: 'createdAt',
      cell: (value: string, row: PayinRecord) => (
        <div className="text-xs space-y-1.5 min-w-[160px]">
          <div className="flex items-start gap-1.5">
            <Clock className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-gray-400 font-medium uppercase tracking-wide" style={{ fontSize: '10px' }}>Initiated</div>
              <div className="text-gray-700">{formatDate(value)}</div>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            {row.metadata?.callback_received_at
              ? <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
              : <XCircle className="h-3 w-3 text-gray-300 mt-0.5 shrink-0" />
            }
            <div>
              <div className="text-gray-400 font-medium uppercase tracking-wide" style={{ fontSize: '10px' }}>Callback Sent</div>
              <div className="text-gray-700">
                {row.metadata?.callback_received_at ? formatDate(row.metadata.callback_received_at) : 'Not sent yet'}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'status',
      cell: (value: string, row: PayinRecord) => {
        const canCheck = value === 'pending' || value === 'failed' || value === 'payin_qr_generated';
        const canResend = value === 'completed';
        if (!canCheck && !canResend) return <span className="text-xs text-gray-400">—</span>;
        return (
          <div className="flex items-center gap-2">
            {canCheck && (
              <button
                onClick={() => handleCheckStatus(row.reference_id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 whitespace-nowrap transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Check Status
              </button>
            )}
            {canResend && (
              <button
                onClick={() => handleResendWebhook(row.reference_id)}
                disabled={resendingId === row.reference_id}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 whitespace-nowrap transition-colors disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                {resendingId === row.reference_id ? 'Resending…' : 'Resend Webhook'}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Payin Report">
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

            {showFilters && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-700">Filter Transactions</h3>
                  <button onClick={resetFilters} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <X className="h-4 w-4 mr-1" />
                    Reset Filters
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                      {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gateway</label>
                    <select value={selectedGateway} onChange={(e) => setSelectedGateway(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                      {gatewayOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                    <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" disabled={usersLoading}>
                      <option value="">All Users</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.displayText}</option>)}
                    </select>
                    {usersLoading && <p className="mt-1 text-xs text-gray-500">Loading users...</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date &amp; Time</label>
                    <input type="datetime-local" value={toLocalInputValue(dateRange.startDate)} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value ? new Date(e.target.value) : null })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date &amp; Time</label>
                    <input type="datetime-local" value={toLocalInputValue(dateRange.endDate)} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value ? new Date(e.target.value) : null })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search transactions..." className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Collection Summary — aggregated totals for the selected user, status and date/time range */}
            <div className="mb-6 rounded-lg border border-primary-100 bg-gradient-to-r from-primary-50 to-white p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Collection Summary</h3>
                  <p className="text-xs text-gray-500">
                    {selectedUser
                      ? users.find((u) => String(u.id) === selectedUser)?.displayText || `User #${selectedUser}`
                      : 'All users'}
                    {' · '}
                    {selectedStatus === 'all' ? 'All statuses' : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
                    {' · '}
                    {selectedGateway === 'all' ? 'All gateways' : selectedGateway}
                    {dateRange.startDate || dateRange.endDate ? (
                      <> {' · '}{dateRange.startDate ? formatDate(dateRange.startDate.toISOString()) : '…'} → {dateRange.endDate ? formatDate(dateRange.endDate.toISOString()) : 'now'}</>
                    ) : ' · all time'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const start = new Date();
                    start.setHours(0, 0, 0, 0);
                    setDateRange({ startDate: start, endDate: new Date() });
                  }}
                  className="self-start inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-primary-600 text-white hover:bg-primary-700"
                >
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Today from 12 AM
                </button>
              </div>

              {summaryLoading ? (
                <div className="flex items-center text-sm text-gray-500 py-4">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Calculating totals…
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-white border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Total Amount</div>
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(summary?.totalAmount || 0)}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Transactions</div>
                    <div className="text-lg font-bold text-gray-900">{summary?.totalCount || 0}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-green-200 p-3">
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Completed
                    </div>
                    <div className="text-lg font-bold text-green-700">
                      {formatCurrency(summary?.statusBreakdown?.completed?.totalAmount || 0)}
                    </div>
                    <div className="text-xs text-gray-500">{summary?.statusBreakdown?.completed?.count || 0} txns</div>
                  </div>
                  <div className="rounded-lg bg-white border border-gray-200 p-3">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Pending / Failed
                    </div>
                    <div className="text-sm font-semibold text-gray-700">
                      {(summary?.statusBreakdown?.pending?.count || 0)} pend · {(summary?.statusBreakdown?.failed?.count || 0)} fail
                    </div>
                  </div>
                </div>
              )}
            </div>

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

      <DownloadPopup
        isOpen={showDownloadPopup}
        onClose={() => setShowDownloadPopup(false)}
        onDownload={handleDownloadSubmit}
        title="Download Payin Report"
        statusOptions={statusOptions}
        loading={downloadLoading}
      />

      {/* Check Status Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Gateway Status Check</h3>
              <button onClick={() => setStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Reference ID: <span className="font-mono font-medium text-gray-800">{checkedReferenceId}</span>
            </p>

            {statusCheckLoading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
                <span className="ml-2 text-sm text-gray-600">Checking with gateway...</span>
              </div>
            )}

            {statusCheckError && !statusCheckLoading && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                {statusCheckError}
              </div>
            )}

            {statusCheckResult && !statusCheckLoading && (
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-500">Gateway Status</span>
                  <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${getGatewayStatusColor(statusCheckResult.paymentStatus)}`}>
                    {statusCheckResult.paymentStatus}
                  </span>
                </div>
                {statusCheckResult.utr && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">UTR</span>
                    <span className="text-sm font-mono font-medium text-gray-800">{statusCheckResult.utr}</span>
                  </div>
                )}
                {statusCheckResult.payerVpa && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Payer VPA</span>
                    <span className="text-sm font-mono text-gray-800">{statusCheckResult.payerVpa}</span>
                  </div>
                )}
                {statusCheckResult.hdfc_status && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Gateway Code</span>
                    <span className="text-xs font-mono text-gray-500">{statusCheckResult.hdfc_status}</span>
                  </div>
                )}
                {statusCheckResult.npciTxnId && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">NPCI Txn ID</span>
                    <span className="text-sm font-mono text-gray-800">{statusCheckResult.npciTxnId}</span>
                  </div>
                )}
                {statusCheckResult.amount && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Amount</span>
                    <span className="text-sm font-medium text-gray-800">{formatCurrency(statusCheckResult.amount)}</span>
                  </div>
                )}
                {statusCheckResult.ap_transaction_id && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">AirPay Txn ID</span>
                    <span className="text-sm font-mono text-gray-800">{statusCheckResult.ap_transaction_id}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button onClick={() => setStatusModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
