import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Settings, RefreshCw, Wallet, Filter, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatUtils';

// Mock data for the user list
const mockUsers = [
  {
    id: 1,
    name: 'John Doe',
    userType: 'User',
    username: 'johndoe',
    walletBalance: 5000.00,
    mobile: '+1234567890',
    payin: true,
    payout: true,
    status: 'active'
  },
  {
    id: 2,
    name: 'Jane Smith',
    userType: 'Agent',
    username: 'janesmith',
    walletBalance: 7500.00,
    mobile: '+0987654321',
    payin: true,
    payout: false,
    status: 'inactive'
  },
];

interface FilterValues {
  name: string;
  status: string;
  balanceRange: number[];
}

const MAX_BALANCE = 10000; // Maximum balance for the range slider

export default function ManageUser() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({
    name: '',
    status: 'all',
    balanceRange: [0, MAX_BALANCE],
  });

  const resetFilters = () => {
    setFilterValues({
      name: '',
      status: 'all',
      balanceRange: [0, MAX_BALANCE],
    });
  };

  // Filter users based on criteria
  const filteredUsers = mockUsers.filter(user => {
    const matchesName = user.name.toLowerCase().includes(filterValues.name.toLowerCase());
    const matchesStatus = filterValues.status === 'all' || user.status === filterValues.status;
    const matchesBalance = user.walletBalance >= filterValues.balanceRange[0] && 
                          user.walletBalance <= filterValues.balanceRange[1];

    return matchesName && matchesStatus && matchesBalance;
  });

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
      header: 'User Type',
      accessor: 'userType',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'Admin' ? 'bg-primary-100 text-primary-800' :
          value === 'Agent' ? 'bg-secondary-100 text-secondary-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      header: 'Username',
      accessor: 'username',
    },
    {
      header: 'Wallet Balance',
      accessor: 'walletBalance',
      cell: (value: number) => (
        <span className="font-medium text-gray-900">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Mobile',
      accessor: 'mobile',
    },
    {
      header: 'Payin',
      accessor: 'payin',
      cell: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
        }`}>
          {value ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      header: 'Payout',
      accessor: 'payout',
      cell: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
        }`}>
          {value ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'active' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'id',
      cell: (value: number) => (
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/user`)}
            className="text-primary-600 hover:text-primary-800"
            title="View User"
          >
            <Eye className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate(`/admin/manage-user/${value}/edit`)}
            className="text-secondary-600 hover:text-secondary-800"
            title="Edit User"
          >
            <Edit className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate(`/admin/manage-user/${value}/charges`)}
            className="text-accent-600 hover:text-accent-800"
            title="User Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate(`/admin/manage-user/${value}/callbacks`)}
            className="text-warning-600 hover:text-warning-800"
            title="Manage Callbacks"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate(`/admin/manage-user/${value}/add-fund`)}
            className="text-success-600 hover:text-success-800"
            title="Add Fund"
          >
            <Wallet className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Manage Users">
      <div className="space-y-6">
        {/* Header with Add User button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <Link
            to="/admin/manage-user/add"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add User
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            {showFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Reset Filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="space-y-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={filterValues.name}
                    onChange={(e) => setFilterValues({ ...filterValues, name: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Search by name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filterValues.status}
                    onChange={(e) => setFilterValues({ ...filterValues, status: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Balance Range ({formatCurrency(filterValues.balanceRange[0])} - {formatCurrency(filterValues.balanceRange[1])})
                </label>
                <input
                  type="range"
                  min={0}
                  max={MAX_BALANCE}
                  step={100}
                  value={filterValues.balanceRange[1]}
                  onChange={(e) => setFilterValues({
                    ...filterValues,
                    balanceRange: [filterValues.balanceRange[0], parseInt(e.target.value)]
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="range"
                  min={0}
                  max={MAX_BALANCE}
                  step={100}
                  value={filterValues.balanceRange[0]}
                  onChange={(e) => setFilterValues({
                    ...filterValues,
                    balanceRange: [parseInt(e.target.value), filterValues.balanceRange[1]]
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer -mt-2"
                />
              </div>
            </div>
          )}

          {/* User Table */}
          <Table
            columns={columns}
            data={filteredUsers}
            title="User List"
            description="Manage all registered users and their settings"
            searchable={true}
            filterable={false}
            pagination={true}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}