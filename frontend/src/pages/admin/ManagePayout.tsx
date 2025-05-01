import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate } from '../../utils/formatUtils';

// Mock data for payout requests
const mockPayoutRequests = [
  {
    id: 1,
    orderId: 'PO-2025-001',
    date: '2025-01-15T10:30:00',
    user: 'John Smith',
    description: 'Monthly payout request',
    amount: 5000.00,
    walletBalance: 7500.00,
    status: 'pending',
  },
  {
    id: 2,
    orderId: 'PO-2025-002',
    date: '2025-01-16T14:45:00',
    user: 'Sarah Wilson',
    description: 'Weekly settlement',
    amount: 2500.00,
    walletBalance: 4000.00,
    status: 'approved',
  },
  {
    id: 3,
    orderId: 'PO-2025-003',
    date: '2025-01-17T09:15:00',
    user: 'Michael Brown',
    description: 'Urgent withdrawal',
    amount: 1000.00,
    walletBalance: 1500.00,
    status: 'rejected',
  },
];

interface PayoutRequest {
  id: number;
  orderId: string;
  date: string;
  user: string;
  description: string;
  amount: number;
  walletBalance: number;
  status: 'pending' | 'approved' | 'rejected';
}

export default function ManagePayout() {
  const navigate = useNavigate();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [newStatus, setNewStatus] = useState<'approved' | 'rejected'>('approved');

  const handleStatusUpdate = () => {
    // In a real app, this would make an API call
    console.log('Updating status:', {
      payoutId: selectedPayout?.id,
      newStatus,
    });
    
    setShowStatusModal(false);
    setSelectedPayout(null);
    setNewStatus('approved');
  };

  const columns = [
    {
      header: 'SI.NO',
      accessor: 'id',
      cell: (value: number) => (
        <span className="text-sm text-gray-600">{value}</span>
      ),
    },
    {
      header: 'OrderId',
      accessor: 'orderId',
      cell: (value: string) => (
        <span className="font-medium text-primary-600">{value}</span>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
      cell: (value: string) => formatDate(value),
    },
    {
      header: 'User',
      accessor: 'user',
    },
    {
      header: 'Description',
      accessor: 'description',
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Wallet Balance',
      accessor: 'walletBalance',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: string, row: PayoutRequest) => (
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value === 'approved' ? 'bg-success-100 text-success-800' :
            value === 'rejected' ? 'bg-error-100 text-error-800' :
            'bg-warning-100 text-warning-800'
          }`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
          {value === 'pending' && (
            <button
              onClick={() => {
                setSelectedPayout(row);
                setShowStatusModal(true);
              }}
              className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded"
            >
              Update Status
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Manage Payout">
      <div className="space-y-6">
        {/* Payout Requests Table */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Payout Requests</h2>
            
            <Table
              columns={columns}
              data={mockPayoutRequests}
              searchable={true}
              pagination={true}
            />
          </div>
        </div>

        {/* Status Update Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update Status
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payout Request
                  </label>
                  <div className="text-sm text-gray-900">
                    <p><span className="font-medium">Order ID:</span> {selectedPayout?.orderId}</p>
                    <p><span className="font-medium">Amount:</span> {formatCurrency(selectedPayout?.amount || 0)}</p>
                    <p><span className="font-medium">User:</span> {selectedPayout?.user}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as 'approved' | 'rejected')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowStatusModal(false);
                      setSelectedPayout(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleStatusUpdate}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}