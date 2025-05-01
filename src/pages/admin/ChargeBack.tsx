import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate } from '../../utils/formatUtils';

// Mock transaction data
const mockTransaction = {
  id: 'txn001',
  utr: 'UTR123456789',
  amount: 1000.00,
  date: '2025-01-15T10:30:00',
  user: 'John Smith',
  status: 'completed',
  description: 'Payment for order #12345',
};

export default function ChargeBack() {
  const [utr, setUtr] = useState('');
  const [transaction, setTransaction] = useState<typeof mockTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleSearch = async () => {
    if (!utr.trim()) {
      setError('Please enter a UTR number');
      return;
    }

    setLoading(true);
    setError('');
    setTransaction(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response
      if (utr === mockTransaction.utr) {
        setTransaction(mockTransaction);
      } else {
        setError('No transaction found with this UTR number');
      }
    } catch (err) {
      setError('Failed to fetch transaction details');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (type: 'approve' | 'reject') => {
    setAction(type);
    setShowConfirmation(true);
  };

  const confirmAction = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      window.showToast('success', `Chargeback ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      
      // Reset form
      setUtr('');
      setTransaction(null);
      setShowConfirmation(false);
      setAction(null);
    } catch (error) {
      window.showToast('error', 'Failed to process chargeback');
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
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter UTR number"
                />
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading
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
                <label className="block text-sm font-medium text-gray-500">Transaction ID</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.id}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">UTR Number</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.utr}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Amount</label>
                <p className="mt-1 text-sm text-gray-900 font-medium">
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Date</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(transaction.date)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">User</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.user}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.status === 'completed'
                      ? 'bg-success-100 text-success-800'
                      : 'bg-warning-100 text-warning-800'
                  }`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                </p>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.description}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => handleAction('reject')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-error-600 hover:bg-error-700"
              >
                Reject Chargeback
              </button>
              <button
                onClick={() => handleAction('approve')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-success-600 hover:bg-success-700"
              >
                Approve Chargeback
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm Chargeback {action === 'approve' ? 'Approval' : 'Rejection'}
              </h3>
              
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to {action === 'approve' ? 'approve' : 'reject'} this chargeback request?
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
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    action === 'approve'
                      ? 'bg-success-600 hover:bg-success-700'
                      : 'bg-error-600 hover:bg-error-700'
                  }`}
                >
                  Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}