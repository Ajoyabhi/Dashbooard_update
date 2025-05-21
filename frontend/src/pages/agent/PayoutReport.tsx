import React, { useEffect, useState } from 'react';
import { Filter, Download, Search, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { agentMenuItems } from '../../data/mockData';
import { formatDate, formatCurrency, getStatusColor } from '../../utils/formatUtils';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import { downloadTableAsCSV } from '../../utils/downloadUtils';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface FilterOption {
  label: string;
  value: string;
}

interface PayoutRecord {
  transaction_id: string;
  reference_id: string;
  user: {
    name: string;
    user_id: string;
  };
  amount: number;
  charges: {
    admin_charge: number;
    agent_charge: number;
    total_charges: number;
  };
  beneficiary_details: {
    account_number: string;
    account_ifsc: string;
    bank_name: string;
    beneficiary_name: string;
  };
  status: string;
  createdAt: string;
  remark: string;
}

const PayoutReport = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<PayoutRecord[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10
  });

  const statusOptions: FilterOption[] = [
    { label: 'All Status', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' },
  ];

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.pageSize.toString(),
        status: selectedStatus !== 'all' ? selectedStatus : '',
        search: searchTerm,
      });

      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString());
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString());
      }

      const response = await api.get(`/agent/payout-reports?${params.toString()}`);
      const { transactions, pagination: paginationData } = response.data.data;

      setTransactions(transactions);
      setPagination({
        currentPage: paginationData.currentPage,
        totalPages: paginationData.totalPages,
        totalItems: paginationData.totalItems,
        pageSize: paginationData.pageSize
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedStatus, dateRange, searchTerm, pagination.pageSize]);

  const handlePageChange = (page: number) => {
    fetchTransactions(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize: newPageSize,
      currentPage: 1 // Reset to first page when changing page size
    }));
  };

  const handleDownload = () => {
    // Get current date for filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `agent-payout-report-${date}.xlsx`;

    // Download the current filtered data
    downloadTableAsCSV(transactions, columns, {
      filename,
      includeHeaders: true,
      reportType: 'payout'
    });
  };

  const resetFilters = () => {
    setSelectedStatus('all');
    setDateRange({ startDate: null, endDate: null });
    setSearchTerm('');
  };

  const columns = [
    // {
    //   header: 'Transaction ID',
    //   accessor: 'transaction_id',
    //   cell: (value: string) => (
    //     <span className="font-medium text-primary-600">{value}</span>
    //   ),
    // },
    {
      header: 'Reference ID',
      accessor: 'reference_id',
      cell: (value: string) => (
        <span className="font-medium text-primary-600">{value}</span>
      ),
    },
    {
      header: 'Merchant Name',
      accessor: 'user.name',
    },
    {
      header: 'User',
      accessor: 'beneficiary_details.beneficiary_name',
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => (
        <span className="font-medium text-error-600">
          {formatCurrency(value)}</span>
      ),
    },
    {
      header: 'GST',
      accessor: 'gst_amount',
      cell: (value: number) => (
        <span className="text-gray-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Platform Fee',
      accessor: 'platform_fee',
      cell: (value: number) => (
        <span className="text-gray-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Net Amount',
      accessor: 'amount',
      cell: (value: number, row: PayoutRecord) => (
        <span className="font-medium text-success-600">{formatCurrency(value + row.charges.admin_charge)}</span>
      ),
    },
    {
      header: 'UTR',
      accessor: 'gateway_response.utr',
      cell: (value: string) => (
        <span className="text-gray-600">{value}</span>
      ),
    },
    {
      header: 'Agent Charge',
      accessor: 'charges.agent_charge',
      cell: (value: number) => (
        <span className="text-gray-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Beneficiary',
      accessor: 'beneficiary_details.beneficiary_name',
    },
    {
      header: 'Account No',
      accessor: 'beneficiary_details.account_number',
      cell: (value: string) => (
        <span className="font-mono">{value}</span>
      ),
    },
    {
      header: 'IFSC',
      accessor: 'beneficiary_details.account_ifsc',
      cell: (value: string) => (
        <span className="font-mono">{value}</span>
      ),
    },
    {
      header: 'Bank',
      accessor: 'beneficiary_details.bank_name',
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      cell: (value: string) => formatDate(value),
    },
    {
      header: 'Remark',
      accessor: 'remark',
    },
  ];

  return (
    <DashboardLayout menuItems={agentMenuItems} title="Payout Report">
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-medium text-gray-900">Payout Transactions</h2>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                </button>

                <button
                  onClick={handleDownload}
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
                  <h3 className="text-sm font-medium text-gray-700">Filter Transactions</h3>
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reset Filters
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.startDate?.toISOString().split('T')[0] || ''}
                      onChange={(e) => setDateRange({
                        ...dateRange,
                        startDate: e.target.value ? new Date(e.target.value) : null,
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.endDate?.toISOString().split('T')[0] || ''}
                      onChange={(e) => setDateRange({
                        ...dateRange,
                        endDate: e.target.value ? new Date(e.target.value) : null,
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
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
                  placeholder="Search by Reference ID or UTR..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Table */}
            <Table
              columns={columns}
              data={transactions}
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
};

export default PayoutReport;