import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatUtils';

interface WalletTransaction {
  id: number;
  transaction_type: 'credit' | 'debit';
  amount: number;
  balance_before: number;
  balance_after: number;
  remark: string;
  created_at: string;
  createdByUser: {
    id: number;
    name: string;
    user_name: string;
  };
}

interface WalletTransactionTableProps {
  userId: string;
}

export default function WalletTransactionTable({ userId }: WalletTransactionTableProps) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionType, setTransactionType] = useState<'all' | 'credit' | 'debit'>('all');

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (transactionType !== 'all') {
        params.type = transactionType;
      }

      const response = await api.get(`/admin/users/${userId}/wallet/transactions`, { params });
      
      setTransactions(response.data.data.transactions);
      setCurrentPage(response.data.data.pagination.current_page);
      setTotalPages(response.data.data.pagination.total_pages);
      setTotalRecords(response.data.data.pagination.total_records);
      setCurrentBalance(response.data.data.current_balance);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error fetching transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchTransactions(page);
    }
  };

  const getTransactionTypeColor = (type: 'credit' | 'debit') => {
    return type === 'credit' ? 'text-green-600' : 'text-red-600';
  };

  const getTransactionTypeIcon = (type: 'credit' | 'debit') => {
    return type === 'credit' ? '↗' : '↘';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white shadow-sm rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
            <p className="text-sm text-gray-500">
              {totalRecords} transactions • Current Balance: {formatCurrency(currentBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance Before
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance After
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remark
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-lg mr-2 ${getTransactionTypeColor(transaction.transaction_type)}`}>
                        {getTransactionTypeIcon(transaction.transaction_type)}
                      </span>
                      <span className={`text-sm font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                        {transaction.transaction_type.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(transaction.balance_before)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(transaction.balance_after)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {transaction.remark}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.createdByUser?.name || 'System'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages} ({totalRecords} total records)
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 