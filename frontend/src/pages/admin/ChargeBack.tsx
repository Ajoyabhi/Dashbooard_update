import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate } from '../../utils/formatUtils';
import axios from 'axios';
import api from '../../utils/axios';

interface Transaction {
  id: string;
  name: string;
  email: string;
  mobile: string;
  amount: number;
  admin_charges: number;
  reference_id: string;
  transaction_type: string;
  status: 'pending' | 'completed' | 'failed' | 'chargeback_pending' | 'chargeback_approved' | 'chargeback_rejected';
  utr_number: string;
}

export default function ChargeBack() {
  const [utr, setUtr] = useState('');
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [action, setAction] = useState<'accept' | 'reject' | null>(null);

  const handleSearch = async () => {
    if (!utr.trim()) {
      setError('Please enter a UTR number');
      return;
    }

    setLoading(true);
    setError('');
    setTransaction(null);

    try {
      const response = await api.get(`/admin/chargeback?utr_number=${utr}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setTransaction(response.data.data);
      } else {
        setError(response.data.message || 'No transaction found with this UTR number');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        // Optionally redirect to login
        // window.location.href = '/login';
      } else {
        setError(err.response?.data?.message || 'Failed to fetch transaction details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (type: 'accept' | 'reject') => {
    setAction(type);
    setShowConfirmation(true);
  };

  const confirmAction = async () => {
    if (!transaction || !action) return;

    try {
      setLoading(true);
      const response = await api.post(
        `/admin/chargeback/${transaction.id}/${action}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        window.showToast('success', `Chargeback ${action}ed successfully`);
        // Refresh the transaction data
        handleSearch();
      } else {
        window.showToast('error', response.data.message || `Failed to ${action} chargeback`);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        window.showToast('error', err.response?.data?.message || `Failed to ${action} chargeback`);
      }
    } finally {
      setLoading(false);
      setShowConfirmation(false);
      setAction(null);
    }
  };

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Chargeback">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search Section */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Search Transaction</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="utr" className="block text-sm font-medium text-gray-700">
                UTR Number
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="utr"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter UTR number"
                />
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
                }`}
            >
              {loading ? 'Searching...' : 'Search Transaction'}
            </button>

            {error && (
              <div className="flex items-center p-4 bg-error-50 rounded-md text-error-700">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Transaction Details */}
        {transaction && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Transaction Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Mobile</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.mobile}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Amount</label>
                <p className="mt-1 text-sm text-gray-900 font-medium">
                  {formatCurrency(transaction.amount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Admin Charges</label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatCurrency(transaction.admin_charges || 0)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Reference ID</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.reference_id}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Transaction Type</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.transaction_type}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${transaction.status === 'completed'
                    ? 'bg-success-100 text-success-800'
                    : transaction.status === 'chargeback_approved'
                      ? 'bg-success-100 text-success-800'
                      : transaction.status === 'chargeback_rejected'
                        ? 'bg-error-100 text-error-800'
                        : 'bg-warning-100 text-warning-800'
                    }`}>
                    {transaction.status.split('_').map(word =>
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                </p>
              </div>
            </div>

            {transaction.status !== 'chargeback_approved' && transaction.status !== 'chargeback_rejected' && (
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => handleAction('reject')}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-error-600 hover:bg-error-700 disabled:bg-error-400"
                >
                  Reject Chargeback
                </button>
                <button
                  onClick={() => handleAction('accept')}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-success-600 hover:bg-success-700 disabled:bg-success-400"
                >
                  Accept Chargeback
                </button>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm Chargeback {action === 'accept' ? 'Acceptance' : 'Rejection'}
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to {action === 'accept' ? 'accept' : 'reject'} this chargeback request?
                This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  disabled={loading}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${action === 'accept'
                    ? 'bg-success-600 hover:bg-success-700 disabled:bg-success-400'
                    : 'bg-error-600 hover:bg-error-700 disabled:bg-error-400'
                    }`}
                >
                  {loading ? 'Processing...' : `Confirm ${action === 'accept' ? 'Acceptance' : 'Rejection'}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}