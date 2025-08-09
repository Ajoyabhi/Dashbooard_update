import React, { useState } from 'react';
import { AlertCircle, CheckCircle, X, Plus, Trash2 } from 'lucide-react';
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

export default function MakePayoutFailed() {
  const [referenceNumbers, setReferenceNumbers] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [error, setError] = useState<string>('');

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
      </div>
    </DashboardLayout>
  );
}
