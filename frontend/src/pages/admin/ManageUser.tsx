import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Eye, Edit, Settings, RefreshCw, Wallet } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import Table from '../../components/dashboard/Table';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';

export default function ManageUser() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error fetching users');
    } finally {
      setLoading(false);
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
      header: 'User Type',
      accessor: 'userType',
      cell: (value: any) => {
        if (!value) return <span className="text-gray-500">-</span>;
        const formattedValue = String(value).toLowerCase();
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${formattedValue === 'admin' ? 'bg-primary-100 text-primary-800' :
            formattedValue === 'agent' ? 'bg-secondary-100 text-secondary-800' :
              'bg-gray-100 text-gray-800'
            }`}>
            {formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1)}
          </span>
        );
      },
    },
    {
      header: 'Username',
      accessor: 'username',
      cell: (value: any) => value || <span className="text-gray-500">-</span>
    },
    {
      header: 'Wallet Balance',
      accessor: 'walletBalance',
      cell: (value: any) => (
        <span className="font-medium text-gray-900">₹{Number(value || 0).toFixed(2)}</span>
      ),
    },
    {
      header: 'Mobile',
      accessor: 'mobile',
      cell: (value: any) => value || <span className="text-gray-500">-</span>
    },
    {
      header: 'Payin',
      accessor: 'payin',
      cell: (value: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${Boolean(value) ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
          }`}>
          {Boolean(value) ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      header: 'Payout',
      accessor: 'payout',
      cell: (value: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${Boolean(value) ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
          }`}>
          {Boolean(value) ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: any) => {
        if (!value) return <span className="text-gray-500">-</span>;
        const formattedValue = String(value).toLowerCase();
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${formattedValue === 'active' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
            }`}>
            {formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1)}
          </span>
        );
      },
    },
    {
      header: 'Action',
      accessor: 'id',
      cell: (value: number) => (
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/admin/manage-user/${value}`)}
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

        {/* User Table */}
        <Table
          columns={columns}
          data={users}
          title="User List"
          description="Manage all registered users and their settings"
          searchable={true}
          filterable={true}
          pagination={true}
          loading={loading}
        />
      </div>
    </DashboardLayout>
  );
}