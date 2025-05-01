import React, { useState } from 'react';
import { Download, Filter, Search, X, History } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatUtils';
import SettlementHistoryModal from '../admin/settlementHistoryModal';

// Mock data for settlements
const mockSettlements = [
  {
    id: 1,
    name: 'John Smith',
    username: 'johnsmith',
    mobile: '+1234567890',
    walletBalance: 7500.00,
    payoutBalance: 5000.00,
    status: 'pending',
  },
  {
    id: 2,
    name: 'Sarah Wilson',
    username: 'sarahw',
    mobile: '+0987654321',
    walletBalance: 4000.00,
    payoutBalance: 2500.00,
    status: 'completed',
  },
];

export default function Settlement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);

  const handleSettlement = (settlement: any) => {
    setSelectedSettlement(settlement);
    setShowSettlementModal(true);
  };

  const handleViewHistory = (settlement: any) => {
    setSelectedSettlement(settlement);
    setShowHistoryModal(true);
  };

  const processSettlement = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Show success message
      window.showToast('success', 'Settlement processed successfully');

      setShowSettlementModal(false);
      setSelectedSettlement(null);
    } catch (error) {
      window.showToast('error', 'Failed to process settlement');
    }
  };

  const columns = [
    {
      header: 'Sr No.',
      accessor: 'id',
      cell: (value: number) => (
        <span className="text-sm text-gray-600">{value}</span>
      ),
    },
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'Username',
      accessor: 'username',
    },
    {
      header: 'Mobile',
      accessor: 'mobile',
    },
    {
      header: 'Wallet Balance',
      accessor: 'walletBalance',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Payout Balance',
      accessor: 'payoutBalance',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Settlement',
      accessor: 'status',
      cell: (value: string, row: any) => (
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

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Settlement">
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-medium text-gray-900">Settlement Records</h2>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                </button>

                <button
                  onClick={() => {
                    // Handle download
                    console.log('Downloading report...');
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Report
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-700">Filter Records</h3>
                  <button
                    onClick={() => {
                      setSelectedStatus('all');
                    }}
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reset Filters
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, username, or mobile..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Table */}
            <Table
              columns={columns}
              data={mockSettlements}
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
                  <p>Are you sure you want to process this settlement?</p>
                  <div className="mt-2">
                    <p><span className="font-medium">Name:</span> {selectedSettlement.name}</p>
                    <p><span className="font-medium">Username:</span> {selectedSettlement.username}</p>
                    <p><span className="font-medium">Payout Balance:</span> {formatCurrency(selectedSettlement.payoutBalance)}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowSettlementModal(false);
                      setSelectedSettlement(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processSettlement}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Process Settlement
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
            userId={selectedSettlement.id}
            userName={selectedSettlement.name}
          />
        )}
      </div>
    </DashboardLayout>
  );
}