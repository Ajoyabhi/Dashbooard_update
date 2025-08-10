import React, { useState, useEffect } from 'react';
import { Search, Calendar, Download, Filter, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { userMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';
import api from '../../utils/axios';

interface PayoutFailedRecord {
  id: number;
  reference_id: string;
  transaction_id: string;
  transaction_type: string;
  amount: number;
  charges: number;
  total_amount: number;
  wallet_balance_before: number;
  wallet_balance_after: number;
  beneficiary_name: string;
  beneficiary_account: string;
  beneficiary_ifsc: string;
  bank_name: string;
  utr_number: string;
  remark: string;
  original_status: string;
  new_status: string;
  failed_by: string;
  created_at: string;
  updated_at: string;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface FilterOption {
  label: string;
  value: string;
}

export default function PayoutFailedHistory() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [failedHistory, setFailedHistory] = useState<PayoutFailedRecord[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const statusOptions: FilterOption[] = [
    { label: 'All Status', value: 'all' },
    { label: 'Failed', value: 'failed' },
    { label: 'Pending', value: 'pending' },
  ];

  // Fetch failed history with pagination and filters
  const fetchFailedHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        status: selectedStatus,
        search: searchTerm,
      });

      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString().split('T')[0]);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString().split('T')[0]);
      }

      const response = await api.get(`/user/payout_failed_history?${params}`);
      console.log("response", response);
      if (response.data.success) {
        setFailedHistory(response.data.data.failedHistory);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching payout failed history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailedHistory();
  }, [currentPage, pageSize, selectedStatus, searchTerm, dateRange]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setDateRange({ startDate: null, endDate: null });
    setCurrentPage(1);
  };

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams({
        status: selectedStatus,
        search: searchTerm,
      });

      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString().split('T')[0]);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString().split('T')[0]);
      }

      // Use fetch with proper authentication headers
      const token = localStorage.getItem('token');
      const response = await fetch(`${api.defaults.baseURL}/user/payout_failed_history/download?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payout_failed_history_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);

      // Show success message
      if (window.showToast) {
        window.showToast('success', 'Report downloaded successfully');
      } else {
        alert('Report downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      if (window.showToast) {
        window.showToast('error', 'Failed to download report');
      } else {
        alert('Failed to download report');
      }
    }
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'created_at',
      cell: (value: string) => formatDate(value),
    },
    {
      header: 'Reference ID',
      accessor: 'reference_id',
      cell: (value: string) => (
        <span className="text-blue-600 font-medium">{value}</span>
      ),
    },
    {
      header: 'Beneficiary',
      accessor: 'beneficiary_name',
    },
    {
      header: 'Account',
      accessor: 'beneficiary_account',
      cell: (value: string) => value ? `****${value.slice(-4)}` : '-',
    },
    {
      header: 'Bank',
      accessor: 'bank_name',
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => formatCurrency(value),
    },
    {
      header: 'Charges',
      accessor: 'charges',
      cell: (value: number) => formatCurrency(value),
    },
    {
      header: 'Total Amount',
      accessor: 'total_amount',
      cell: (value: number) => formatCurrency(value),
    },
    {
      header: 'Wallet Balance Before',
      accessor: 'wallet_balance_before',
      cell: (value: number) => formatCurrency(value),
    },
    {
      header: 'Wallet Balance After',
      accessor: 'wallet_balance_after',
      cell: (value: number) => (
        <span className="text-green-600 font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'new_status',
      cell: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      header: 'Failed By',
      accessor: 'failed_by',
    }
  ];

  return (
    <DashboardLayout menuItems={userMenuItems} title="Payout Failed History">
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by reference ID, transaction ID, beneficiary..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateRange(prev => ({
                      ...prev,
                      startDate: e.target.value ? new Date(e.target.value) : null
                    }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateRange(prev => ({
                      ...prev,
                      endDate: e.target.value ? new Date(e.target.value) : null
                    }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>

                {/* Reset Filters */}
                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <Table
              data={failedHistory}
              columns={columns}
              loading={loading}
              pagination={true}
              searchable={false}
              filterable={false}
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
