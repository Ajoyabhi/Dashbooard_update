import React, { useState } from 'react';
import { Download, Filter, Search, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatUtils';

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
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const handleAction = (request: any, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      window.showToast(
        'success',
        `Fund request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`
      );
      
      setShowActionModal(false);
      setSelectedRequest(null);
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
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value === 'approved' ? 'bg-success-100 text-success-800' :
            value === 'rejected' ? 'bg-error-100 text-error-800' :
            'bg-warning-100 text-warning-800'
          }`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
          {value === 'pending' && (
            <div className="flex space-x-1">
              <button
                onClick={() => handleAction(row, 'approve')}
                className="text-xs bg-success-600 hover:bg-success-700 text-white px-2 py-1 rounded"
              >
                Approve
              </button>
              <button
                onClick={() => handleAction(row, 'reject')}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-medium text-gray-900">Fund Requests</h2>
              
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
                  <h3 className="text-sm font-medium text-gray-700">Filter Requests</h3>
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
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
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
                  placeholder="Search by name, reference ID, or bank..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Table */}
            <Table
              columns={columns}
              data={mockFundRequests}
              pagination={true}
            />
          </div>
        </div>

        {/* Action Modal */}
        {showActionModal && selectedRequest && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
              </h3>
              
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  <p>Are you sure you want to {actionType} this fund request?</p>
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
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      actionType === 'approve'
                        ? 'bg-success-600 hover:bg-success-700'
                        : 'bg-error-600 hover:bg-error-700'
                    }`}
                  >
                    Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
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