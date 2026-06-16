import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, X, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { getMenuItems } from '../../utils/menuItems';
import { useAuth } from '../../context/AuthContext';
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
  gst_amount: number;
  platform_fee: number;
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
    callback_received_at?: string;
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

interface StatusCheckResult {
  paymentStatus: string;
  utr?: string | null;
  payerVpa?: string | null;
  npciTxnId?: string | null;
  hdfc_status?: string | null;
  amount?: number;
  reference_id?: string;
}

export default function PayinReport() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [transactions, setTransactions] = useState<PayinRecord[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [pagination, setPagination] = useState({
    totalItems: 0, totalPages: 0, currentPage: 1,
    pageSize: 10, hasNextPage: false, hasPrevPage: false,
  });

  // Status check modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);
  const [statusCheckResult, setStatusCheckResult] = useState<StatusCheckResult | null>(null);
  const [statusCheckError, setStatusCheckError] = useState<string | null>(null);
  const [checkedReferenceId, setCheckedReferenceId] = useState('');

  const statusOptions: FilterOption[] = [
    { label: 'All Status', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' },
  ];

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        status: selectedStatus,
        search: searchTerm,
      });
      if (dateRange.startDate) params.append('startDate', dateRange.startDate.toISOString());
      if (dateRange.endDate) params.append('endDate', dateRange.endDate.toISOString());

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

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (newPageSize: number) => { setPageSize(newPageSize); setCurrentPage(1); };

  const resetFilters = () => {
    setSelectedStatus('all');
    setDateRange({ startDate: null, endDate: null });
    setSearchTerm('');
    setCurrentPage(1);
  };

  useEffect(() => { fetchTransactions(); }, [currentPage, pageSize, selectedStatus, dateRange, searchTerm]);

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams({ status: selectedStatus !== 'all' ? selectedStatus : '', search: searchTerm });
      if (dateRange.startDate) params.append('startDate', dateRange.startDate.toISOString());
      if (dateRange.endDate) params.append('endDate', dateRange.endDate.toISOString());

      const response = await api.get(`/user/payin_reports/download?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'payin-report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      window.showToast('error', 'Failed to download report');
    }
  };

  const handleCheckStatus = async (referenceId: string) => {
    setCheckedReferenceId(referenceId);
    setStatusModalOpen(true);
    setStatusCheckLoading(true);
    setStatusCheckResult(null);
    setStatusCheckError(null);
    try {
      const response = await api.get(`/payments/payin/transaction/${referenceId}`);
      setStatusCheckResult(response.data.transaction);
    } catch (err: any) {
      setStatusCheckError(err?.response?.data?.message || 'Failed to check status');
    } finally {
      setStatusCheckLoading(false);
    }
  };

  const getGatewayStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'success' || s === 'completed' || s === 'paid') return 'text-green-600 bg-green-50';
    if (s === 'failed' || s === 'failure') return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const columns = [
    {
      header: 'Order ID',
      accessor: 'reference_id',
      cell: (value: string) => <span className="font-medium text-primary-600">{value}</span>,
    },
    {
      header: 'UTR',
      accessor: 'gateway_response',
      cell: (value: any) => <span className="font-mono">{value.utr || '-'}</span>,
    },
    {
      header: 'Merchant Name',
      accessor: 'user',
      cell: (value: any) => <span className="font-mono">{value.name}</span>,
    },
    {
      header: 'Name',
      accessor: 'beneficiary_details',
      cell: (value: any) => <span className="font-mono">{value.beneficiary_name}</span>,
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    {
      header: 'Charge',
      accessor: 'charges',
      cell: (value: any) => <span className="text-gray-600">{formatCurrency(value.admin_charge)}</span>,
    },
    {
      header: 'GST',
      accessor: 'gst_amount',
      cell: (value: number) => <span className="text-gray-600">{formatCurrency(value)}</span>,
    },
    {
      header: 'Platform Fee',
      accessor: 'platform_fee',
      cell: (value: number) => <span className="text-gray-600">{formatCurrency(value)}</span>,
    },
    {
      header: 'Net Amount',
      accessor: 'amount',
      cell: (value: number, row: PayinRecord) => (
        <span className="font-medium">
          {formatCurrency(value - row.charges.admin_charge - row.gst_amount - row.platform_fee)}
        </span>
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
        const canCheck = value === 'pending' || value === 'failed';
        if (!canCheck) return <span className="text-xs text-gray-400">—</span>;
        return (
          <button
            onClick={() => handleCheckStatus(row.reference_id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 whitespace-nowrap transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Check Status
          </button>
        );
      },
    },
  ];

  return (
    <DashboardLayout menuItems={getMenuItems(user?.user_type || 'user')} title="Payin Report">
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-medium text-gray-900">Payin Transactions</h2>
              <div className="flex items-center space-x-2">
                <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                </button>
                <button onClick={handleDownload} className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                      {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input type="date" value={dateRange.startDate?.toISOString().split('T')[0] || ''} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value ? new Date(e.target.value) : null })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input type="date" value={dateRange.endDate?.toISOString().split('T')[0] || ''} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value ? new Date(e.target.value) : null })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                  </div>
                </div>
              </div>
            )}

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
              Order ID: <span className="font-mono font-medium text-gray-800">{checkedReferenceId}</span>
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
