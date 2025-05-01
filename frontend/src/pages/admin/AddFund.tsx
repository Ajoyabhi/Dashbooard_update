import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatUtils';

interface FundTransaction {
  type: 'credit' | 'debit';
  amount: number;
  remark: string;
}

export default function AddFund() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const [transaction, setTransaction] = useState<FundTransaction>({
    type: 'credit',
    amount: 0,
    remark: ''
  });

  useEffect(() => {
    fetchCurrentBalance();
  }, [userId]);

  const fetchCurrentBalance = async () => {
    try {
      const response = await api.get(`/admin/users/${userId}/wallet`);
      setCurrentBalance(response.data.wallet_balance || 0);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error fetching wallet balance');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post(`/admin/users/${userId}/wallet`, {
        amount: transaction.amount,
        type: transaction.type,
        remark: transaction.remark
      });

      toast.success('Transaction completed successfully');
      setCurrentBalance(response.data.new_balance);
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error processing transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Add Fund">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Add Fund</h1>
          </div>
        </div>

        {/* Current Balance Card */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="text-sm text-gray-500">Current Balance</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(currentBalance)}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Transaction Type
                </label>
                <select
                  value={transaction.type}
                  onChange={(e) => setTransaction({
                    ...transaction,
                    type: e.target.value as 'credit' | 'debit'
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    value={transaction.amount}
                    onChange={(e) => setTransaction({
                      ...transaction,
                      amount: parseFloat(e.target.value)
                    })}
                    className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">INR</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Remark
                </label>
                <textarea
                  value={transaction.remark}
                  onChange={(e) => setTransaction({
                    ...transaction,
                    remark: e.target.value
                  })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Add a note about this transaction"
                  required
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}