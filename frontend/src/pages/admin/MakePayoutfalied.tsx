import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, X, Plus, Trash2, Search, Filter, Download, Info } from 'lucide-react';
import api from '../../utils/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';

interface UpdateResult {
  modifiedCount: number;
  totalMatched: number;
  userTransactionsUpdated: number;
  payoutTransactionsUpdated: number;
  updatedTransactions: Array<{
    reference_id: string;
    status: string;
    amount: number;
    user: { name: string };
    createdAt: string;
    updatedAt: string;
  }>;
  updatedTransactionsPayout: Array<{
    reference_id: string;
    status: string;
    amount: number;
    user: { name: string };
    createdAt: string;
    updatedAt: string;
  }>;
  walletUpdates: Array<{
    user_id: number;
    user_name: string;
    amount_added: number;
    transaction_type: string;
    reference_id: string;
    old_balance: number;
    new_balance: number;
  }>;
}

interface FailedHistoryItem {
  id: number;
  reference_id: string;
  transaction_id: string | null;
  transaction_type: 'UserTransaction' | 'PayoutTransaction';
  amount: number | string;
  charges: number | string;
  total_amount: number | string;
  wallet_balance_before: number | string;
  wallet_balance_after: number | string;
  beneficiary_name: string | null;
  beneficiary_account: string | null;
  beneficiary_ifsc: string | null;
  bank_name: string | null;
  utr_number: string | null;
  remark: string | null;
  original_status: string;
  new_status: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    mobile: string;
  };
  failedByUser: {
    id: number;
    name: string;
    user_name: string;
  };
}

interface FailedHistoryResponse {
  history: FailedHistoryItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function MakePayoutFailed() {
  const [referenceNumbers, setReferenceNumbers] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [error, setError] = useState<string>('');

  // History table state
  const [historyData, setHistoryData] = useState<FailedHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({
    user: '',
    transactionType: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });

  const addReferenceNumber = () => {
    setReferenceNumbers([...referenceNumbers, '']);
  };

  const removeReferenceNumber = (index: number) => {
    if (referenceNumbers.length > 1) {
      const newRefs = referenceNumbers.filter((_, i) => i !== index);
      setReferenceNumbers(newRefs);
    }
  };

  const updateReferenceNumber = (index: number, value: string) => {
    const newRefs = [...referenceNumbers];
    newRefs[index] = value;
    setReferenceNumbers(newRefs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty reference numbers
    const validRefs = referenceNumbers.filter(ref => ref.trim() !== '');
    
    if (validRefs.length === 0) {
      setError('Please enter at least one reference number');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/admin/make-payout-failed', {
        referenceNumbers: validRefs
      });

      setResult(response.data.data);
      // Refresh the history table after successful operation
      fetchFailedHistory(currentPage);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while updating transactions');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setReferenceNumbers(['']);
    setResult(null);
    setError('');
  };

  // Fetch failed transaction history
  const fetchFailedHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...filters
      });

      const response = await api.get(`/admin/payout-failed-history?${params}`);
      setHistoryData(response.data.data);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Error fetching failed history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    setCurrentPage(1);
    fetchFailedHistory(1);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      user: '',
      transactionType: 'all',
      startDate: '',
      endDate: '',
      search: ''
    });
    setCurrentPage(1);
    fetchFailedHistory(1);
  };

  // Download failed history
  const downloadFailedHistory = async () => {
    try {
      const params = new URLSearchParams({
        ...filters
      });

      const response = await api.get(`/admin/payout-failed-history/download?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `failed-transaction-history-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading failed history:', err);
    }
  };

  // Load history on component mount
  useEffect(() => {
    fetchFailedHistory();
  }, []);

  // Helper function to safely convert to number
  const safeNumber = (value: number | string | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  };

  // Toggle row expansion
  const toggleRowExpansion = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Make Payout Failed">
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Make Payout Failed
              </h2>
              <p className="text-sm text-gray-600">
                Enter reference numbers to mark pending transactions as failed. Only pending transactions will be updated.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Reference Numbers Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Reference Numbers
                </label>
                <div className="space-y-3">
                  {referenceNumbers.map((ref, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={ref}
                        onChange={(e) => updateReferenceNumber(index, e.target.value)}
                        placeholder="Enter reference number"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                      {referenceNumbers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReferenceNumber(index)}
                          className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={addReferenceNumber}
                  className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Another Reference
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Error
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        {error}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Mark as Failed'
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reset
                </button>
              </div>
            </form>

            {/* Results */}
            {result && (
              <div className="mt-8">
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Update Successful
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Modified: {result.modifiedCount} transactions</p>
                        <p>Total Matched: {result.totalMatched} transactions</p>
                        <p>User Transactions Updated: {result.userTransactionsUpdated || 0}</p>
                        <p>Payout Transactions Updated: {result.payoutTransactionsUpdated || 0}</p>
                        <p>Wallet Updates: {result.walletUpdates?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Updated User Transactions Table */}
                {result.updatedTransactions && result.updatedTransactions.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Updated User Transactions
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reference ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Updated At
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {result.updatedTransactions.map((transaction, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {transaction.reference_id || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transaction.user?.name || 'Unknown User'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ₹{(transaction.amount || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  (transaction.status || '').toLowerCase() === 'failed' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {(transaction.status || 'Unknown').charAt(0).toUpperCase() + (transaction.status || 'Unknown').slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transaction.updatedAt ? new Date(transaction.updatedAt).toLocaleString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Updated Payout Transactions Table */}
                {result.updatedTransactionsPayout && result.updatedTransactionsPayout.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Updated Payout Transactions
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reference ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Updated At
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {result.updatedTransactionsPayout.map((transaction, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {transaction.reference_id || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transaction.user?.name || 'Unknown User'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ₹{(transaction.amount || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  (transaction.status || '').toLowerCase() === 'failed' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {(transaction.status || 'Unknown').charAt(0).toUpperCase() + (transaction.status || 'Unknown').slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transaction.updatedAt ? new Date(transaction.updatedAt).toLocaleString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Wallet Updates Table */}
                {result.walletUpdates && result.walletUpdates.length > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Wallet Balance Updates
                      </h4>
                      <div className="text-sm text-green-600 font-medium">
                        Total Refund: ₹{result.walletUpdates.reduce((sum, update) => sum + update.amount_added, 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Refund Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Previous Balance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Updated Balance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Transaction Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reference ID
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {result.walletUpdates.map((update, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {update.user_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {update.user_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                <span className="flex items-center">
                                  <span className="mr-1">+</span>
                                  ₹{update.amount_added.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ₹{update.old_balance.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                <span className="flex items-center">
                                  ₹{update.new_balance.toLocaleString()}
                                  <span className="ml-1 text-xs text-green-500">
                                    (+{((update.new_balance - update.old_balance) / update.old_balance * 100).toFixed(1)}%)
                                  </span>
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  update.transaction_type === 'UserTransaction' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {update.transaction_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {update.reference_id}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Failed Transaction History Table */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Failed Transaction History
                </h2>
                              <p className="text-sm text-gray-600">
                View all transactions that have been marked as failed by admin. Click on any row or "View Details" to see balance changes and transaction details.
              </p>
              </div>
              <button
                onClick={downloadFailedHistory}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Excel
              </button>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search by reference, UTR, etc."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type
                </label>
                <select
                  value={filters.transactionType}
                  onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="UserTransaction">User Transaction</option>
                  <option value="PayoutTransaction">Payout Transaction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              <div className="flex items-end space-x-2">
                <button
                  onClick={applyFilters}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Apply
                </button>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            {historyData && historyData.history.length > 0 && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-600">Total Failed Transactions</div>
                  <div className="text-2xl font-bold text-blue-900">{historyData.pagination.totalItems}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-600">Total Amount Refunded</div>
                  <div className="text-2xl font-bold text-green-900">
                    ₹{historyData.history.reduce((sum, item) => sum + safeNumber(item.total_amount), 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-purple-600">Total Charges Refunded</div>
                  <div className="text-2xl font-bold text-purple-900">
                    ₹{historyData.history.reduce((sum, item) => sum + safeNumber(item.charges), 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-orange-600">Total Balance Impact</div>
                  <div className="text-2xl font-bold text-orange-900">
                    ₹{historyData.history.reduce((sum, item) => sum + (safeNumber(item.wallet_balance_after) - safeNumber(item.wallet_balance_before)), 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* History Table */}
            {historyLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : historyData ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            Balance Change
                            <Info className="h-3 w-3 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Beneficiary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          UTR
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Failed By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyData.history.map((item) => (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRowExpansion(item.id)}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.reference_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.user.name}</div>
                            <div className="text-sm text-gray-500">{item.user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.transaction_type === 'UserTransaction' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.transaction_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{safeNumber(item.total_amount).toLocaleString()}
                            <div className="text-xs text-gray-500">
                              Charges: ₹{safeNumber(item.charges).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="text-gray-500 text-xs">
                                Before: ₹{safeNumber(item.wallet_balance_before).toLocaleString()}
                              </div>
                              <div className="text-green-600 font-medium">
                                After: ₹{safeNumber(item.wallet_balance_after).toLocaleString()}
                              </div>
                              <div className="text-xs text-green-500 font-medium bg-green-50 px-2 py-1 rounded">
                                +₹{(safeNumber(item.wallet_balance_after) - safeNumber(item.wallet_balance_before)).toLocaleString()} refunded
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.beneficiary_name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{item.beneficiary_account || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.utr_number || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.failedByUser.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(item.id);
                              }}
                              className="text-primary-600 hover:text-primary-800 font-medium"
                            >
                              {expandedRows.has(item.id) ? 'Hide Details' : 'View Details'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded Row with Detailed Balance Information */}
                        {expandedRows.has(item.id) && (
                          <tr className="bg-gray-50">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-lg border">
                                  <h4 className="font-medium text-gray-900 mb-2">Transaction Details</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="text-gray-500">Transaction ID:</span> {item.transaction_id || 'N/A'}</div>
                                    <div><span className="text-gray-500">Type:</span> {item.transaction_type}</div>
                                    <div><span className="text-gray-500">Original Status:</span> {item.original_status}</div>
                                    <div><span className="text-gray-500">New Status:</span> {item.new_status}</div>
                                  </div>
                                </div>
                                
                                <div className="bg-white p-4 rounded-lg border">
                                  <h4 className="font-medium text-gray-900 mb-2">Financial Impact</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="text-gray-500">Amount:</span> ₹{safeNumber(item.amount).toLocaleString()}</div>
                                    <div><span className="text-gray-500">Charges:</span> ₹{safeNumber(item.charges).toLocaleString()}</div>
                                    <div><span className="text-gray-500">Total Refunded:</span> ₹{safeNumber(item.total_amount).toLocaleString()}</div>
                                  </div>
                                </div>
                                
                                <div className="bg-white p-4 rounded-lg border">
                                  <h4 className="font-medium text-gray-900 mb-2">Wallet Balance Change</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="text-gray-500">Before:</span> ₹{safeNumber(item.wallet_balance_before).toLocaleString()}</div>
                                    <div><span className="text-green-600 font-medium">After:</span> ₹{safeNumber(item.wallet_balance_after).toLocaleString()}</div>
                                    <div><span className="text-green-500 font-medium">Difference:</span> +₹{(safeNumber(item.wallet_balance_after) - safeNumber(item.wallet_balance_before)).toLocaleString()}</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {historyData.pagination.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((historyData.pagination.currentPage - 1) * historyData.pagination.pageSize) + 1} to{' '}
                      {Math.min(historyData.pagination.currentPage * historyData.pagination.pageSize, historyData.pagination.totalItems)} of{' '}
                      {historyData.pagination.totalItems} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => fetchFailedHistory(currentPage - 1)}
                        disabled={!historyData.pagination.hasPrevPage}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {historyData.pagination.currentPage} of {historyData.pagination.totalPages}
                      </span>
                      <button
                        onClick={() => fetchFailedHistory(currentPage + 1)}
                        disabled={!historyData.pagination.hasNextPage}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No failed transaction history found.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
