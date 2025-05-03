import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { agentMenuItems } from '../../data/mockData';
import api from '../../utils/axios';
import { toast } from 'react-toastify';

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
    company_name: string;
    business_type: string;
    user_type: string;
    pan: string;
    aadhaar: string;
    gst_number: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    created_at: string;
    updated_at: string;
    UserStatus: UserStatus;
    FinancialDetail: {
        wallet: string;
        settlement: string;
        lien: string;
        rolling_reserve: string;
    };
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

    const formatWalletBalance = (balance: string | null | undefined) => {
        if (!balance) return '0.00';
        return parseFloat(balance).toFixed(2);
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
            <DashboardLayout menuItems={agentMenuItems} title="User Details">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    if (!user) {
        return (
            <DashboardLayout menuItems={agentMenuItems} title="User Details">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">User not found</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout menuItems={agentMenuItems} title="User Details">
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
                </div>

                {/* User Information */}
                <div className="bg-white shadow rounded-lg">
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
                                    <div className="mt-1 text-sm text-gray-900">{user.user_type || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Company Name</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.company_name || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Wallet Balance</label>
                                    <div className="mt-1 text-sm text-gray-900">₹{formatWalletBalance(user.FinancialDetail?.wallet)}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Settlement Balance</label>
                                    <div className="mt-1 text-sm text-gray-900">₹{formatWalletBalance(user.FinancialDetail?.settlement)}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Lien Amount</label>
                                    <div className="mt-1 text-sm text-gray-900">₹{formatWalletBalance(user.FinancialDetail?.lien)}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Rolling Reserve</label>
                                    <div className="mt-1 text-sm text-gray-900">₹{formatWalletBalance(user.FinancialDetail?.rolling_reserve)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Status Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Status Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Account Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {formatStatus(user.UserStatus?.status)}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Payin Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.payin_status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {formatStatus(user.UserStatus?.payin_status)}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Payout Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.payout_status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {formatStatus(user.UserStatus?.payout_status)}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">API Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.api_status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {formatStatus(user.UserStatus?.api_status)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">PAN Card</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.pan || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Aadhar Card</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.aadhaar || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">GST Number</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.gst_number || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Business Type</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.business_type || '-'}</div>
                                </div>
                                <div>
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
                                    <label className="block text-sm font-medium text-gray-500">Pincode</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.pincode || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
} 