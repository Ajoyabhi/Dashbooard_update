import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';

interface UserStatus {
    id: number;
    user_id: number;
    status: boolean;
    api_status: boolean;
    bank_deactive: boolean;
    iserveu: boolean;
    payin_status: boolean;
    payout_status: boolean;
    payouts_status: boolean;
    tecnical_issue: boolean;
    vouch: boolean;
    created_at: string;
    updated_at: string;
}

interface UserData {
    id: number;
    name: string;
    user_name: string;
    email: string;
    mobile: string;
    user_type: string;
    company_name: string;
    business_type: string;
    aadhaar_card: string | null;
    address: string | null;
    agent_id: number | null;
    city: string | null;
    gst_no: string | null;
    pancard: string | null;
    pin: string | null;
    pincode: string | null;
    state: string | null;
    created_at: string;
    updated_at: string;
    created_by: number;
    updated_by: number | null;
    remember_token: string | null;
    UserStatus: UserStatus;
}

export default function UserView() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserDetails();
    }, [userId]);

    const fetchUserDetails = async () => {
        try {
            const response = await api.get(`/agent/users/${userId}`);
            setUser(response.data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error fetching user details');
        } finally {
            setLoading(false);
        }
    };

    const formatWalletBalance = (balance: number | null | undefined) => {
        if (balance === null || balance === undefined) return '0.00';
        return balance.toFixed(2);
    };

    const formatStatus = (status: boolean | null | undefined) => {
        if (status === null || status === undefined) return 'Inactive';
        return status ? 'Active' : 'Inactive';
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <DashboardLayout menuItems={adminMenuItems} title="User Details">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    if (!user) {
        return (
            <DashboardLayout menuItems={adminMenuItems} title="User Details">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">User not found</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout menuItems={adminMenuItems} title="User Details">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="mr-4 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
                    </div>
                    <button
                        onClick={() => navigate(`/admin/manage-user/${userId}/edit`)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <Edit className="h-5 w-5 mr-2" />
                        Edit User
                    </button>
                </div>

                {/* User Information */}
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="p-6 space-y-6">
                        {/* Basic Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Name</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.name || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Username</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.user_name || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Email</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.email || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Mobile</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.mobile || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">User Type</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.user_type === 'admin' ? 'bg-primary-100 text-primary-800' :
                                            user.user_type === 'agent' ? 'bg-secondary-100 text-secondary-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {user.user_type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Business Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Business Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Company Name</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.company_name || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Business Type</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.business_type || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">GST Number</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.gst_no || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">PAN Card</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.pancard || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Aadhaar Card</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.aadhaar_card || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Address Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Address Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-500">Address</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.address || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">City</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.city || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">State</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.state || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">PIN Code</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.pincode || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Account Status */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Account Status</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.status ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {formatStatus(user.UserStatus?.status)}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Payin</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.payin_status ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {user.UserStatus?.payin_status ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Payout</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.payout_status ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {user.UserStatus?.payout_status ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Status Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Status</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">API Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.api_status ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {user.UserStatus?.api_status ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Bank Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!user.UserStatus?.bank_deactive ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {!user.UserStatus?.bank_deactive ? 'Active' : 'Deactivated'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Technical Issue</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!user.UserStatus?.tecnical_issue ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {!user.UserStatus?.tecnical_issue ? 'No Issues' : 'Has Issues'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Timestamps */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Timestamps</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Created At</label>
                                    <div className="mt-1 text-sm text-gray-900">{formatDate(user.created_at)}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Updated At</label>
                                    <div className="mt-1 text-sm text-gray-900">{formatDate(user.updated_at)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
} 