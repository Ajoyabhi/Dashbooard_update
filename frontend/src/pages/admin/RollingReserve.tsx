import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Unlock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatUtils';

interface ReserveTransaction {
  action: 'hold' | 'release';
  amount: number;
  remark: string;
}

export default function RollingReserve() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [reserveBalance, setReserveBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const [transaction, setTransaction] = useState<ReserveTransaction>({
    action: 'hold',
    amount: 0,
    remark: ''
  });

  useEffect(() => {
    fetchBalances();
  }, [userId]);

  const fetchBalances = async () => {
    try {
      const response = await api.get(`/admin/users/${userId}/rolling-reserve`);
      const data = response.data?.data || {};
      setWalletBalance(data.wallet_balance || 0);
      setReserveBalance(data.rolling_reserve_balance || 0);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error fetching balances');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sourceBalance = transaction.action === 'hold' ? walletBalance : reserveBalance;
    if (transaction.amount > sourceBalance) {
      toast.error(transaction.action === 'hold'
        ? 'Insufficient wallet balance'
        : 'Insufficient rolling reserve balance');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/admin/users/${userId}/rolling-reserve`, {
        amount: transaction.amount,
        action: transaction.action,
        remark: transaction.remark
      });

      toast.success(transaction.action === 'hold'
        ? 'Amount moved to rolling reserve'
        : 'Amount released to wallet');
      setTransaction({ action: transaction.action, amount: 0, remark: '' });
      await fetchBalances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error processing transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Rolling Reserve">
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
            <h1 className="text-2xl font-bold text-gray-900">Rolling Reserve</h1>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="text-sm text-gray-500">Wallet Balance</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {formatCurrency(walletBalance)}
            </div>
          </div>
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="text-sm text-gray-500">Rolling Reserve</div>
            <div className="text-3xl font-bold text-amber-600 mt-1">
              {formatCurrency(reserveBalance)}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Action
                </label>
                <select
                  value={transaction.action}
                  onChange={(e) => setTransaction({
                    ...transaction,
                    action: e.target.value as 'hold' | 'release'
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="hold">Hold (Wallet → Rolling Reserve)</option>
                  <option value="release">Release (Rolling Reserve → Wallet)</option>
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

              {transaction.amount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-800">
                  <p>
                    Wallet after: <strong>{formatCurrency(transaction.action === 'hold'
                      ? walletBalance - transaction.amount
                      : walletBalance + transaction.amount)}</strong>
                  </p>
                  <p>
                    Rolling Reserve after: <strong>{formatCurrency(transaction.action === 'hold'
                      ? reserveBalance + transaction.amount
                      : reserveBalance - transaction.amount)}</strong>
                  </p>
                </div>
              )}
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
              {transaction.action === 'hold'
                ? <Lock className="h-4 w-4 mr-2" />
                : <Unlock className="h-4 w-4 mr-2" />}
              {loading ? 'Processing...' : transaction.action === 'hold' ? 'Hold Amount' : 'Release Amount'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
