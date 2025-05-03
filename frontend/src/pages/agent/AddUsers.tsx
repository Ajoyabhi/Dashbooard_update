import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { agentMenuItems } from '../../data/mockData';
import Table from '../../components/dashboard/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Eye, RefreshCw } from 'lucide-react';
import api from '../../utils/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface User {
    id: number;
    name: string;
    mobile: string;
    email: string;
    company_name: string;
    user_type: string;
    UserStatus: {
        status: boolean;
    };
    FinancialDetail: {
        wallet: string;
        settlement: string;
        lien: string;
        rolling_reserve: string;
    };
}

const AddUsers: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/agent/users');
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { header: 'S.No', accessor: 'id' },
        {
            header: 'Name', accessor: 'name',
            cell: (value: any, row: User) => (
                <span>{row.name}</span>
            )
        },
        {
            header: 'User Type', accessor: 'user_type',
            cell: (value: any, row: User) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.user_type === 'payin_payout' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{row.user_type}</span>
            )
        },
        {
            header: 'Wallet Bal',
            accessor: 'walletBalance',
            cell: (value: any, row: User) => (
                <span>₹{parseFloat(row.FinancialDetail?.wallet || '0').toFixed(2)}</span>
            )
        },
        { header: 'Mobile', accessor: 'mobile' },
        { header: 'Email', accessor: 'email' },
        { header: 'Company Name', accessor: 'company_name' },
        {
            header: 'Status',
            accessor: 'status',
            cell: (value: any, row: User) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.UserStatus.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {row.UserStatus.status ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            header: 'Action',
            accessor: 'action',
            cell: (value: any, row: User) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate(`/agent/users/${row.id}`)}
                        className="text-primary-600 hover:text-primary-800"
                        title="View User"
                    >
                        <Eye className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => navigate(`/agent/users/${row.id}/charges`)}
                        className="text-accent-600 hover:text-accent-800"
                        title="User Settings"
                    >
                        <Settings className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => navigate(`/agent/users/${row.id}/callbacks`)}
                        className="text-warning-600 hover:text-warning-800"
                        title="Manage Callbacks"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>
                </div>
            )
        },
    ];

    const handleEdit = (user: User) => {
        // Implement edit functionality
        console.log('Edit user:', user);
    };

    const handleDelete = async (user: User) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/agent/users/${user.id}`);
                fetchUsers(); // Refresh the list
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    return (
        <DashboardLayout menuItems={agentMenuItems} title="Add Users">
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold">User Management</h1>
                    <button
                        onClick={() => navigate('/agent/add-users/register')}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
                    >
                        <Plus size={20} />
                        <span>Add User</span>
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow">
                    {loading ? (
                        <div className="p-4 text-center">Loading...</div>
                    ) : (
                        <Table
                            columns={columns}
                            data={users}
                            loading={loading}
                            title="Users List"
                            searchable={true}
                            filterable={true}
                        />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AddUsers; 