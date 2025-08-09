import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/axios';
import { User } from '../../types';
import { adminMenuItems } from '../../data/mockData';

interface TransactionRecord {
  _id: string;
  transaction_id: string;
  reference_id: string;
  amount: number;
  status: string;
  user: {
    id: string;
    user_id: string;
    name: string;
    email: string;
    mobile: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface FilterCriteria {
  userId: string;
  transactionType: 'payin' | 'payout';
  status: 'failed' | 'pending' | 'completed' | 'success' | 'all';
}

const TrashPayinPayoutReport: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<TransactionRecord[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterCriteria>({
    userId: '',
    transactionType: 'payin',
    status: 'failed'
  });

  // Fetch users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/admin/users-dropdown');
        setUsers(response.data.data || []);
      } catch (err) {
        setError('Failed to fetch users');
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  }, []);

  // Get record count based on filters
  const getRecordCount = async () => {
    if (!filters.userId) {
      setError('Please select a user first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.get(`/admin/trash-transactions/count`, {
        params: {
          userId: filters.userId,
          transactionType: filters.transactionType,
          status: filters.status
        }
      });

      setRecordCount(response.data.count || 0);
      const statusText = filters.status === 'all' ? 'all statuses' : `status "${filters.status}"`;
      setSuccess(`Found ${response.data.count} records matching your criteria (${filters.transactionType} transactions with ${statusText})`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to get record count');
      console.error('Error getting record count:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete selected records
  const deleteSelectedRecords = async () => {
    if (!filters.userId) {
      setError('Please select a user first');
      return;
    }

    if (recordCount === 0) {
      setError('No records to delete');
      return;
    }

    const statusText = filters.status === 'all' ? 'all statuses' : `status "${filters.status}"`;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${recordCount} ${filters.transactionType} transactions with ${statusText} for the selected user? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.delete('/admin/trash-transactions/delete', {
        data: {
          userId: filters.userId,
          transactionType: filters.transactionType,
          status: filters.status
        }
      });

      setSuccess(`Successfully deleted ${response.data.deletedCount} records from all transaction collections`);
      setRecordCount(0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete records');
      console.error('Error deleting records:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFilterChange = (field: keyof FilterCriteria, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setRecordCount(0); // Reset count when filters change
  };

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Trash Payin/Payout Report">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Trash Payin/Payout Report
          </h1>
          <p className="text-gray-600">
            Manage and delete transaction records based on user, type, and status
          </p>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Criteria</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* User Selection */}
            <div>
              <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
                Select User *
              </label>
              <select
                id="user"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Type */}
            <div>
              <label htmlFor="transactionType" className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <select
                id="transactionType"
                value={filters.transactionType}
                onChange={(e) => handleFilterChange('transactionType', e.target.value as 'payin' | 'payout')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="payin">Payin</option>
                <option value="payout">Payout</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value as 'failed' | 'pending' | 'completed' | 'success' | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="success">Success</option>
                <option value="all">All Statuses</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={getRecordCount}
              disabled={loading || !filters.userId}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Getting Count...
                </>
              ) : (
                'Get Record Count'
              )}
            </button>

            <button
              onClick={deleteSelectedRecords}
              disabled={deleteLoading || recordCount === 0 || !filters.userId}
              className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {deleteLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete Records'
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {recordCount > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Results</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Record Count
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                                           Found <span className="font-bold">{recordCount}</span> {filters.transactionType} transactions 
                     with {filters.status === 'all' ? 'all statuses' : `status "${filters.status}"`} for the selected user.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Warning
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Clicking "Delete Records" will permanently remove all {recordCount} records from the database. 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">How to use:</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Select a user from the dropdown</li>
            <li>Choose the transaction type (Payin or Payout)</li>
            <li>Select the status you want to filter by (or choose "All Statuses" to include all status types)</li>
            <li>Click "Get Record Count" to see how many records match your criteria</li>
            <li>If you want to delete these records, click "Delete Records"</li>
          </ol>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Selecting "All Statuses" will include transactions with failed, pending, completed, and success statuses.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Important:</strong> Deletion will remove records from PayinTransaction, PayoutTransaction, and UserTransaction collections.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TrashPayinPayoutReport;
