import React, { useState, useEffect } from 'react';
import { Download, Filter, Search, X, History } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatUtils';
import SettlementHistoryModal from '../admin/SettlementHistoryModal';
// import axios from 'axios';
import api from '../../utils/axios';

interface SettlementUser {
  id: number;
  name: string;
  user_name: string;
  mobile: string;
  wallet: number;
  settlement: number;
}

export default function Settlement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [users, setUsers] = useState<SettlementUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettlementData();
  }, []);

  const fetchSettlementData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/settlement-dashboard');
      console.log('Settlement API Response:', response.data);

      if (response.data.success) {
        setUsers(response.data.data || []);
      } else {
        setUsers([]);
        setError(response.data.message || 'Failed to fetch settlement data');
      }
    } catch (err: any) {
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      setError(err.response?.data?.message || 'Error fetching settlement data');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSettlement = (row: SettlementUser) => {
    setSelectedSettlement(row);
    setShowSettlementModal(true);
  };

  const handleViewHistory = (row: SettlementUser) => {
    setSelectedSettlement(row);
    setShowHistoryModal(true);
  };

  const processSettlement = async () => {
    if (!settlementAmount || parseFloat(settlementAmount) <= 0) {
      window.showToast('error', 'Please enter a valid settlement amount');
      return;
    }

    if (parseFloat(settlementAmount) > selectedSettlement.wallet) {
      window.showToast('error', 'Settlement amount cannot exceed wallet balance');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await api.post('/admin/settle-amount', {
        user_id: selectedSettlement.id,
        amount_: parseFloat(settlementAmount),
        remark: remark
      });

      if (response.data.success) {
        window.showToast('success', 'Settlement processed successfully');
        setShowSettlementModal(false);
        setSelectedSettlement(null);
        setSettlementAmount('');
        setRemark('');
        fetchSettlementData();
      } else {
        window.showToast('error', response.data.message || 'Failed to process settlement');
      }
    } catch (error: any) {
      console.error('Settlement Error:', error.response?.data || error);
      window.showToast('error', error.response?.data?.message || 'Failed to process settlement');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = [
    {
      header: 'Sr No.',
      accessor: 'id',
    },
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'Username',
      accessor: 'user_name',
    },
    {
      header: 'Mobile',
      accessor: 'mobile',
    },
    {
      header: 'Wallet Balance',
      accessor: 'wallet',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Settlement Balance',
      accessor: 'settlement',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Settlement',
      accessor: 'status',
      cell: (_: any, row: SettlementUser) => (
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <button
              onClick={() => handleSettlement(row)}
              className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded"
            >
              Process
            </button>

            <button
              onClick={() => handleViewHistory(row)}
              className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded flex items-center"
            >
              <History className="h-3 w-3 mr-1" />
              History
            </button>
          </div>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Settlement">
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            {/* Table */}
            <Table
              searchable={false}
              filterable={false}
              columns={columns}
              data={users || []}
              pagination={true}
            />
          </div>
        </div>

        {/* Settlement Modal */}
        {showSettlementModal && selectedSettlement && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Process Settlement
              </h3>

              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  <div className="mb-4">
                    <p><span className="font-medium">Name:</span> {selectedSettlement.name || ''}</p>
                    <p><span className="font-medium">Username:</span> {selectedSettlement.user_name || ''}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="font-medium text-gray-700">Wallet Balance</p>
                      <p className="text-lg text-primary-600">{formatCurrency(selectedSettlement.wallet || 0)}</p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="font-medium text-gray-700">Current Settlement Balance</p>
                      <p className="text-lg text-primary-600">{formatCurrency(selectedSettlement.settlement || 0)}</p>
                    </div>

                    <div>
                      <label htmlFor="settlementAmount" className="block text-sm font-medium text-gray-700 mb-1">
                        Settlement Amount
                      </label>
                      <input
                        type="number"
                        id="settlementAmount"
                        value={settlementAmount}
                        onChange={(e) => setSettlementAmount(e.target.value)}
                        placeholder="Enter amount to settle"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        min="0"
                        max={selectedSettlement.wallet || 0}
                        step="0.01"
                      />
                      <label htmlFor="remark" className="block text-sm font-medium text-gray-700 mb-1">
                        Remark
                      </label>
                      <input
                        type="text"
                        id="remark"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="Enter remark"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Maximum settlement amount: {formatCurrency(selectedSettlement.wallet || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowSettlementModal(false);
                      setSelectedSettlement(null);
                      setSettlementAmount('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processSettlement}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Process Settlement'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settlement History Modal */}
        {showHistoryModal && selectedSettlement && (
          <SettlementHistoryModal
            isOpen={showHistoryModal}
            onClose={() => {
              setShowHistoryModal(false);
              setSelectedSettlement(null);
            }}
            userId={selectedSettlement.id || 0}
            userName={selectedSettlement.name || ''}
          />
        )}
      </div>
    </DashboardLayout>
  );
}