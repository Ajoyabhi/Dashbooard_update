import React, { useState, useEffect } from 'react';
import { Download, Filter, Search, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatUtils';
import api from '../../utils/axios';

// Mock data for fund requests
const mockFundRequests = [
  {
    id: 1,
    name: 'John Smith',
    amount: 5000.00,
    wallet: 7500.00,
    referenceId: 'REF123456',
    fromBank: 'HDFC Bank',
    toBank: 'ICICI Bank',
    paymentType: 'NEFT',
    remarks: 'Monthly deposit',
    reason: 'Business expenses',
    status: 'pending',
  },
  {
    id: 2,
    name: 'Sarah Wilson',
    amount: 2500.00,
    wallet: 4000.00,
    referenceId: 'REF789012',
    fromBank: 'SBI Bank',
    toBank: 'Axis Bank',
    paymentType: 'RTGS',
    remarks: 'Weekly settlement',
    reason: 'Vendor payment',
    status: 'approved',
  },
];

export default function ManageFundRequest() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved');
  const [fundRequests, setFundRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFundRequests();
  }, []);

  const fetchFundRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/manage-fund-request');
      const data = await response.data;
      setFundRequests(data.data?.fundRequests || []);
    } catch (error) {
      console.error('Error fetching fund requests:', error);
      setFundRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (request: any, type: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setActionType(type);
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    try {
      // Simulate API call
      const response = await api.post(`/admin/manage-fund-request/${selectedRequest.id}`, {
        status: actionType
      });
      const data = await response.data;
      if (data.success) {
        window.showToast(
          'success',
          `Fund request ${actionType === 'approved' ? 'approved' : 'rejected'} successfully`
        );
        setShowActionModal(false);
        setSelectedRequest(null);
        fetchFundRequests();
      } else {
        window.showToast('error', data.message);
      }

    } catch (error) {
      window.showToast('error', 'Failed to process request');
    }
  };

  const columns = [
    {
      header: '#',
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
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Wallet',
      accessor: 'wallet',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Reference ID',
      accessor: 'referenceId',
      cell: (value: string) => (
        <span className="font-medium text-primary-600">{value}</span>
      ),
    },
    {
      header: 'From Bank',
      accessor: 'fromBank',
    },
    {
      header: 'To Bank',
      accessor: 'toBank',
    },
    {
      header: 'Payment Type',
      accessor: 'paymentType',
      cell: (value: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {value}
        </span>
      ),
    },
    {
      header: 'Remarks',
      accessor: 'remarks',
    },
    {
      header: 'Reason',
      accessor: 'reason',
    },
    {
      header: 'Action',
      accessor: 'status',
      cell: (value: string, row: any) => (
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'approved' ? 'bg-success-100 text-success-800' :
            value === 'rejected' ? 'bg-error-100 text-error-800' :
              'bg-warning-100 text-warning-800'
            }`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
          {value === 'pending' && (
            <div className="flex space-x-1">
              <button
                onClick={() => handleAction(row, 'approved')}
                className="text-xs bg-success-600 hover:bg-success-700 text-white px-2 py-1 rounded"
              >
                Approve
              </button>
              <button
                onClick={() => handleAction(row, 'rejected')}
                className="text-xs bg-error-600 hover:bg-error-700 text-white px-2 py-1 rounded"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Manage Fund Requests">
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            {/* Table */}
            <Table
              searchable={false}
              filterable={false}
              columns={columns}
              data={fundRequests || []}
              pagination={true}
              loading={isLoading}
            />
          </div>
        </div>

        {/* Action Modal */}
        {showActionModal && selectedRequest && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}
              </h3>

              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  <p>Are you sure you want to {actionType === 'approved' ? 'approve' : 'reject'} this fund request?</p>
                  <div className="mt-2">
                    <p><span className="font-medium">Name:</span> {selectedRequest.name}</p>
                    <p><span className="font-medium">Amount:</span> {formatCurrency(selectedRequest.amount)}</p>
                    <p><span className="font-medium">Reference ID:</span> {selectedRequest.referenceId}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowActionModal(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAction}
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${actionType === 'approved'
                      ? 'bg-success-600 hover:bg-success-700'
                      : 'bg-error-600 hover:bg-error-700'
                      }`}
                  >
                    Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}
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