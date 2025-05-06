import { useState, useEffect } from 'react';
import { Search, Plus, Building2, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { userMenuItems } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatUtils';
import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock bank details
const bankDetails = {
  bankName: 'HDFC Bank',
  accountName: 'PayGate Solutions',
  accountNumber: '50100123456789',
  ifscCode: 'HDFC0001234',
  branchName: 'Main Branch',
  swiftCode: 'HDFCINBB',
};

interface FundRequest {
  id: number;
  amount: number;
  referenceId: string;
  fromBank: string;
  toBank: string;
  paymentType: string;
  remarks: string;
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export default function FundRequest() {
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showAddRequest, setShowAddRequest] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10
  });
  
  const [newRequest, setNewRequest] = useState({
    settlement_wallet: '',
    reference_id: '',
    from_bank: '',
    to_bank: '',
    payment_type: 'NEFT',
    remarks: '',
    reason: ''
  });

  // Fetch fund requests
  const fetchFundRequests = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/user/fund-requests?page=${page}&pageSize=${pagination.pageSize}`);
      if (response.data.success) {
        setFundRequests(response.data.data.fundRequests);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.message || 'Failed to fetch fund requests';
      window.showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundRequests();
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!newRequest.reference_id || !newRequest.from_bank || !newRequest.to_bank || !newRequest.reason) {
        window.showToast('error', 'Please fill in all required fields');
        return;
      }

      const response = await api.post('/user/fund-request', newRequest);
      
      if (response.data.success) {
        window.showToast('success', 'Fund request submitted successfully');
        
        // Reset form and close modal
        setNewRequest({
          settlement_wallet: '',
          reference_id: '',
          from_bank: '',
          to_bank: '',
          payment_type: 'NEFT',
          remarks: '',
          reason: ''
        });
        setShowAddRequest(false);
        
        // Refresh the fund requests list
        fetchFundRequests();
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.message || 'Failed to submit request';
      window.showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'SI. NO',
      accessor: 'id',
      cell: (value: number) => (
        <span className="text-sm text-gray-600">{value}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
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
      header: 'Status',
      accessor: 'status',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'approved' ? 'bg-success-100 text-success-800' :
          value === 'rejected' ? 'bg-error-100 text-error-800' :
          'bg-warning-100 text-warning-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      header: 'Created At',
      accessor: 'createdAt',
      cell: (value: string) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleString()}
        </span>
      ),
    }
  ];

  return (
    <DashboardLayout menuItems={userMenuItems} title="Fund Request">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowBankDetails(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Building2 className="h-5 w-5 mr-2" />
            Show Bank Details
          </button>
          
          <button
            onClick={() => setShowAddRequest(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Pay Request
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search requests..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <Table
              columns={columns}
              data={fundRequests}
              pagination={true}
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={fetchFundRequests}
              loading={loading}
            />
          </div>
        </div>

        {/* Bank Details Modal */}
        {showBankDetails && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Bank Details</h3>
                <button
                  onClick={() => setShowBankDetails(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Bank Name</label>
                  <p className="mt-1 text-sm text-gray-900">{bankDetails.bankName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Account Name</label>
                  <p className="mt-1 text-sm text-gray-900">{bankDetails.accountName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Account Number</label>
                  <p className="mt-1 text-sm text-gray-900">{bankDetails.accountNumber}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">IFSC Code</label>
                  <p className="mt-1 text-sm text-gray-900">{bankDetails.ifscCode}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Branch Name</label>
                  <p className="mt-1 text-sm text-gray-900">{bankDetails.branchName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">SWIFT Code</label>
                  <p className="mt-1 text-sm text-gray-900">{bankDetails.swiftCode}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => setShowBankDetails(false)}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Request Modal */}
        {showAddRequest && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Pay Request</h3>
                <button
                  onClick={() => setShowAddRequest(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Settlement Wallet</label>
                  <input
                    type="number"
                    value={newRequest.settlement_wallet}
                    onChange={(e) => setNewRequest({ ...newRequest, settlement_wallet: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference ID</label>
                  <input
                    type="text"
                    value={newRequest.reference_id}
                    onChange={(e) => setNewRequest({ ...newRequest, reference_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">From Bank</label>
                  <input
                    type="text"
                    value={newRequest.from_bank}
                    onChange={(e) => setNewRequest({ ...newRequest, from_bank: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">To Bank</label>
                  <input
                    type="text"
                    value={newRequest.to_bank}
                    onChange={(e) => setNewRequest({ ...newRequest, to_bank: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Type</label>
                  <select
                    value={newRequest.payment_type}
                    onChange={(e) => setNewRequest({ ...newRequest, payment_type: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  <textarea
                    value={newRequest.remarks}
                    onChange={(e) => setNewRequest({ ...newRequest, remarks: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddRequest(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}