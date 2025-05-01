import React, { useState } from 'react';
import { Download, Filter, Search, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatUtils';

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

// Mock settlement history data
const mockSettlementHistory = [
  {
    id: 1,
    openingSettlement: 5000.00,
    requestedAmount: 1000.00,
    closingSettlement: 4000.00,
    requestedDate: '2025-01-15T10:30:00',
  },
  {
    id: 2,
    openingSettlement: 4000.00,
    requestedAmount: 1500.00,
    closingSettlement: 2500.00,
    requestedDate: '2025-01-16T14:45:00',
  },
];

interface EditPayoutModalProps {
  currentBalance: number;
  onClose: () => void;
  onSubmit: (amount: number, remarks: string) => void;
}

const EditPayoutModal: React.FC<EditPayoutModalProps> = ({ currentBalance, onClose, onSubmit }) => {
  const [newAmount, setNewAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(parseFloat(newAmount), remarks);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Payout Balance</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Payout Balance</label>
            <p className="mt-1 text-lg font-medium text-gray-900">{formatCurrency(currentBalance)}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">New Payout Amount</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Remarks (Optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Add any notes here..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ViewSettlementModalProps {
  settlement: any;
  onClose: () => void;
  onEditPayout: () => void;
}

const ViewSettlementModal: React.FC<ViewSettlementModalProps> = ({ settlement, onClose, onEditPayout }) => {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Settlement History</h3>
          <button
            onClick={onEditPayout}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Edit Payout Balance
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sr No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opening Settlement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closing Settlement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockSettlementHistory.map((history) => (
                <tr key={history.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {history.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(history.openingSettlement)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(history.requestedAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(history.closingSettlement)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(history.requestedDate).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Settlement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);

  const handleEditPayout = (settlement: any) => {
    setSelectedSettlement(settlement);
    setShowEditModal(true);
  };

  const handleViewSettlement = (settlement: any) => {
    setSelectedSettlement(settlement);
    setShowViewModal(true);
  };

  const handlePayoutSubmit = async (amount: number, remarks: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      window.showToast('success', 'Payout balance updated successfully');
      
      setShowEditModal(false);
      setSelectedSettlement(null);
    } catch (error) {
      window.showToast('error', 'Failed to update payout balance');
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
      accessor: 'id',
      cell: (value: number, row: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditPayout(row)}
            className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded"
          >
            Edit Payout Balance
          </button>
          <button
            onClick={() => handleViewSettlement(row)}
            className="text-xs bg-secondary-600 hover:bg-secondary-700 text-white px-2 py-1 rounded"
          >
            View Settlement
          </button>
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

            {/* Table */}
            <Table
              columns={columns}
              data={mockSettlements}
              pagination={true}
            />
          </div>
        </div>

        {/* Edit Payout Modal */}
        {showEditModal && selectedSettlement && (
          <EditPayoutModal
            currentBalance={selectedSettlement.payoutBalance}
            onClose={() => {
              setShowEditModal(false);
              setSelectedSettlement(null);
            }}
            onSubmit={handlePayoutSubmit}
          />
        )}

        {/* View Settlement Modal */}
        {showViewModal && selectedSettlement && (
          <ViewSettlementModal
            settlement={selectedSettlement}
            onClose={() => {
              setShowViewModal(false);
              setSelectedSettlement(null);
            }}
            onEditPayout={() => {
              setShowViewModal(false);
              setShowEditModal(true);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}